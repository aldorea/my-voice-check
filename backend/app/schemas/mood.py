from datetime import datetime

from pydantic import BaseModel, Field


class MoodEntryCreate(BaseModel):
    mood_value: int = Field(ge=1, le=5)
    text: str | None = None


class MoodEntryResponse(BaseModel):
    id: int
    mood_value: int
    text: str | None
    audio_filename: str | None
    audio_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MoodEntryList(BaseModel):
    entries: list[MoodEntryResponse]
    total: int
