from datetime import datetime

from pydantic import BaseModel


class AnalysisResponse(BaseModel):
    id: int
    analysis_type: str
    mood_entry_id: int | None
    transcription: str | None
    emotional_state: str | None
    professional_analysis: str | None
    recommendations: str | None
    risk_level: str | None
    patterns_detected: str | None
    entries_analyzed: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalysisList(BaseModel):
    analyses: list[AnalysisResponse]
    total: int
