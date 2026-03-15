from datetime import datetime, timezone

from sqlalchemy import ForeignKey, Text, String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    analysis_type: Mapped[str] = mapped_column(String(50))  # "single" | "daily" | "weekly"
    mood_entry_id: Mapped[int | None] = mapped_column(ForeignKey("mood_entries.id"), nullable=True)
    transcription: Mapped[str | None] = mapped_column(Text, nullable=True)
    emotional_state: Mapped[str | None] = mapped_column(Text, nullable=True)
    professional_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendations: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "bajo" | "medio" | "alto"
    patterns_detected: Mapped[str | None] = mapped_column(Text, nullable=True)
    entries_analyzed: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship()  # noqa: F821
    mood_entry: Mapped["MoodEntry"] = relationship()  # noqa: F821
