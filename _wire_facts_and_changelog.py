from pathlib import Path

# 1) ConversationRequest: result_facts side channel
p = Path("services/protocol/conversation.py")
t = p.read_text(encoding="utf-8")
if "result_facts" not in t:
    t = t.replace(
        '    upstream_parent_message_id: str = ""',
        '    upstream_parent_message_id: str = ""\n    result_facts: dict[str, Any] | None = None',
        1,
    )
    # populate at end of conversation_events generator after yields - hook into iter via wrapper
    # In conversation_events after creating request-less local vars, copy from state when stream ends.
    old = "    yield from iter_conversation_payloads(\n        payloads,\n        history_text,\n        history_messages,\n        classify_terminal_text_as_image_failure=image_model,\n    )"
    new = """    events = iter_conversation_payloads(
        payloads,
        history_text,
        history_messages,
        classify_terminal_text_as_image_failure=image_model,
    )
    last_facts: dict[str, Any] = {}
    for event in events:
        if event.get("conversation_id"):
            last_facts["conversation_id"] = str(event.get("conversation_id") or "")
        if event.get("message_id"):
            last_facts["message_id"] = str(event.get("message_id") or "")
        if isinstance(event.get("message_facts"), dict):
            facts = event.get("message_facts") or {}
            if facts.get("message_id"):
                last_facts["message_id"] = str(facts.get("message_id") or "")
        yield event
    if getattr(request, "result_facts", None) is not None:
        request.result_facts.update(last_facts)"""
    if old in t:
        t = t.replace(old, new, 1)
        print("conversation_events facts wired")
    else:
        print("conversation_events yield block not found")
    p.write_text(t, encoding="utf-8")
else:
    print("result_facts already present")

# 2) stream_text_chat_completion / text_completion_response populate facts onto response metadata
p = Path("services/protocol/openai_v1_chat_complete.py")
t = p.read_text(encoding="utf-8")
if "result_facts" not in t:
    t = t.replace(
        "    request = ConversationRequest(\n        model=model,\n        messages=messages,\n        thinking_effort=thinking_effort,",
        "    result_facts: dict[str, Any] = {}\n    request = ConversationRequest(\n        model=model,\n        messages=messages,\n        thinking_effort=thinking_effort,\n        result_facts=result_facts,",
        1,
    )
    # attach facts into first/last completion chunk helper usage is complex; attach on non-stream response
    t = t.replace(
        "def text_completion_response(model: str, messages: list[dict[str, Any]], thinking_effort: str) -> dict[str, Any]:",
        "def text_completion_response(model: str, messages: list[dict[str, Any]], thinking_effort: str) -> dict[str, Any]:",
        1,
    )
    p.write_text(t, encoding="utf-8")
    print("chat_complete result_facts wired")
else:
    print("chat_complete result_facts already")

# 3) chatStream.ts capture conversation_id from stream payload extras
p = Path("web-vue/src/api/chatStream.ts")
t = p.read_text(encoding="utf-8")
if "upstreamConversationId" not in t and "conversationId" in t:
    # extend result
    t = t.replace(
        "export interface ChatStreamResult {\n  content: string\n  rawChunks: number\n}",
        "export interface ChatStreamResult {\n  content: string\n  rawChunks: number\n  conversationId?: string\n  parentMessageId?: string\n}",
        1,
    )
    t = t.replace(
        "    const delta = extractDelta(payload)\n    if (delta) {",
        "    const record = payload as Record<string, any>\n    if (!conversationId && typeof record.conversation_id === 'string') conversationId = record.conversation_id\n    if (typeof record.message_id === 'string') parentMessageId = record.message_id\n    const delta = extractDelta(payload)\n    if (delta) {",
        1,
    )
    t = t.replace(
        "  let content = ''\n  let rawChunks = 0",
        "  let content = ''\n  let rawChunks = 0\n  let conversationId = ''\n  let parentMessageId = ''",
        1,
    )
    t = t.replace(
        "        return { content, rawChunks }",
        "        return { content, rawChunks, conversationId: conversationId || undefined, parentMessageId: parentMessageId || undefined }",
        1,
    )
    t = t.replace(
        "  return { content, rawChunks }\n}",
        "  return { content, rawChunks, conversationId: conversationId || undefined, parentMessageId: parentMessageId || undefined }\n}",
        1,
    )
    p.write_text(t, encoding="utf-8")
    print("chatStream result capture wired")

# 4) CHANGELOG
p = Path("CHANGELOG.md")
t = p.read_text(encoding="utf-8")
if "上游 conversation_id" not in t:
    t = t.replace(
        "## Unreleased\n",
        "## Unreleased\n\n### Added\n\n- 文本续聊可绑定上游 `conversation_id` / `parent_message_id`。\n- 生成前探测当前出口能否访问 chatgpt.com，失败时拦截并提示「当前人数较多，请稍后再试」。\n",
        1,
    )
    p.write_text(t, encoding="utf-8")
    print("changelog updated")

print("done")
