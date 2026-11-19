from __future__ import annotations

from sqlalchemy import Boolean, Column, Index, Integer, String, case, delete, func, select, text, tuple_, update
from sqlalchemy.orm import sessionmaker

from services.application_database import DatabaseBase, initialize_application_database, resolve_database_url


class ImageQuotaEntry(DatabaseBase):
    __tablename__ = "image_quota_entries"
    __table_args__ = (Index("ix_image_quota_day_owner", "day", "owner_id"),)

    id = Column(String(64), primary_key=True)
    day = Column(String(10), nullable=False)
    owner_id = Column(String(64), nullable=False)
    requested = Column(Integer, nullable=False)
    used = Column(Integer, nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)


class ImageQuotaRepository:
    def __init__(self, database_url: str | None = None) -> None:
        self.engine = initialize_application_database(database_url or resolve_database_url())
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)

    def _lock_owner(self, session, owner_id: str) -> None:
        if self.engine.dialect.name == "sqlite":
            session.execute(text("BEGIN IMMEDIATE"))
        else:
            session.execute(
                text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
                {"key": f"image-quota:{owner_id}"},
            )

    @staticmethod
    def _totals(day: str):
        pending = case(
            (
                ImageQuotaEntry.active.is_(True) & (ImageQuotaEntry.requested > ImageQuotaEntry.used),
                ImageQuotaEntry.requested - ImageQuotaEntry.used,
            ),
            else_=0,
        )
        return select(
            ImageQuotaEntry.owner_id,
            func.sum(ImageQuotaEntry.used),
            func.sum(pending),
        ).where(ImageQuotaEntry.day == day).group_by(ImageQuotaEntry.owner_id)

    def totals(self, day: str, owners: list[str]) -> dict[str, tuple[int, int]]:
        totals = {}
        with self.Session() as session:
            for offset in range(0, len(owners), 500):
                rows = session.execute(self._totals(day).where(
                    ImageQuotaEntry.owner_id.in_(owners[offset:offset + 500]),
                ))
                totals.update((owner, (int(used), int(pending))) for owner, used, pending in rows)
        return totals

    def reserve(self, entry_id: str, owner: str, day: str, requested: int, limit: int | None) -> tuple[int, int] | None:
        with self.Session.begin() as session:
            self._lock_owner(session, owner)
            if limit is not None:
                totals = session.execute(self._totals(day).where(ImageQuotaEntry.owner_id == owner)).one_or_none()
                used, pending = (int(totals[1]), int(totals[2])) if totals else (0, 0)
                if used + pending + requested > limit:
                    return used, pending
            session.add(ImageQuotaEntry(id=entry_id, owner_id=owner, day=day, requested=requested))
            return None

    def record(self, entry_id: str, owner: str, count: int, *, capped: bool, total: bool = False) -> int:
        with self.Session.begin() as session:
            self._lock_owner(session, owner)
            entry = session.get(ImageQuotaEntry, entry_id)
            if entry is None or entry.owner_id != owner or not entry.active:
                return 0
            before = entry.used
            completed = max(before, count) if total else before + count
            entry.used = min(entry.requested, completed) if capped else completed
            return entry.used - before

    def finish(self, entry_id: str, owner: str) -> None:
        with self.Session.begin() as session:
            self._lock_owner(session, owner)
            entry = session.get(ImageQuotaEntry, entry_id)
            if entry is not None and entry.owner_id == owner:
                entry.active = False

    def release_interrupted(self, entries: list[tuple[str, str]]) -> None:
        if not entries:
            return
        with self.Session.begin() as session:
            for offset in range(0, len(entries), 400):
                session.execute(update(ImageQuotaEntry).where(
                    ImageQuotaEntry.active.is_(True),
                    tuple_(ImageQuotaEntry.id, ImageQuotaEntry.owner_id).in_(entries[offset:offset + 400]),
                ).values(active=False))

    def seed(self, owner: str, day: str, completed: list[tuple[str, int]]) -> None:
        with self.Session.begin() as session:
            self._lock_owner(session, owner)
            for entry_id, used in completed:
                if session.get(ImageQuotaEntry, entry_id) is None:
                    session.add(ImageQuotaEntry(
                        id=entry_id, owner_id=owner, day=day, requested=used, used=used, active=False,
                    ))

    def prune(self, oldest_day: str) -> None:
        with self.Session.begin() as session:
            session.execute(delete(ImageQuotaEntry).where(ImageQuotaEntry.day < oldest_day))
