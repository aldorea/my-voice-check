import httpx

from app.core.config import settings


async def transcribe_audio(filepath: str) -> str:
    """Transcribe audio file using OpenAI Whisper API."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        with open(filepath, "rb") as audio_file:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                files={"file": (filepath.split("/")[-1], audio_file, "audio/m4a")},
                data={
                    "model": settings.WHISPER_MODEL,
                    "language": "es",
                    "response_format": "text",
                },
            )

    if response.status_code != 200:
        raise Exception(f"Whisper API error: {response.status_code} - {response.text}")

    return response.text.strip()
