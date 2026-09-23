from __future__ import annotations

import json
import threading
from typing import Any

from sqlalchemy import Column, String, Text, select

from services.application_database import (
    DatabaseBase,
    initialize_application_database,
    resolve_database_url,
)
from services.storage.studio_conversation_repository import (
    StudioConversationRepository,
)
from utils.timezone import beijing_now


class StudioSessionModel(DatabaseBase):
    __tablename__ = "studio_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    owner_id = Column(String(255), unique=True, nullable=False, index=True)
    data = Column(Text, nullable=False)
    updated_at = Column(String(32), nullable=False, default="")


def _now_iso() -> str:
    return beijing_now().isoformat(timespec="seconds")


class StudioSessionService:
    """Server-side studio conversation state, keyed by owner.

    Structured conversations/messages are authoritative. Legacy whole-blob rows are
    imported once and kept only as a migration source.
    """

    def __init__(self) -> None:
        self._engine = initialize_application_database(resolve_database_url())
        from sqlalchemy.orm import sessionmaker

        self.Session = sessionmaker(bind=self._engine, expire_on_commit=False)
        self._lock = threading.Lock()
        self._repository = StudioConversationRepository()

    def _clean(self, value: object) -> str:
        return str(value or "").strip()

    def _load_legacy_state(self, owner: str) -> dict[str, Any] | None:
        with self._lock:
            session = self.Session()
            try:
                row = (
                    session.query(StudioSessionModel)
                    .filter(StudioSessionModel.owner_id == owner)
                    .one_or_none()
                )
                if row is None:
                    return None
                try:
                    state = json.loads(row.data)
                except (TypeError, json.JSONDecodeError):
                    return None
                return state if isinstance(state, dict) else None
            finally:
                session.close()

    def _import_legacy_if_needed(self, owner: str) -> None:
        structured = self._repository.load_owner_state(owner)
        if structured.get("state"):
            return
        legacy = self._load_legacy_state(owner)
        if not legacy:
            return
        self._repository.merge_owner_state(owner, legacy)

    def load(self, owner_id: str) -> dict[str, Any]:
        owner = self._clean(owner_id)
        if not owner:
            return {"schema_version": 2, "state": None}
        self._import_legacy_if_needed(owner)
        loaded = self._repository.load_owner_state(owner)
        state = loaded.get("state")
        if isinstance(state, dict):
            notices = state.get("conversationNotices")
            state = {
                **state,
                "conversationNotices": notices if isinstance(notices, dict) else {},
            }
        return {
            "schema_version": 2,
            "state": state,
            "updated_at": loaded.get("updated_at"),
        }

    def save(self, owner_id: str, state: dict[str, Any]) -> dict[str, Any]:
        owner = self._clean(owner_id)
        if not owner:
            raise ValueError("owner_id is required")
        if not isinstance(state, dict):
            raise ValueError("state must be an object")
        self._import_legacy_if_needed(owner)
        result = self._repository.merge_owner_state(owner, state)
        return {
            "schema_version": 2,
            "saved": True,
            "merged": True,
            "updated_at": result.get("updated_at"),
        }

    def delete_conversation(self, owner_id: str, conversation_id: str) -> dict[str, Any]:
        owner = self._clean(owner_id)
        conversation_id = self._clean(conversation_id)
        if not owner:
            raise ValueError("owner_id is required")
        if not conversation_id:
            raise ValueError("conversation_id is required")
        self._import_legacy_if_needed(owner)
        removed = self._repository.delete_conversation(
            owner,
            conversation_id,
            deleted_at=_now_iso(),
        )
        return {"schema_version": 2, "deleted": bool(removed), "removed": removed}

    def clear(self, owner_id: str) -> dict[str, Any]:
        owner = self._clean(owner_id)
        if not owner:
            raise ValueError("owner_id is required")
        self._import_legacy_if_needed(owner)
        removed = self._repository.clear_owner(owner, deleted_at=_now_iso())
        return {"schema_version": 2, "removed": removed}


studio_session_service = StudioSessionService()
