import uuid

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.mood_entry import MoodEntry
from app.models.user import User
from app.schemas.mood import MoodEntryCreate, MoodEntryResponse, MoodEntryList

router = APIRouter(prefix="/moods", tags=["moods"])

ALLOWED_AUDIO = {"audio/mpeg", "audio/mp4", "audio/wav", "audio/m4a", "audio/x-m4a", "audio/webm"}


def _entry_to_response(entry: MoodEntry) -> MoodEntryResponse:
    data = MoodEntryResponse.model_validate(entry)
    if entry.audio_filename:
        data.audio_url = f"/api/moods/{entry.id}/audio"
    return data


@router.post("/", response_model=MoodEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(
    data: MoodEntryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = MoodEntry(user_id=user.id, mood_value=data.mood_value, text=data.text)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return _entry_to_response(entry)


@router.post("/{entry_id}/audio", response_model=MoodEntryResponse)
async def upload_audio(
    entry_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await _get_user_entry(entry_id, user.id, db)

    if file.content_type not in ALLOWED_AUDIO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de audio no soportado: {file.content_type}",
        )

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "m4a"
    filename = f"{user.id}_{entry.id}_{uuid.uuid4().hex}.{ext}"
    filepath = settings.UPLOAD_DIR / filename

    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    entry.audio_filename = filename
    await db.commit()
    await db.refresh(entry)
    return _entry_to_response(entry)


@router.get("/{entry_id}/audio")
async def get_audio(
    entry_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await _get_user_entry(entry_id, user.id, db)
    if not entry.audio_filename:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sin audio")

    filepath = settings.UPLOAD_DIR / entry.audio_filename
    if not filepath.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")

    return FileResponse(filepath, media_type="audio/mpeg")


@router.get("/", response_model=MoodEntryList)
async def list_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(
        select(func.count()).select_from(MoodEntry).where(MoodEntry.user_id == user.id)
    )
    total = count_result.scalar()

    result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.user_id == user.id)
        .order_by(desc(MoodEntry.created_at))
        .offset(skip)
        .limit(limit)
    )
    entries = result.scalars().all()

    return MoodEntryList(
        entries=[_entry_to_response(e) for e in entries],
        total=total,
    )


@router.get("/{entry_id}", response_model=MoodEntryResponse)
async def get_entry(
    entry_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await _get_user_entry(entry_id, user.id, db)
    return _entry_to_response(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await _get_user_entry(entry_id, user.id, db)

    if entry.audio_filename:
        filepath = settings.UPLOAD_DIR / entry.audio_filename
        if filepath.exists():
            filepath.unlink()

    await db.delete(entry)
    await db.commit()


async def _get_user_entry(entry_id: int, user_id: int, db: AsyncSession) -> MoodEntry:
    result = await db.execute(
        select(MoodEntry).where(MoodEntry.id == entry_id, MoodEntry.user_id == user_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado")
    return entry
