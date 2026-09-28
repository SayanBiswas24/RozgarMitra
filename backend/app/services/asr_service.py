"""
app/services/asr_service.py
────────────────────────────
ASR (Automatic Speech Recognition) interface and BHASHINI implementation stub.

Architecture:
  ASRService (abstract interface)
    └── BhashiniASRService  (BHASHINI Pipeline Config + Compute calls)

Key design decisions:
  - No English pivot: audio is sent directly to the provider with the source
    language code; the returned transcript is in the original script.
  - Code-switching support: mixed-language audio (e.g. Hindi + English)
    is not rejected. The transcript is preserved verbatim.
  - Provider abstraction: replacing BHASHINI with another provider requires
    only a new class implementing ASRService.

BHASHINI two-step flow (to be implemented):
  Step 1 – Pipeline Config call
    POST https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline
    Headers: {"userID": ..., "ulcaApiKey": ...}
    Body:    {"pipelineId": ..., "taskSequence": [{"taskType": "asr",
              "config": {"language": {"sourceLanguage": "<iso639-code>"}}}]}
    Returns: {"pipelineInferenceAPIEndPoint": {"callbackUrl": ...,
               "inferenceApiKey": {"name": ..., "value": ...}},
              "pipelineResponseConfig": [...]}

  Step 2 – Pipeline Compute call
    POST <callbackUrl>
    Headers: {"Authorization": <inferenceApiKey.value>}
    Body:    {"pipelineId": ..., "inputData": {"audio": [{"audioContent":
               "<base64-encoded-bytes>"}]},
              "taskSequence": [...]}
    Returns: {"pipelineResponse": {"output": [{"source": "<transcript>"}]}}
"""

from __future__ import annotations

import base64
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Result dataclass
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class ASRResult:
    """Result returned by any ASRService implementation."""

    transcript: str                    # Original-language, original-script text
    provider: str                      # e.g. "bhashini"
    model: Optional[str]               # Service/model ID from the provider
    confidence: Optional[float]        # Provider confidence; None if unavailable


# ─────────────────────────────────────────────────────────────────────────────
# Abstract interface
# ─────────────────────────────────────────────────────────────────────────────


class ASRService(ABC):
    """
    Abstract interface for Automatic Speech Recognition.

    Rules for implementations:
      - MUST return the transcript in the original language and script.
      - MUST NOT translate or transliterate the transcript.
      - MUST NOT reject audio due to mixed-language content (code-switching).
      - MUST NOT log audio bytes or credentials.
    """

    @abstractmethod
    async def transcribe(
        self,
        audio_bytes: bytes,
        language_code: str,
        mime_type: str,
    ) -> ASRResult:
        """
        Transcribe `audio_bytes` and return an ASRResult.

        Args:
            audio_bytes:   Raw bytes of the audio file.
            language_code: ISO-639 code of the spoken language (e.g. 'hi', 'bn').
                           Determined by the caller (from LanguageDetector or
                           user-supplied hint). NEVER assumed to be English.
            mime_type:     MIME type hint for the provider.

        Returns:
            ASRResult with the original transcript and provider metadata.

        Raises:
            ASRError:                  Non-retryable transcription failure.
            ProviderUnavailableError:  Provider unreachable or not configured.
            AuthenticationError:       Credentials rejected by the provider.
            ProviderTimeoutError:      Provider did not respond in time.
        """


# ─────────────────────────────────────────────────────────────────────────────
# BHASHINI implementation stub
# ─────────────────────────────────────────────────────────────────────────────


class BhashiniASRService(ASRService):
    """
    ASR backed by the BHASHINI ULCA Pipeline API.

    BHASHINI API reference:
      https://dibd-bhashini.gitbook.io/bhashini-apis/pipeline-config-call
      https://dibd-bhashini.gitbook.io/bhashini-apis/pipeline-compute-call

    ┌──────────────────────────────────────────────────────────────────────────┐
    │  HOW TO COMPLETE THIS INTEGRATION                                        │
    │                                                                          │
    │  Step 1 – Pipeline Config call (run once per language / per session):   │
    │    import httpx, base64                                                  │
    │    async with httpx.AsyncClient(timeout=settings.bhashini_timeout) as c:│
    │      resp = await c.post(                                                │
    │          settings.bhashini_config_url,                                  │
    │          headers={"userID": settings.bhashini_user_id,                  │
    │                   "ulcaApiKey": settings.bhashini_ulca_api_key},        │
    │          json={"pipelineId": settings.bhashini_pipeline_id,             │
    │                "taskSequence": [{"taskType": "asr",                      │
    │                  "config": {"language":                                  │
    │                    {"sourceLanguage": language_code}}}]},               │
    │      )                                                                   │
    │    resp.raise_for_status()                                               │
    │    config_data = resp.json()                                             │
    │    callback_url = config_data["pipelineInferenceAPIEndPoint"]            │
    │                              ["callbackUrl"]                             │
    │    inference_key = config_data["pipelineInferenceAPIEndPoint"]           │
    │                               ["inferenceApiKey"]["value"]              │
    │    service_id = config_data["pipelineResponseConfig"][0]                │
    │                            ["config"][0]["serviceId"]                   │
    │                                                                          │
    │  Step 2 – Pipeline Compute call:                                         │
    │    audio_b64 = base64.b64encode(audio_bytes).decode()                   │
    │    async with httpx.AsyncClient(timeout=settings.bhashini_timeout) as c:│
    │      resp = await c.post(                                                │
    │          callback_url,                                                   │
    │          headers={"Authorization": inference_key},                       │
    │          json={"pipelineId": settings.bhashini_pipeline_id,             │
    │                "inputData": {"audio": [{"audioContent": audio_b64}]},   │
    │                "taskSequence": [{"taskType": "asr",                      │
    │                  "config": {"serviceId": service_id,                     │
    │                             "language":                                  │
    │                               {"sourceLanguage": language_code},         │
    │                             "audioFormat": "wav",                        │
    │                             "samplingRate": 16000}}]},                  │
    │      )                                                                   │
    │    resp.raise_for_status()                                               │
    │    transcript = (resp.json()["pipelineResponse"]["output"]               │
    │                             [0]["source"])                               │
    │    return ASRResult(transcript=transcript,                               │
    │                     provider="bhashini",                                 │
    │                     model=service_id, confidence=None)                  │
    │                                                                          │
    │  Replace the NotImplementedError raise below with the above logic.      │
    │  httpx is already in requirements.txt.                                   │
    └──────────────────────────────────────────────────────────────────────────┘

    Current status: STUB — raises ProviderUnavailableError.
    """

    PROVIDER_NAME = "bhashini"

    def __init__(self, settings=None) -> None:
        from app.config import get_settings
        self._settings = settings or get_settings()

    async def transcribe(
        self,
        audio_bytes: bytes,
        language_code: str,
        mime_type: str,
    ) -> ASRResult:
        # ── BHASHINI configuration check ───────────────────────────────────────
        if not self._settings.is_bhashini_configured():
            logger.warning(
                "asr_service: BHASHINI credentials not configured; "
                "set BHASHINI_USER_ID, BHASHINI_ULCA_API_KEY, BHASHINI_PIPELINE_ID"
            )
            raise ProviderUnavailableError(
                "ASR provider is not configured. "
                "Please contact the system administrator."
            )

        # ── TODO: implement actual BHASHINI Pipeline Config + Compute calls ────
        # See the integration guide in the docstring above.
        # base64 and httpx are imported at the top of this file.
        logger.error(
            "asr_service: BHASHINI ASR API not yet implemented "
            "(language_code=%s, mime_type=%s, size=%d bytes)",
            language_code,
            mime_type,
            len(audio_bytes),
        )
        raise ProviderUnavailableError(
            "ASR transcription is not yet integrated. "
            "The BHASHINI API stub is ready for implementation."
        )


# ─────────────────────────────────────────────────────────────────────────────
# Exceptions
# ─────────────────────────────────────────────────────────────────────────────


class ASRError(Exception):
    """Non-retryable ASR failure (e.g. unrecognised audio content)."""


class ProviderUnavailableError(Exception):
    """Provider is unreachable, not configured, or returning 5xx errors."""


class AuthenticationError(Exception):
    """Provider rejected the credentials — do NOT include the key in the message."""


class ProviderTimeoutError(Exception):
    """Provider did not respond within the configured timeout."""
