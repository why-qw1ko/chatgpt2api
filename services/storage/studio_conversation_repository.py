from __future__ import annotations

import copy
import json
import threading
from typing import Any

from sqlalchemy import Column, Index, Integer, String, Text, delete, select
from sqlalchemy.orm import sessionmaker

from services.application_database import (
    DatabaseBase,
    initialize_application_database,
    resolve_database_url,
)

MAX_CONVERSATIONS_PER_OWNER = 500
MAX_MESSAGES_PER_CONVERSATION = 800
MAX_REFERENCE_IMAGE_DATA_URL_CHARS = 300_000


class StudioConversationModel(DatabaseBase):
    __tablename__ = "studio_conversations"

    id = Column(String(64), primary_key=True)
    owner_id = Column(String(255), nullable=False, index=True)
    title = Column(String(512), nullable=False, default="")
    created_at = Column(String(32), nullable=False, default="")
    updated_at = Column(String(32), nullable=False, default="", index=True)
    deleted_at = Column(String(32), nullable=True, index=True)
    notice = Column(String(16), nullable=True)
    revision = Column(Integer, nullable=False, default=0)


class StudioMessageModel(DatabaseBase):
    __tablename__ = "studio_messages"

    id = Column(String(64), primary_key=True)
    conversation_id = Column(String(64), nullable=False, index=True)
    owner_id = Column(String(255), nullable=False, index=True)
    role = Column(String(16), nullable=False, default="user")
    mode = Column(String(16), nullable=False, default="chat")
    content = Column(Text, nullable=False, default="")
    status = Column(String(16), nullable=True)
    created_at = Column(String(32), nullable=False, default="")
    updated_at = Column(String(32), nullable=False, default="")
    deleted_at = Column(String(32), nullable=True, index=True)
    payload = Column(Text, nullable=False, default="{}")


Index(
    "ix_studio_messages_conversation_created",
    StudioMessageModel.conversation_id,
    StudioMessageModel.created_at,
)


class StudioConversationRepository:
    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or resolve_database_url()
        self.engine = initialize_application_database(self.database_url)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        self._write_lock = threading.RLock()

    @staticmethod
    def _clean(value: object) -> str:
        return str(value or "").strip()

    @staticmethod
    def _copy(value: object) -> object:
        return copy.deepcopy(value)

    @classmethod
    def _sanitize_reference_images(cls, value: object) -> object:
        if not isinstance(value, list):
            return value
        cleaned: list[dict[str, Any]] = []
        for item in value:
            if not isinstance(item, dict):
                continue
            next_item = dict(item)
            data_url = str(next_item.get("dataUrl") or "")
            if len(data_url) > MAX_REFERENCE_IMAGE_DATA_URL_CHARS:
                next_item.pop("dataUrl", None)
                next_item["dataUrlOmitted"] = True
            cleaned.append(next_item)
        return cleaned

    @classmethod
    def _message_payload_from_message(cls, message: dict[str, Any]) -> dict[str, Any]:
        payload = {
            key: cls._copy(value)
            for key, value in message.items()
            if key not in {
                "id", "role", "mode", "content", "status", "createdAt", "updatedAt", "deletedAt",
            } and value is not None
        }
        if isinstance(payload.get("referenceImages"), list):
            payload["referenceImages"] = cls._sanitize_reference_images(payload["referenceImages"])
        return payload

    @classmethod
    def _message_from_row(cls, row: StudioMessageModel) -> dict[str, Any]:
        message: dict[str, Any] = {
            "id": row.id,
            "role": row.role,
            "mode": row.mode,
            "content": row.content or "",
            "createdAt": row.created_at,
            "updatedAt": row.updated_at,
        }
        if row.status:
            message["status"] = row.status
        if row.deleted_at:
            message["deletedAt"] = row.deleted_at
        try:
            payload = json.loads(row.payload or "{}")
        except (TypeError, json.JSONDecodeError):
            payload = {}
        if isinstance(payload, dict):
            for key, value in payload.items():
                if value is not None:
                    message[key] = cls._copy(value)
        return message

    @classmethod
    def _conversation_from_rows(
        cls,
        row: StudioConversationModel,
        messages: list[dict[str, Any]],
    ) -> dict[str, Any]:
        conversation: dict[str, Any] = {
            "id": row.id,
            "title": row.title or "新对话",
            "createdAt": row.created_at,
            "updatedAt": row.updated_at,
            "messages": messages,
        }
        if row.deleted_at:
            conversation["deletedAt"] = row.deleted_at
        if row.notice in {"done", "error", "running"}:
            conversation["notice"] = row.notice
        return conversation

    def load_owner_state(self, owner_id: str) -> dict[str, Any]:
        owner = self._clean(owner_id)
        if not owner:
            return {"schema_version": 2, "state": None, "updated_at": None}
        with self.Session() as session:
            rows = session.scalars(
                select(StudioConversationModel)
                .where(StudioConversationModel.owner_id == owner)
                .order_by(StudioConversationModel.updated_at.desc())
            ).all()
            if not rows:
                return {"schema_version": 2, "state": None, "updated_at": None}
            message_rows = session.scalars(
                select(StudioMessageModel).where(StudioMessageModel.owner_id == owner)
            ).all()
            messages_by_conversation: dict[str, list[dict[str, Any]]] = {}
            for message_row in message_rows:
                messages_by_conversation.setdefault(message_row.conversation_id, []).append(
                    self._message_from_row(message_row)
                )
            for items in messages_by_conversation.values():
                items.sort(key=lambda item: (str(item.get("createdAt") or ""), str(item.get("id") or "")))
            conversations: list[dict[str, Any]] = []
            notices: dict[str, str] = {}
            updated_at = ""
            for row in rows:
                messages = messages_by_conversation.get(row.id, [])
                if not row.deleted_at and row.notice in {"done", "error"}:
                    notices[row.id] = row.notice
                conversation = self._conversation_from_rows(row, messages)
                conversations.append(conversation)
                if str(row.updated_at or "") > updated_at:
                    updated_at = str(row.updated_at or "")
            state = {
                "conversations": conversations,
                "conversationNotices": notices,
            }
            return {
                "schema_version": 2,
                "state": state,
                "updated_at": updated_at or None,
            }

    def _prune_locked(self, session: Any, owner: str) -> None:
        conversation_rows = session.scalars(
            select(StudioConversationModel)
            .where(StudioConversationModel.owner_id == owner)
            .order_by(StudioConversationModel.updated_at.desc())
        ).all()
        if len(conversation_rows) <= MAX_CONVERSATIONS_PER_OWNER:
            return
        overflow = conversation_rows[MAX_CONVERSATIONS_PER_OWNER:]
        overflow_ids = [row.id for row in overflow]
        if not overflow_ids:
            return
        session.execute(delete(StudioMessageModel).where(
            StudioMessageModel.owner_id == owner,
            StudioMessageModel.conversation_id.in_(overflow_ids),
        ))
        session.execute(delete(StudioConversationModel).where(
            StudioConversationModel.owner_id == owner,
            StudioConversationModel.id.in_(overflow_ids),
        ))

    def _prune_messages_locked(self, session: Any, owner: str, conversation_id: str) -> None:
        rows = session.scalars(
            select(StudioMessageModel)
            .where(
                StudioMessageModel.owner_id == owner,
                StudioMessageModel.conversation_id == conversation_id,
            )
            .order_by(StudioMessageModel.created_at.asc(), StudioMessageModel.id.asc())
        ).all()
        if len(rows) <= MAX_MESSAGES_PER_CONVERSATION:
            return
        overflow_ids = [row.id for row in rows[: len(rows) - MAX_MESSAGES_PER_CONVERSATION]]
        session.execute(delete(StudioMessageModel).where(
            StudioMessageModel.id.in_(overflow_ids),
        ))

    def merge_owner_state(self, owner_id: str, state: dict[str, Any]) -> dict[str, Any]:
        owner = self._clean(owner_id)
        if not owner:
            raise ValueError("owner_id is required")
        if not isinstance(state, dict):
            raise ValueError("state must be an object")
        raw_conversations = state.get("conversations")
        conversations = raw_conversations if isinstance(raw_conversations, list) else []
        raw_notices = state.get("conversationNotices")
        notices = raw_notices if isinstance(raw_notices, dict) else {}

        with self._write_lock:
            session = self.Session()
            try:
                for raw in conversations:
                    if not isinstance(raw, dict):
                        continue
                    self._merge_conversation_locked(session, owner, raw, notices)
                self._prune_locked(session, owner)
                session.commit()
            except Exception:
                session.rollback()
                raise
            finally:
                session.close()
        loaded = self.load_owner_state(owner)
        return {
            "schema_version": 2,
            "saved": True,
            "merged": True,
            "updated_at": loaded.get("updated_at"),
            "state": loaded.get("state"),
        }

    def _merge_conversation_locked(
        self,
        session: Any,
        owner: str,
        incoming: dict[str, Any],
        notices: dict[str, Any],
    ) -> None:
        conversation_id = self._clean(incoming.get("id"))
        if not conversation_id:
            return
        incoming_updated_at = self._clean(incoming.get("updatedAt")) or self._clean(incoming.get("createdAt"))
        incoming_created_at = self._clean(incoming.get("createdAt")) or incoming_updated_at
        incoming_deleted_at = self._clean(incoming.get("deletedAt"))
        notice = str(notices.get(conversation_id) or incoming.get("notice") or "").strip()
        if notice not in {"done", "error", "running"}:
            notice = None

        row = session.get(StudioConversationModel, conversation_id)
        if row is None:
            session.add(StudioConversationModel(
                id=conversation_id,
                owner_id=owner,
                title=self._clean(incoming.get("title")) or "新对话",
                created_at=incoming_created_at,
                updated_at=incoming_updated_at or incoming_created_at,
                deleted_at=incoming_deleted_at or None,
                notice=notice,
                revision=1,
            ))
        else:
            if str(row.owner_id) != owner:
                return
            current_updated_at = str(row.updated_at or "")
            if incoming_updated_at and incoming_updated_at < current_updated_at and not incoming_deleted_at:
                # Older client snapshot: still merge messages, keep newer conversation metadata.
                pass
            else:
                if incoming_deleted_at:
                    row.deleted_at = incoming_deleted_at
                    row.notice = None
                elif not row.deleted_at:
                    title = self._clean(incoming.get("title"))
                    if title:
                        row.title = title
                    if notice is not None:
                        row.notice = notice
                if incoming_updated_at and incoming_updated_at >= current_updated_at:
                    row.updated_at = incoming_updated_at
            row.revision = int(row.revision or 0) + 1

        messages = incoming.get("messages")
        messages_replaced_at = self._clean(incoming.get("messagesReplacedAt"))
        if isinstance(messages, list):
            incoming_ids = set()
            for raw_message in messages:
                if isinstance(raw_message, dict):
                    message_id = self._clean(raw_message.get("id"))
                    if message_id:
                        incoming_ids.add(message_id)
                    self._merge_message_locked(session, owner, conversation_id, raw_message)
            if messages_replaced_at:
                existing_messages = session.scalars(
                    select(StudioMessageModel).where(
                        StudioMessageModel.owner_id == owner,
                        StudioMessageModel.conversation_id == conversation_id,
                    )
                ).all()
                for message_row in existing_messages:
                    if message_row.id in incoming_ids:
                        continue
                    if message_row.deleted_at and str(message_row.deleted_at) >= messages_replaced_at:
                        continue
                    message_row.deleted_at = messages_replaced_at
                    message_row.updated_at = messages_replaced_at
            self._prune_messages_locked(session, owner, conversation_id)

    def _merge_message_locked(
        self,
        session: Any,
        owner: str,
        conversation_id: str,
        incoming: dict[str, Any],
    ) -> None:
        message_id = self._clean(incoming.get("id"))
        if not message_id:
            return
        incoming_created_at = self._clean(incoming.get("createdAt"))
        incoming_updated_at = self._clean(incoming.get("updatedAt")) or incoming_created_at
        incoming_deleted_at = self._clean(incoming.get("deletedAt"))
        role = self._clean(incoming.get("role")) or "user"
        mode = self._clean(incoming.get("mode")) or "chat"
        content = str(incoming.get("content") or "")
        status = self._clean(incoming.get("status")) or None
        payload = self._message_payload_from_message(incoming)

        row = session.get(StudioMessageModel, message_id)
        if row is None:
            session.add(StudioMessageModel(
                id=message_id,
                conversation_id=conversation_id,
                owner_id=owner,
                role=role,
                mode=mode,
                content=content,
                status=status,
                created_at=incoming_created_at or incoming_updated_at,
                updated_at=incoming_updated_at or incoming_created_at,
                deleted_at=incoming_deleted_at or None,
                payload=json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            ))
            return

        if str(row.owner_id) != owner or str(row.conversation_id) != conversation_id:
            return
        current_updated_at = str(row.updated_at or "")
        base_updated_at = self._clean(incoming.get("baseUpdatedAt"))
        if base_updated_at and current_updated_at and current_updated_at > base_updated_at:
            return
        if incoming_updated_at and incoming_updated_at < current_updated_at and not incoming_deleted_at:
            return
        if incoming_deleted_at:
            row.deleted_at = incoming_deleted_at
            row.status = status or row.status
            row.updated_at = incoming_deleted_at
            return
        row.role = role
        row.mode = mode
        row.content = content
        if status is not None:
            row.status = status
        if incoming_created_at and not row.created_at:
            row.created_at = incoming_created_at
        if incoming_updated_at:
            row.updated_at = incoming_updated_at
        row.payload = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))

    def delete_conversation(self, owner_id: str, conversation_id: str, *, deleted_at: str) -> int:
        owner = self._clean(owner_id)
        conversation_id = self._clean(conversation_id)
        if not owner or not conversation_id:
            return 0
        deleted_at = self._clean(deleted_at)
        with self._write_lock:
            session = self.Session()
            try:
                row = session.get(StudioConversationModel, conversation_id)
                if row is None or str(row.owner_id) != owner:
                    return 0
                row.deleted_at = deleted_at
                row.notice = None
                row.updated_at = deleted_at
                row.revision = int(row.revision or 0) + 1
                message_rows = session.scalars(
                    select(StudioMessageModel).where(
                        StudioMessageModel.owner_id == owner,
                        StudioMessageModel.conversation_id == conversation_id,
                    )
                ).all()
                for message_row in message_rows:
                    message_row.deleted_at = deleted_at
                    message_row.updated_at = deleted_at
                session.commit()
                return 1
            except Exception:
                session.rollback()
                raise
            finally:
                session.close()

    def clear_owner(self, owner_id: str, *, deleted_at: str) -> int:
        owner = self._clean(owner_id)
        if not owner:
            return 0
        deleted_at = self._clean(deleted_at)
        with self._write_lock:
            session = self.Session()
            try:
                conversation_rows = session.scalars(
                    select(StudioConversationModel).where(StudioConversationModel.owner_id == owner)
                ).all()
                removed = 0
                for row in conversation_rows:
                    row.deleted_at = deleted_at
                    row.notice = None
                    row.updated_at = deleted_at
                    row.revision = int(row.revision or 0) + 1
                    removed += 1
                session.execute(
                    delete(StudioMessageModel).where(StudioMessageModel.owner_id == owner)
                )
                session.commit()
                return removed
            except Exception:
                session.rollback()
                raise
            finally:
                session.close()
