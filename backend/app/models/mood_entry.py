from datetime import datetime, timezone

from sqlalchemy import ForeignKey, Integer, Text, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MoodEntry(Base):
    __tablename__ = "mood_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    mood_value: Mapped[int] = mapped_column(Integer)  # 1-5
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship(back_populates="entries")  # noqa: F821
