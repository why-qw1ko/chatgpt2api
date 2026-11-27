from __future__ import annotations

from anyio import CancelScope
from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from api.image_inputs import parse_image_edit_request, read_image_sources
from api.support import require_identity, resolve_image_base_url
from services.content_filter import check_request, request_shape, request_text
from services.editable_file_task_service import (
    EditableFileTaskCleanupError,
    EditableFileTaskInvalidIdError,
    EditableFileTaskNotFoundError,
    EditableFileTaskNotTerminalError,
    editable_file_task_service,
)
from services.image_quota_service import (
    ImageQuotaExceededError,
    ImageQuotaReservation,
    ImageQuotaUnavailableError,
    image_quota_service,
)
from services.log_service import LoggedCall
from services.protocol import (
    anthropic_v1_messages,
    openai_v1_chat_complete,
    openai_v1_image_edit,
    openai_v1_image_generations,
    openai_v1_models,
    openai_v1_response,
    openai_search,
)
from services.protocol.error_response import openai_error_response
from utils.helper import has_response_image_generation_tool, is_image_chat_request, parse_image_count


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    model: str = "gpt-image-2"
    n: int = Field(default=1, ge=1, le=4)
    size: str | None = None
    quality: str = "auto"
    response_format: str = "b64_json"
    history_disabled: bool = True
    stream: bool | None = None


class ChatCompletionRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    model: str | None = None
    prompt: str | None = None
    n: int | None = None
    stream: bool | None = None
    modalities: list[str] | None = None
    messages: list[dict[str, object]] | None = None


class ResponseCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    model: str | None = None
    input: object | None = None
    tools: list[dict[str, object]] | None = None
    tool_choice: object | None = None
    stream: bool | None = None


class AnthropicMessageRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    model: str | None = None
    messages: list[dict[str, object]] | None = None
    system: object | None = None
    stream: bool | None = None


class SearchRequest(BaseModel):
    prompt: str = Field(..., min_length=1)


class EditableFileTaskRequest(BaseModel):
    prompt: str = ""
    kind: str = "ppt"
    base64_images: list[str] = Field(default_factory=list)
    client_task_id: str | None = None


TRACE_REQUEST_HEADERS = {
    "x-request-id": "x_request_id",
    "x-newapi-request-id": "x_newapi_request_id",
    "x-oneapi-request-id": "x_oneapi_request_id",
    "x-channel-id": "x_channel_id",
    "x-channel-name": "x_channel_name",
}


def attach_trace_headers(call: LoggedCall, request: Request) -> None:
    if not call._trace_image_perf():
        return
    headers: dict[str, str] = {}
    for header, field in TRACE_REQUEST_HEADERS.items():
        value = str(request.headers.get(header) or "").strip()
        if value:
            headers[field] = value[:160]
    if headers:
        existing = call.trace_metadata.get("request_headers")
        if isinstance(existing, dict):
            existing.update(headers)
        else:
            call.trace_metadata["request_headers"] = headers


async def filter_or_log(call: LoggedCall, text: str) -> None:
    try:
        await run_in_threadpool(check_request, text)
    except HTTPException as exc:
        call.log("调用失败", status="failed", error=str(exc.detail))
        raise


async def _finish_image_quota(quota: ImageQuotaReservation) -> None:
    with CancelScope(shield=True):
        await run_in_threadpool(quota.finish)


class _ImageQuotaStream(StreamingResponse):
    def __init__(self, response: StreamingResponse, quota: ImageQuotaReservation) -> None:
        super().__init__(
            response.body_iterator,
            status_code=response.status_code,
            headers=response.headers,
            background=response.background,
        )
        self.quota = quota

    async def __call__(self, scope, receive, send) -> None:
        try:
            await super().__call__(scope, receive, send)
        finally:
            await _finish_image_quota(self.quota)


async def _run_image_call(call: LoggedCall, handler, payload: dict, count: object):
    quota = None
    stream_owns_quota = False
    try:
        n = parse_image_count(count)
        with CancelScope(shield=True):
            quota = await run_in_threadpool(image_quota_service.reserve, call.identity, n)
    except HTTPException as exc:
        call.log("调用失败", status="failed", error=str(exc.detail))
        raise
    except ImageQuotaExceededError as exc:
        call.log("调用失败", status="failed", error=str(exc), extra={"error_code": exc.code})
        return openai_error_response(str(exc), 429, code=exc.code)
    except ImageQuotaUnavailableError as exc:
        call.log("调用失败", status="failed", error=str(exc), extra={"error_code": exc.code})
        return openai_error_response(str(exc), 503, code=exc.code)
    try:
        payload["_image_quota"] = quota
        response = await call.run(handler, payload)
        if quota is not None and isinstance(response, StreamingResponse):
            response = _ImageQuotaStream(response, quota)
            stream_owns_quota = True
        return response
    finally:
        if quota is not None and not stream_owns_quota:
            await _finish_image_quota(quota)


def create_router() -> APIRouter:
    router = APIRouter()

    async def submit_editable_file_task(submit, identity, **kwargs):
        try:
            return await run_in_threadpool(submit, identity, **kwargs)
        except EditableFileTaskInvalidIdError as exc:
            raise HTTPException(
                status_code=400,
                detail={"error": str(exc)},
            ) from exc

    @router.get("/v1/models")
    async def list_models(authorization: str | None = Header(default=None)):
        require_identity(authorization)
        try:
            return await run_in_threadpool(openai_v1_models.list_models)
        except Exception as exc:
            raise HTTPException(status_code=502, detail={"error": str(exc)}) from exc

    @router.post("/v1/images/generations")
    async def generate_images(
            body: ImageGenerationRequest,
            request: Request,
            authorization: str | None = Header(default=None),
    ):
        identity = require_identity(authorization)
        payload = body.model_dump(mode="python")
        payload["base_url"] = resolve_image_base_url(request)
        payload["owner_id"] = str(identity.get("id") or "")
        call = LoggedCall(identity, "/v1/images/generations", body.model, "文生图", request_text=body.prompt)
        attach_trace_headers(call, request)
        call.attach_trace_metadata(payload)
        await filter_or_log(call, body.prompt)
        return await _run_image_call(call, openai_v1_image_generations.handle, payload, body.n)

    @router.post("/v1/images/edits")
    async def edit_images(
            request: Request,
            authorization: str | None = Header(default=None),
    ):
        identity = require_identity(authorization)
        payload, image_sources, mask_sources = await parse_image_edit_request(request)
        prompt = str(payload["prompt"])
        model = str(payload["model"])
        call = LoggedCall(identity, "/v1/images/edits", model, "图生图", request_text=prompt)
        attach_trace_headers(call, request)
        call.attach_trace_metadata(payload)
        await filter_or_log(call, prompt)
        payload["images"] = await read_image_sources(image_sources)
        if mask_sources:
            payload["mask"] = await read_image_sources(mask_sources)
        payload["base_url"] = resolve_image_base_url(request)
        payload["owner_id"] = str(identity.get("id") or "")
        return await _run_image_call(call, openai_v1_image_edit.handle, payload, payload.get("n"))

    @router.post("/v1/chat/completions")
    async def create_chat_completion(body: ChatCompletionRequest, request: Request, authorization: str | None = Header(default=None)):
        identity = require_identity(authorization)
        payload = body.model_dump(mode="python")
        payload["base_url"] = resolve_image_base_url(request)
        payload["owner_id"] = str(identity.get("id") or "")
        model = str(payload.get("model") or "auto")
        request_preview = request_text(payload.get("prompt"), payload.get("messages"))
        image_chat = is_image_chat_request(payload)
        call = LoggedCall(
            identity,
            "/v1/chat/completions",
            model,
            "聊天生图" if image_chat else "文本生成",
            request_text=request_preview,
            request_shape=request_shape(payload.get("messages")),
            image_request=image_chat,
        )
        attach_trace_headers(call, request)
        call.attach_trace_metadata(payload)
        await filter_or_log(call, request_preview)
        if image_chat:
            return await _run_image_call(call, openai_v1_chat_complete.handle, payload, body.n)
        return await call.run(openai_v1_chat_complete.handle, payload)

    @router.post("/v1/responses")
    async def create_response(body: ResponseCreateRequest, authorization: str | None = Header(default=None)):
        identity = require_identity(authorization)
        payload = body.model_dump(mode="python")
        payload["owner_id"] = str(identity.get("id") or "")
        model = str(payload.get("model") or "auto")
        request_preview = request_text(payload.get("input"), payload.get("instructions"))
        image_response = has_response_image_generation_tool(payload)
        call = LoggedCall(
            identity,
            "/v1/responses",
            model,
            "Responses",
            request_text=request_preview,
            request_shape=request_shape(payload.get("input")),
            image_request=image_response,
        )
        call.attach_trace_metadata(payload)
        await filter_or_log(call, request_preview)
        if image_response:
            return await _run_image_call(call, openai_v1_response.handle, payload, 1)
        return await call.run(openai_v1_response.handle, payload)

    @router.post("/v1/messages")
    async def create_message(
            body: AnthropicMessageRequest,
            authorization: str | None = Header(default=None),
            x_api_key: str | None = Header(default=None, alias="x-api-key"),
            anthropic_version: str | None = Header(default=None, alias="anthropic-version"),
    ):
        identity = require_identity(authorization or (f"Bearer {x_api_key}" if x_api_key else None))
        payload = body.model_dump(mode="python")
        payload["owner_id"] = str(identity.get("id") or "")
        model = str(payload.get("model") or "auto")
        request_preview = request_text(payload.get("system"), payload.get("messages"), payload.get("tools"))
        call = LoggedCall(identity, "/v1/messages", model, "Messages", request_text=request_preview)
        await filter_or_log(call, request_preview)
        return await call.run(anthropic_v1_messages.handle, payload, sse="anthropic")

    @router.post("/v1/search")
    async def search(body: SearchRequest, authorization: str | None = Header(default=None)):
        identity = require_identity(authorization)
        call = LoggedCall(identity, "/v1/search", openai_search.MODEL, "搜索", request_text=body.prompt)
        await filter_or_log(call, body.prompt)
        return await call.run(openai_search.handle, body.model_dump(mode="python"))

    @router.get("/v1/editable-file-tasks")
    async def list_editable_file_tasks(
            ids: str = "",
            limit: int = Query(default=0, ge=0, le=100),
            authorization: str | None = Header(default=None),
    ):
        identity = require_identity(authorization)
        task_ids = [item.strip() for item in ids.split(",") if item.strip()]
        return await run_in_threadpool(editable_file_task_service.list_tasks, identity, task_ids, limit=limit)

    @router.post("/v1/editable-file-tasks")
    async def create_editable_file_task(body: EditableFileTaskRequest, request: Request, authorization: str | None = Header(default=None)):
        identity = require_identity(authorization)
        kind = (body.kind or "ppt").strip().lower()
        if kind not in {"ppt", "psd"}:
            raise HTTPException(status_code=400, detail={"error": "kind must be ppt or psd"})
        endpoint = f"/v1/{kind}/generations"
        await filter_or_log(
            LoggedCall(identity, endpoint, "gpt-5-5-thinking", f"{kind.upper()} generation task", request_text=body.prompt),
            body.prompt,
        )
        submit = editable_file_task_service.submit_psd if kind == "psd" else editable_file_task_service.submit_ppt
        return await submit_editable_file_task(
            submit,
            identity,
            client_task_id=body.client_task_id or "",
            prompt=body.prompt,
            base64_images=body.base64_images,
            base_url=resolve_image_base_url(request),
        )

    @router.delete("/v1/editable-file-tasks/{task_id}")
    async def delete_editable_file_task(
            task_id: str,
            authorization: str | None = Header(default=None),
    ):
        identity = require_identity(authorization)
        try:
            return await run_in_threadpool(
                editable_file_task_service.delete_task,
                identity,
                task_id,
            )
        except EditableFileTaskNotFoundError as exc:
            raise HTTPException(
                status_code=404,
                detail={"error": str(exc)},
            ) from exc
        except EditableFileTaskNotTerminalError as exc:
            raise HTTPException(
                status_code=409,
                detail={"error": str(exc)},
            ) from exc
        except EditableFileTaskCleanupError as exc:
            raise HTTPException(
                status_code=409,
                detail={"error": str(exc)},
            ) from exc

    @router.get("/files/{file_path:path}")
    async def download_editable_file(file_path: str):
        try:
            path = await run_in_threadpool(
                editable_file_task_service.public_file_path,
                file_path,
            )
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail={"error": "file not found"}) from exc
        return FileResponse(path, filename=path.name)

    @router.post("/v1/ppt/generations")
    async def create_ppt_task(body: EditableFileTaskRequest, request: Request, authorization: str | None = Header(default=None)):
        identity = require_identity(authorization)
        await filter_or_log(LoggedCall(identity, "/v1/ppt/generations", "gpt-5-5-thinking", "PPT生成任务", request_text=body.prompt), body.prompt)
        return await submit_editable_file_task(
            editable_file_task_service.submit_ppt,
            identity,
            client_task_id=body.client_task_id or "",
            prompt=body.prompt,
            base64_images=body.base64_images,
            base_url=resolve_image_base_url(request),
        )

    @router.post("/v1/psd/generations")
    async def create_psd_task(body: EditableFileTaskRequest, request: Request, authorization: str | None = Header(default=None)):
        identity = require_identity(authorization)
        await filter_or_log(LoggedCall(identity, "/v1/psd/generations", "gpt-5-5-thinking", "PSD生成任务", request_text=body.prompt), body.prompt)
        return await submit_editable_file_task(
            editable_file_task_service.submit_psd,
            identity,
            client_task_id=body.client_task_id or "",
            prompt=body.prompt,
            base64_images=body.base64_images,
            base_url=resolve_image_base_url(request),
        )

    return router
