from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.analysis import Analysis
from app.models.mood_entry import MoodEntry
from app.models.user import User
from app.schemas.analysis import AnalysisResponse, AnalysisList
from app.services.ai_analysis import analyze_single_entry, analyze_period
from app.services.transcription import transcribe_audio

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/entry/{entry_id}", response_model=AnalysisResponse)
async def analyze_entry(
    entry_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyze a single mood entry with AI from a professional perspective."""
    result = await db.execute(
        select(MoodEntry).where(MoodEntry.id == entry_id, MoodEntry.user_id == user.id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado")

    # Transcribe audio if present
    transcription = None
    if entry.audio_filename:
        filepath = settings.UPLOAD_DIR / entry.audio_filename
        if filepath.exists():
            transcription = await transcribe_audio(str(filepath))

    # Get AI analysis
    ai_result = await analyze_single_entry(
        mood_value=entry.mood_value,
        text=entry.text,
        transcription=transcription,
    )

    # Save analysis
    analysis = Analysis(
        user_id=user.id,
        analysis_type="single",
        mood_entry_id=entry.id,
        transcription=transcription,
        emotional_state=ai_result.get("emotional_state"),
        professional_analysis=ai_result.get("professional_analysis"),
        recommendations=ai_result.get("recommendations"),
        risk_level=ai_result.get("risk_level"),
        patterns_detected=ai_result.get("patterns_detected"),
        entries_analyzed=1,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    return AnalysisResponse.model_validate(analysis)


@router.post("/daily", response_model=AnalysisResponse)
async def analyze_daily(
    date: str = Query(None, description="Fecha en formato YYYY-MM-DD. Por defecto hoy."),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyze all mood entries from a specific day."""
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido. Usa YYYY-MM-DD")
    else:
        target_date = datetime.now(timezone.utc).date()

    start = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    end = start + timedelta(days=1)

    return await _analyze_period(user, db, start, end, "daily", f"día {target_date}")


@router.post("/weekly", response_model=AnalysisResponse)
async def analyze_weekly(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyze all mood entries from the last 7 days."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=7)

    return await _analyze_period(user, db, start, now, "weekly", "últimos 7 días")


@router.get("/", response_model=AnalysisList)
async def list_analyses(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all analyses for the current user."""
    count_result = await db.execute(
        select(func.count()).select_from(Analysis).where(Analysis.user_id == user.id)
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == user.id)
        .order_by(desc(Analysis.created_at))
        .offset(skip)
        .limit(limit)
    )
    analyses = result.scalars().all()

    return AnalysisList(
        analyses=[AnalysisResponse.model_validate(a) for a in analyses],
        total=total,
    )


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific analysis."""
    result = await db.execute(
        select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user.id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Análisis no encontrado")
    return AnalysisResponse.model_validate(analysis)


async def _analyze_period(
    user: User,
    db: AsyncSession,
    start: datetime,
    end: datetime,
    analysis_type: str,
    period_label: str,
) -> AnalysisResponse:
    """Shared logic for daily/weekly analysis."""
    result = await db.execute(
        select(MoodEntry)
        .where(
            MoodEntry.user_id == user.id,
            MoodEntry.created_at >= start,
            MoodEntry.created_at < end,
        )
        .order_by(MoodEntry.created_at)
    )
    entries = result.scalars().all()

    if not entries:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No hay registros para el período: {period_label}",
        )

    # Build entries data with transcriptions
    entries_data = []
    for entry in entries:
        entry_dict = {
            "mood_value": entry.mood_value,
            "text": entry.text,
            "created_at": entry.created_at.strftime("%Y-%m-%d %H:%M"),
            "transcription": None,
        }

        if entry.audio_filename:
            filepath = settings.UPLOAD_DIR / entry.audio_filename
            if filepath.exists():
                entry_dict["transcription"] = await transcribe_audio(str(filepath))

        entries_data.append(entry_dict)

    # Get AI analysis
    ai_result = await analyze_period(entries_data, period_label)

    # Save analysis
    analysis = Analysis(
        user_id=user.id,
        analysis_type=analysis_type,
        transcription="; ".join(
            e["transcription"] for e in entries_data if e["transcription"]
        ) or None,
        emotional_state=ai_result.get("emotional_state"),
        professional_analysis=ai_result.get("professional_analysis"),
        recommendations=ai_result.get("recommendations"),
        risk_level=ai_result.get("risk_level"),
        patterns_detected=ai_result.get("patterns_detected"),
        entries_analyzed=len(entries),
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    return AnalysisResponse.model_validate(analysis)
