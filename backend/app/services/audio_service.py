"""
app/services/audio_service.py
──────────────────────────────
Audio validation and lightweight processing utilities.

Responsibilities:
  - Validate that the uploaded UploadFile is present and non-empty.
  - Check MIME type against the configured allow-list.
  - Enforce maximum file size.
  - Read the raw bytes once and return them (no disk persistence in this stage).

Security notes:
  - Audio bytes are never written to disk permanently.
  - File content is NOT logged.
  - MIME type comes from the client header; treat it as a hint, not a guarantee.
    A future enhancement can add magic-byte validation (e.g. python-magic).
"""

from __future__ import annotations

import logging

import tempfile
import os
import subprocess

def convert_to_wav_if_needed(audio_bytes: bytes, mime_type: str) -> bytes:
    if mime_type in ["audio/wav", "audio/x-wav", "audio/wave"] and len(audio_bytes) > 0:
        return audio_bytes

    with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as f_in:
        f_in.write(audio_bytes)
        in_path = f_in.name
    out_path = in_path + ".wav"

    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", in_path, "-ar", "16000", "-ac", "1", "-f", "wav", out_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        if result.returncode != 0:
            raise RuntimeError("Audio conversion failed: ffmpeg returned non-zero exit code (format unsupported or file corrupt).")
        
        with open(out_path, "rb") as f_out:
            converted = f_out.read()
        return converted
    except FileNotFoundError:
        raise RuntimeError("Audio conversion failed: ffmpeg is not installed.")
    finally:
        if os.path.exists(in_path):
            os.remove(in_path)
        if os.path.exists(out_path):
            os.remove(out_path)

from dataclasses import dataclass
from typing import Optional

from fastapi import UploadFile

from app.config import get_settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Result dataclass
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class AudioValidationResult:
    """Outcome of audio file validation."""

    is_valid: bool
    error_code: Optional[str]
    error_message: Optional[str]
    # Set only when valid:
    audio_bytes: Optional[bytes] = None
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None


# ─────────────────────────────────────────────────────────────────────────────
# Service
# ─────────────────────────────────────────────────────────────────────────────


class AudioService:
    """Validates and reads audio upload files."""

    def __init__(self) -> None:
        self._settings = get_settings()

    async def validate_and_read(self, file: Optional[UploadFile]) -> AudioValidationResult:
        """
        Validate the uploaded audio file and return its bytes.

        Steps:
          1. Presence check.
          2. MIME type check.
          3. Read bytes.
          4. Empty content check.
          5. File size check.

        Returns an AudioValidationResult. The caller is responsible for
        checking `is_valid` before proceeding.
        """
        # 1 — Presence
        if file is None or not file.filename:
            logger.warning("audio_service: no file provided")
            return AudioValidationResult(
                is_valid=False,
                error_code="MISSING_AUDIO_FILE",
                error_message="No audio file was provided. "
                "Upload an audio file using multipart/form-data with the field name 'audio'.",
            )

        # 2 — MIME type
        content_type = (file.content_type or "").lower().split(";")[0].strip()
        if content_type not in self._settings.allowed_audio_mime_types:
            logger.warning(
                "audio_service: unsupported MIME type '%s' (filename=%s)",
                content_type,
                file.filename,
            )
            allowed = ", ".join(sorted(self._settings.allowed_audio_mime_types))
            return AudioValidationResult(
                is_valid=False,
                error_code="UNSUPPORTED_AUDIO_FORMAT",
                error_message=(
                    f"The file type '{content_type}' is not supported. "
                    f"Supported formats: {allowed}."
                ),
            )

        # 3 — Read bytes
        try:
            audio_bytes = await file.read()
        except Exception:
            logger.exception("audio_service: failed to read file bytes")
            return AudioValidationResult(
                is_valid=False,
                error_code="INVALID_AUDIO_FILE",
                error_message="The audio file could not be read. The upload may be corrupt.",
            )

        # 4 — Empty content
        size = len(audio_bytes)
        if size == 0:
            logger.warning("audio_service: empty file received (filename=%s)", file.filename)
            return AudioValidationResult(
                is_valid=False,
                error_code="EMPTY_AUDIO_FILE",
                error_message="The uploaded audio file is empty.",
            )

        # Normalize audio to WAV 16k mono if needed
        try:
            audio_bytes = convert_to_wav_if_needed(audio_bytes, content_type)
            content_type = "audio/wav"
            size = len(audio_bytes)
        except Exception as e:
            logger.error(f"Audio conversion error: {e}")
            return AudioValidationResult(
                is_valid=False,
                error_code="AUDIO_CONVERSION_FAILED",
                error_message=str(e),
            )

        # 5 — Size limit
        if size > self._settings.max_audio_size_bytes:
            limit_mb = self._settings.max_audio_size_bytes // (1024 * 1024)
            logger.warning(
                "audio_service: file too large: %d bytes > %d bytes (filename=%s)",
                size,
                self._settings.max_audio_size_bytes,
                file.filename,
            )
            return AudioValidationResult(
                is_valid=False,
                error_code="AUDIO_FILE_TOO_LARGE",
                error_message=(
                    f"Audio file exceeds the maximum allowed size of {limit_mb} MB."
                ),
            )

        logger.info(
            "audio_service: accepted file (mime=%s, size=%d bytes)", content_type, size
        )
        return AudioValidationResult(
            is_valid=True,
            error_code=None,
            error_message=None,
            audio_bytes=audio_bytes,
            mime_type=content_type,
            size_bytes=size,
        )
