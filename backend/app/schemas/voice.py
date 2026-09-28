"""
app/schemas/voice.py
────────────────────
Pydantic models for the voice transcription API.

Design principles:
  - All nullable fields default to None (never invent values).
  - The original transcript is always preserved as-is (no forced English pivot).
  - Language is represented by an ISO-639 code, not a human assumption.
  - The schema is intentionally forward-compatible: downstream consumers
    receive the same envelope regardless of which ASR provider ran.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Sub-models
# ─────────────────────────────────────────────────────────────────────────────


class LanguageInfo(BaseModel):
    """Detected or supplied language information."""

    code: str = Field(
        ...,
        description="ISO-639 language code, e.g. 'hi', 'bn', 'bho', 'mai', 'sat', 'en'.",
        examples=["hi"],
    )
    name: Optional[str] = Field(
        None,
        description="Human-readable language name in English.",
        examples=["Hindi"],
    )
    confidence: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Detection confidence in [0, 1]. Null when unavailable.",
    )


class TranscriptInfo(BaseModel):
    """ASR output."""

    original: str = Field(
        ...,
        description=(
            "Raw transcript exactly as returned by the ASR provider, "
            "in the source language script. Never transliterated or translated."
        ),
        examples=["मैं खेती करता हूं।"],
    )
    normalized: Optional[str] = Field(
        None,
        description=(
            "Lightly normalised transcript (punctuation, whitespace). "
            "Null if not performed."
        ),
    )


class AudioInfo(BaseModel):
    """Metadata about the uploaded audio."""

    duration_seconds: Optional[float] = Field(
        None,
        description="Duration of the audio clip in seconds. Null if not measured.",
    )
    mime_type: str = Field(
        ...,
        description="MIME type of the uploaded file as reported by the client.",
        examples=["audio/wav"],
    )
    size_bytes: Optional[int] = Field(
        None,
        description="File size in bytes. Null if not measured.",
    )


class ASRProviderInfo(BaseModel):
    """Metadata about the ASR backend that produced the transcript."""

    provider: str = Field(
        ...,
        description="Identifier of the ASR provider used.",
        examples=["bhashini"],
    )
    model: Optional[str] = Field(
        None,
        description="Model or service ID used by the provider. Null if unknown.",
    )
    confidence: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Overall ASR confidence returned by the provider. Null if unavailable.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Top-level response
# ─────────────────────────────────────────────────────────────────────────────


class TranscribeResponse(BaseModel):
    """
    Structured response from POST /api/voice/transcribe.

    All nullable fields are explicitly null rather than omitted,
    so downstream consumers can always rely on the same JSON shape.
    """

    success: bool = Field(..., description="True when transcription succeeded.")
    language: LanguageInfo
    transcript: TranscriptInfo
    audio: AudioInfo
    asr: ASRProviderInfo

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "success": True,
                    "language": {"code": "hi", "name": "Hindi", "confidence": None},
                    "transcript": {
                        "original": "मैं खेती करता हूं।",
                        "normalized": None,
                    },
                    "audio": {
                        "duration_seconds": None,
                        "mime_type": "audio/wav",
                        "size_bytes": 204800,
                    },
                    "asr": {
                        "provider": "bhashini",
                        "model": None,
                        "confidence": None,
                    },
                }
            ]
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# Error response (returned for 4xx / 5xx)
# ─────────────────────────────────────────────────────────────────────────────


class ErrorDetail(BaseModel):
    """Standard error envelope. Internal details (keys, traces) are never included."""

    success: bool = Field(False, description="Always false for error responses.")
    error_code: str = Field(
        ...,
        description="Machine-readable error code.",
        examples=["UNSUPPORTED_AUDIO_FORMAT"],
    )
    message: str = Field(
        ...,
        description="Human-readable explanation safe to show to API consumers.",
        examples=["The uploaded file type is not supported."],
    )

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 Process Response Models
# ─────────────────────────────────────────────────────────────────────────────

from typing import List
from datetime import datetime

class ProcessLanguageInfo(BaseModel):
    code: str
    name: str
    confidence: float

class ProcessTranscriptInfo(BaseModel):
    original_text: str
    provider: str

class ProcessProcessingInfo(BaseModel):
    language_mode: str

class ProcessResponse(BaseModel):
    request_id: str
    status: str
    language: ProcessLanguageInfo
    transcript: ProcessTranscriptInfo
    processing: ProcessProcessingInfo

class Transcript(BaseModel):
    original_text: str
    language_code: str
    language_name: str
    confidence: float
    provider: str
    request_id: Optional[str] = None
    timestamp: Optional[datetime] = None
