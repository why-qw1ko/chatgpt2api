from __future__ import annotations

import json
import threading
from typing import Any

from sqlalchemy import Column, Integer, String, Text

from services.application_database import (
    DatabaseBase,
    initialize_application_database,
    resolve_database_url,
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
    """Server-side persistence for studio conversation state, keyed by owner."""

    def __init__(self) -> None:
        self._engine = initialize_application_database(resolve_database_url())
        from sqlalchemy.orm import sessionmaker

        self.Session = sessionmaker(bind=self._engine, expire_on_commit=False)
        self._lock = threading.Lock()

    def _clean(self, value: object) -> str:
        return str(value or "").strip()

    def load(self, owner_id: str) -> dict[str, Any]:
        owner = self._clean(owner_id)
        if not owner:
            return {"schema_version": 1, "state": None}
        with self._lock:
            session = self.Session()
            try:
                row = (
                    session.query(StudioSessionModel)
                    .filter(StudioSessionModel.owner_id == owner)
                    .one_or_none()
                )
                if row is None:
                    return {"schema_version": 1, "state": None}
                try:
                    state = json.loads(row.data)
                except (TypeError, json.JSONDecodeError):
                    state = None
                return {
                    "schema_version": 1,
                    "state": state if isinstance(state, dict) else None,
                    "updated_at": row.updated_at,
                }
            finally:
                session.close()

    def save(self, owner_id: str, state: dict[str, Any]) -> dict[str, Any]:
        owner = self._clean(owner_id)
        if not owner:
            raise ValueError("owner_id is required")
        if not isinstance(state, dict):
            raise ValueError("state must be an object")
        payload = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
        now = _now_iso()
        with self._lock:
            session = self.Session()
            try:
                row = (
                    session.query(StudioSessionModel)
                    .filter(StudioSessionModel.owner_id == owner)
                    .one_or_none()
                )
                if row is None:
                    session.add(
                        StudioSessionModel(owner_id=owner, data=payload, updated_at=now)
                    )
                else:
                    row.data = payload
                    row.updated_at = now
                session.commit()
            finally:
                session.close()
        return {"schema_version": 1, "saved": True, "updated_at": now}

    def clear(self, owner_id: str) -> dict[str, Any]:
        owner = self._clean(owner_id)
        if not owner:
            raise ValueError("owner_id is required")
        removed = 0
        with self._lock:
            session = self.Session()
            try:
                removed = (
                    session.query(StudioSessionModel)
                    .filter(StudioSessionModel.owner_id == owner)
                    .delete()
                )
                session.commit()
            finally:
                session.close()
        return {"schema_version": 1, "removed": removed}


studio_session_service = StudioSessionService()
