from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import timedelta
from hashlib import sha256
from typing import Mapping
from uuid import uuid4

from sqlalchemy.exc import SQLAlchemyError

from services.storage.image_quota_repository import ImageQuotaRepository
from utils.log import logger
from utils.timezone import beijing_now


@dataclass(frozen=True)
class ImageQuotaUsage:
    day: str
    used: int
    reserved: int
    limit: int | None
    remaining: int | None


class ImageQuotaExceededError(RuntimeError):
    code = "daily_limit_exceeded"

    def __init__(self, limit: int, used: int, reserved: int = 0, requested: int = 1) -> None:
        self.limit = limit
        self.used = used
        self.reserved = reserved
        self.requested = requested
        self.remaining = max(0, limit - used - reserved)
        super().__init__(f"每日图片额度不足，本次需要 {requested} 张，当前可用 {self.remaining} 张")


class ImageQuotaUnavailableError(RuntimeError):
    code = "image_quota_unavailable"

    def __init__(self) -> None:
        super().__init__("暂时无法核验每日图片额度，请稍后重试")


class ImageQuotaReservation:
    def __init__(self, repository: ImageQuotaRepository, entry_id: str, owner_id: str, limit: int | None) -> None:
        self.repository = repository
        self.id = entry_id
        self.owner_id = owner_id
        self.capped = limit is not None
        self._lock = threading.Lock()
        self._active_work = 0
        self._finishing = False
        self._accounting_failed = False

    def record(self, count: int, *, total: bool = False) -> int:
        if count <= 0:
            return 0
        try:
            return self.repository.record(self.id, self.owner_id, count, capped=self.capped, total=total)
        except Exception:
            with self._lock:
                self._accounting_failed = True
            raise

    def retain_work(self) -> None:
        with self._lock:
            self._active_work += 1

    def release_work(self) -> None:
        with self._lock:
            self._active_work -= 1
            if self._active_work == 0 and self._finishing:
                self._finish_locked()

    def finish(self) -> None:
        with self._lock:
            self._finishing = True
            if self._active_work == 0:
                self._finish_locked()

    def _finish_locked(self) -> None:
        if self._accounting_failed:
            return
        try:
            self.repository.finish(self.id, self.owner_id)
        except Exception as exc:
            # Keep the reservation charged if the result of releasing it is unknown.
            logger.error({"event": "image_quota_release_failed", "type": type(exc).__name__})


class ImageQuotaService:
    def __init__(self, repository: ImageQuotaRepository | None = None) -> None:
        self.repository = repository or ImageQuotaRepository()
        self._prune_lock = threading.Lock()
        self._last_pruned_day = ""

    def reserve(self, identity: Mapping[str, object], count: int) -> ImageQuotaReservation | None:
        owner_id = str(identity.get("id") or "").strip()
        if not owner_id or identity.get("role") == "admin":
            return None
        try:
            raw_limit = identity.get("daily_image_limit")
            limit = max(0, int(str(raw_limit))) if raw_limit is not None else None
        except ValueError:
            limit = None
        entry_id = uuid4().hex
        try:
            denied = self.repository.reserve(entry_id, owner_id, self._today(), count, limit)
        except SQLAlchemyError as exc:
            logger.error({"event": "image_quota_reservation_failed", "type": type(exc).__name__})
            raise ImageQuotaUnavailableError() from exc
        if denied is not None and limit is not None:
            used, reserved = denied
            raise ImageQuotaExceededError(limit, used, reserved, count)
        return ImageQuotaReservation(self.repository, entry_id, owner_id, limit)

    def list_today(self, limits: Mapping[str, int | None]) -> dict[str, ImageQuotaUsage]:
        day = self._today()
        totals = self.repository.totals(day, list(limits))
        result = {}
        for owner_id, limit in limits.items():
            used, reserved = totals.get(owner_id, (0, 0))
            remaining = None if limit is None else max(0, limit - used - reserved)
            result[owner_id] = ImageQuotaUsage(day, used, reserved, limit, remaining)
        return result

    def seed_studio_usage(self, completed: Mapping[str, list[tuple[str, int]]], day: str) -> None:
        for owner, records in completed.items():
            self.repository.seed(owner, day, [
                (sha256(f"legacy-studio\0{owner}\0{task_id}".encode()).hexdigest(), count)
                for task_id, count in records
            ])

    def release_interrupted_tasks(self, entries: list[tuple[str, str]]) -> None:
        self.repository.release_interrupted(entries)

    def _today(self) -> str:
        now = beijing_now().date()
        day = now.isoformat()
        if self._last_pruned_day != day:
            with self._prune_lock:
                if self._last_pruned_day != day:
                    self.repository.prune((now - timedelta(days=7)).isoformat())
                    self._last_pruned_day = day
        return day


image_quota_service = ImageQuotaService()
