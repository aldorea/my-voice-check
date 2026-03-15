import json

import httpx

from app.core.config import settings

MOOD_LABELS = {1: "Muy mal", 2: "Mal", 3: "Normal", 4: "Bien", 5: "Muy bien"}

SYSTEM_PROMPT = """Eres un psicólogo clínico con más de 15 años de experiencia en salud mental \
y bienestar emocional. Tu rol es analizar los registros emocionales de un paciente desde una \
perspectiva profesional, empática y basada en evidencia.

Tu análisis debe ser:
- Profesional pero accesible (que el paciente lo entienda)
- Empático y sin juicios
- Basado en técnicas de psicología cognitivo-conductual (TCC)
- Con enfoque en patrones emocionales y factores desencadenantes
- Orientado a ofrecer herramientas prácticas

IMPORTANTE: No eres un sustituto de terapia profesional. Siempre recomienda consultar \
con un profesional de salud mental cuando detectes señales de alarma.

Responde SIEMPRE en formato JSON con esta estructura exacta:
{
  "emotional_state": "Descripción profesional del estado emocional actual del paciente",
  "professional_analysis": "Análisis detallado desde la perspectiva de un psicólogo clínico. Incluye posibles factores desencadenantes, mecanismos de afrontamiento observados, y contexto emocional",
  "recommendations": "3-5 recomendaciones prácticas y personalizadas basadas en TCC y psicología positiva",
  "risk_level": "bajo|medio|alto",
  "patterns_detected": "Patrones emocionales, cognitivos o conductuales observados. Si es un solo registro, menciona lo que se puede inferir"
}"""


async def analyze_single_entry(
    mood_value: int,
    text: str | None,
    transcription: str | None,
) -> dict:
    """Analyze a single mood entry from a professional psychology perspective."""
    content_parts = [
        f"**Estado de ánimo reportado:** {MOOD_LABELS.get(mood_value, 'Desconocido')} ({mood_value}/5)"
    ]

    if text:
        content_parts.append(f"**Nota escrita por el paciente:** \"{text}\"")

    if transcription:
        content_parts.append(f"**Transcripción de nota de voz:** \"{transcription}\"")

    if not text and not transcription:
        content_parts.append("El paciente no proporcionó detalles adicionales, solo el nivel de ánimo.")

    user_message = (
        "Analiza el siguiente registro emocional de un paciente:\n\n"
        + "\n\n".join(content_parts)
        + "\n\nProporciona tu análisis profesional."
    )

    return await _call_claude(user_message)


async def analyze_period(entries: list[dict], period: str) -> dict:
    """Analyze multiple mood entries over a period (daily/weekly)."""
    entries_text = []
    for i, entry in enumerate(entries, 1):
        parts = [f"  - Ánimo: {MOOD_LABELS.get(entry['mood_value'], '?')} ({entry['mood_value']}/5)"]
        parts.append(f"  - Fecha: {entry['created_at']}")
        if entry.get("text"):
            parts.append(f"  - Nota: \"{entry['text']}\"")
        if entry.get("transcription"):
            parts.append(f"  - Voz: \"{entry['transcription']}\"")
        entries_text.append(f"Registro {i}:\n" + "\n".join(parts))

    mood_values = [e["mood_value"] for e in entries]
    avg_mood = sum(mood_values) / len(mood_values) if mood_values else 0

    user_message = (
        f"Analiza los siguientes {len(entries)} registros emocionales del paciente "
        f"durante el período {period}:\n\n"
        + "\n\n".join(entries_text)
        + f"\n\n**Promedio de ánimo del período:** {avg_mood:.1f}/5"
        + f"\n**Rango:** {min(mood_values)}/5 - {max(mood_values)}/5"
        + "\n\nProporciona un análisis profesional del período completo, identificando "
        "tendencias, patrones y evolución emocional."
    )

    return await _call_claude(user_message)


async def _call_claude(user_message: str) -> dict:
    """Call Claude API and return parsed analysis."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": settings.ANTHROPIC_MODEL,
                "max_tokens": 2000,
                "system": SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": user_message}],
            },
        )

    if response.status_code != 200:
        raise Exception(f"Claude API error: {response.status_code} - {response.text}")

    result = response.json()
    text = result["content"][0]["text"]

    # Extract JSON from response (handle markdown code blocks)
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    return json.loads(text.strip())
