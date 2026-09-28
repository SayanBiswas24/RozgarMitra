"""
app/services/language_detector.py
───────────────────────────────────
Language detection interface and BHASHINI-backed implementation stub.

Architecture:
  LanguageDetector (abstract interface)
    └── BhashiniLanguageDetector  (BHASHINI Audio Language Detection API)

The interface is intentionally thin: detect(audio_bytes, mime_type) → LanguageDetectionResult.
This allows the API route to remain unchanged when a different backend is plugged in.

Supported language codes (ISO-639):
  hi  – Hindi
  bn  – Bengali
  bho – Bhojpuri
  mai – Maithili
  sat – Santali
  en  – English
  (extensible via provider configuration; no code-path branching per language)

Mixed-language (code-switching) notes:
  BHASHINI's Audio Language Detection returns a single dominant language code.
  The transcript is always preserved verbatim, so code-switched utterances like
  "Hum farming karte hain aur tractor repair bhi karta hoon."
  are handled correctly at the ASR layer even when detection returns 'hi'.
  Future enhancement: multi-label language detection can be wired in here.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Result dataclass
# ─────────────────────────────────────────────────────────────────────────────

# Language display names by ISO-639 code.
# Extend this dict as new languages are on-boarded; no code-path changes needed.
_LANGUAGE_NAMES: dict[str, str] = {
    "hi": "Hindi",
    "bn": "Bengali",
    "bho": "Bhojpuri",
    "mai": "Maithili",
    "sat": "Santali",
    "en": "English",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "or": "Odia",
    "as": "Assamese",
    "ur": "Urdu",
    "kok": "Konkani",
    "mni": "Manipuri",
    "ks": "Kashmiri",
    "ne": "Nepali",
    "sd": "Sindhi",
    "doi": "Dogri",
}


@dataclass
class LanguageDetectionResult:
    """Result returned by any LanguageDetector implementation."""

    language_code: str
    language_name: Optional[str]
    confidence: Optional[float]


# ─────────────────────────────────────────────────────────────────────────────
# Abstract interface
# ─────────────────────────────────────────────────────────────────────────────


class LanguageDetector(ABC):
    """
    Abstract interface for audio language detection.

    Implementations must not assume English as the intermediate or default language.
    """

    @abstractmethod
    async def detect(
        self,
        audio_bytes: bytes,
        mime_type: str,
        hint_language_code: Optional[str] = None,
    ) -> LanguageDetectionResult:
        """
        Detect the spoken language in `audio_bytes`.

        Args:
            audio_bytes:        Raw bytes of the audio file.
            mime_type:          MIME type of the audio (e.g. 'audio/wav').
            hint_language_code: Optional ISO-639 code supplied by the caller
                                when the language is already known (e.g. from
                                user profile). Implementations may use this as
                                a prior or bypass detection entirely.

        Returns:
            LanguageDetectionResult with a language_code, optional name,
            and optional confidence. Confidence is None when not available.
        """


# ─────────────────────────────────────────────────────────────────────────────
# BHASHINI implementation stub
# ─────────────────────────────────────────────────────────────────────────────


class BhashiniLanguageDetector(LanguageDetector):
    """
    Language detector backed by BHASHINI Audio Language Detection API.

    BHASHINI API reference:
      https://dibd-bhashini.gitbook.io/bhashini-apis/audio-language-detection-compute-call

    ┌──────────────────────────────────────────────────────────────────────────┐
    │  HOW TO COMPLETE THIS INTEGRATION                                        │
    │                                                                          │
    │  1. Obtain credentials from https://bhashini.gov.in/ and populate .env: │
    │       BHASHINI_USER_ID=<your-user-id>                                   │
    │       BHASHINI_ULCA_API_KEY=<your-ulca-api-key>                         │
    │       BHASHINI_PIPELINE_ID=<pipeline-id-supporting-language-detection>  │
    │                                                                          │
    │  2. Implement the Pipeline Config call:                                  │
    │       POST BHASHINI_CONFIG_URL                                           │
    │       Headers: {"userID": user_id, "ulcaApiKey": ulca_api_key}          │
    │       Body:    {"pipelineId": pipeline_id,                               │
    │                 "taskSequence": [{"taskType": "audio-lang-detection",    │
    │                                   "config": {"language":                 │
    │                                       {"sourceLanguage": ""}}}]}         │
    │       → Returns: callbackUrl, inferenceApiKey                           │
    │                                                                          │
    │  3. Implement the Pipeline Compute call:                                 │
    │       POST <callbackUrl>                                                 │
    │       Headers: {"Authorization": inferenceApiKey}                        │
    │       Body:    base64-encoded audio + task configuration                 │
    │       → Returns: detected language code                                  │
    │                                                                          │
    │  4. Replace the NotImplementedError raise below with the real calls.    │
    └──────────────────────────────────────────────────────────────────────────┘

    Current status: STUB — raises ProviderUnavailableError.
    """

    def __init__(self, settings=None) -> None:
        from app.config import get_settings
        self._settings = settings or get_settings()

    async def detect(
        self,
        audio_bytes: bytes,
        mime_type: str,
        hint_language_code: Optional[str] = None,
    ) -> LanguageDetectionResult:
        # ── Shortcut: caller already knows the language ────────────────────────
        if hint_language_code:
            logger.info(
                "language_detector: using caller-supplied hint '%s'",
                hint_language_code,
            )
            return LanguageDetectionResult(
                language_code=hint_language_code,
                language_name=_LANGUAGE_NAMES.get(hint_language_code),
                confidence=None,
            )

        # ── BHASHINI configuration check ───────────────────────────────────────
        if not self._settings.is_bhashini_configured():
            logger.warning(
                "language_detector: BHASHINI credentials not configured; "
                "set BHASHINI_USER_ID, BHASHINI_ULCA_API_KEY, BHASHINI_PIPELINE_ID"
            )
            raise LanguageDetectionError(
                "Language detection provider is not configured. "
                "Please contact the system administrator."
            )

        # ── TODO: implement actual BHASHINI API call ───────────────────────────
        # See the integration guide in the docstring above.
        logger.error(
            "language_detector: BHASHINI Audio Language Detection API not yet implemented"
        )
        raise ProviderUnavailableError(
            "Audio language detection is not yet integrated. "
            "The BHASHINI API stub is ready for implementation."
        )


# ─────────────────────────────────────────────────────────────────────────────
# Helper: resolve a language code to its display name
# ─────────────────────────────────────────────────────────────────────────────


def language_name_for_code(code: str) -> Optional[str]:
    """Return the human-readable English name for an ISO-639 code, or None."""
    return _LANGUAGE_NAMES.get(code)


# ─────────────────────────────────────────────────────────────────────────────
# Exceptions
# ─────────────────────────────────────────────────────────────────────────────


class LanguageDetectionError(Exception):
    """Raised when language detection fails (non-transient)."""


class ProviderUnavailableError(Exception):
    """Raised when the provider is unreachable or not configured."""
