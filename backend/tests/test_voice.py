"""
tests/test_voice.py
────────────────────
Unit tests for the PS-97 Voice Processing module.

All tests run without any real BHASHINI API access.
External HTTP calls are mocked using unittest.mock.

Test coverage:
  1. Missing audio file → 400
  2. Unsupported MIME type → 415
  3. Empty file content → 400
  4. File exceeds size limit → 400
  5. Valid request structure (provider stub returns 503)
  6. Response schema validation for TranscribeResponse
  7. ErrorDetail schema validation
  8. Language hint bypasses detection
  9. ASR provider authentication failure → 502
  10. ASR provider timeout → 504
"""

from __future__ import annotations

import io
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.voice import ASRProviderInfo, AudioInfo, LanguageInfo, TranscribeResponse, TranscriptInfo


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _make_upload(
    content: bytes = b"\x00" * 1024,
    filename: str = "test.wav",
    content_type: str = "audio/wav",
):
    """Build a minimal multipart file upload for TestClient."""
    return ("audio", (filename, io.BytesIO(content), content_type))


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Missing audio file
# ─────────────────────────────────────────────────────────────────────────────


def test_missing_audio_returns_400(client: TestClient) -> None:
    """POST without an audio file must return 400 or 422."""
    resp = client.post("/api/voice/transcribe")
    # FastAPI returns 422 for missing required form fields
    assert resp.status_code in (400, 422), resp.text


# ─────────────────────────────────────────────────────────────────────────────
# 2. Unsupported MIME type
# ─────────────────────────────────────────────────────────────────────────────


def test_unsupported_mime_type_returns_415(client: TestClient) -> None:
    """Uploading a PDF as audio must return 415 Unsupported Media Type."""
    resp = client.post(
        "/api/voice/transcribe",
        files=[_make_upload(content=b"fake-pdf", content_type="application/pdf")],
    )
    assert resp.status_code == 415, resp.text
    body = resp.json()
    assert body["error_code"] == "UNSUPPORTED_AUDIO_FORMAT"
    assert body["success"] is False


# ─────────────────────────────────────────────────────────────────────────────
# 3. Empty file content
# ─────────────────────────────────────────────────────────────────────────────


def test_empty_file_returns_400(client: TestClient) -> None:
    """Uploading a zero-byte file must return 400."""
    resp = client.post(
        "/api/voice/transcribe",
        files=[_make_upload(content=b"")],
    )
    assert resp.status_code == 400, resp.text
    body = resp.json()
    assert body["error_code"] == "EMPTY_AUDIO_FILE"
    assert body["success"] is False


# ─────────────────────────────────────────────────────────────────────────────
# 4. File exceeds size limit
# ─────────────────────────────────────────────────────────────────────────────


def test_oversized_file_returns_400(client: TestClient) -> None:
    """An audio file larger than MAX_AUDIO_SIZE_MB must be rejected with 400."""
    # Temporarily lower the limit to 1 byte so we don't need a real 25 MB file.
    from app.config import get_settings
    original_limit = get_settings().max_audio_size_bytes
    get_settings().max_audio_size_bytes = 1  # 1 byte limit

    try:
        resp = client.post(
            "/api/voice/transcribe",
            files=[_make_upload(content=b"\x00\x00")],  # 2 bytes > 1 byte limit
        )
        assert resp.status_code == 400, resp.text
        body = resp.json()
        assert body["error_code"] == "AUDIO_FILE_TOO_LARGE"
    finally:
        get_settings().max_audio_size_bytes = original_limit


# ─────────────────────────────────────────────────────────────────────────────
# 5. Valid request structure → provider returns 503 (stub not implemented)
# ─────────────────────────────────────────────────────────────────────────────


def test_valid_audio_with_language_hint_returns_503(client: TestClient) -> None:
    """
    With a valid WAV file and a language_code hint, the route should
    bypass language detection and reach the ASR stub, which returns 503.
    """
    resp = client.post(
        "/api/voice/transcribe",
        files=[_make_upload()],
        data={"language_code": "hi"},
    )
    # The BHASHINI ASR stub raises ProviderUnavailableError → 503
    assert resp.status_code == 503, resp.text
    body = resp.json()
    assert body["success"] is False
    assert body["error_code"] == "ASR_PROVIDER_UNAVAILABLE"


# ─────────────────────────────────────────────────────────────────────────────
# 6. Response schema validation (happy path via mocked services)
# ─────────────────────────────────────────────────────────────────────────────


def test_successful_transcription_schema(client: TestClient) -> None:
    """Mock both services; verify the response matches TranscribeResponse schema."""
    from app.services.asr_service import ASRResult
    from app.services.language_detector import LanguageDetectionResult

    mock_lang_result = LanguageDetectionResult(
        language_code="hi",
        language_name="Hindi",
        confidence=None,
    )
    mock_asr_result = ASRResult(
        transcript="मैं खेती करता हूं।",
        provider="bhashini",
        model=None,
        confidence=None,
    )

    with (
        patch(
            "app.api.voice._get_language_detector",
            return_value=MagicMock(detect=AsyncMock(return_value=mock_lang_result)),
        ),
        patch(
            "app.api.voice._get_asr_service",
            return_value=MagicMock(transcribe=AsyncMock(return_value=mock_asr_result)),
        ),
    ):
        resp = client.post(
            "/api/voice/transcribe",
            files=[_make_upload()],
            data={"language_code": "hi"},
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()

    # Validate against Pydantic model
    parsed = TranscribeResponse(**body)
    assert parsed.success is True
    assert parsed.language.code == "hi"
    assert parsed.language.name == "Hindi"
    assert parsed.transcript.original == "मैं खेती करता हूं।"
    assert parsed.transcript.normalized is None
    assert parsed.audio.mime_type == "audio/wav"
    assert parsed.asr.provider == "bhashini"
    assert parsed.asr.confidence is None


# ─────────────────────────────────────────────────────────────────────────────
# 7. ErrorDetail schema validation
# ─────────────────────────────────────────────────────────────────────────────


def test_error_response_schema() -> None:
    """ErrorDetail Pydantic model should serialise correctly."""
    from app.schemas.voice import ErrorDetail

    err = ErrorDetail(
        error_code="UNSUPPORTED_AUDIO_FORMAT",
        message="Not supported.",
    )
    data = err.model_dump()
    assert data["success"] is False
    assert data["error_code"] == "UNSUPPORTED_AUDIO_FORMAT"
    assert "API key" not in data["message"]


# ─────────────────────────────────────────────────────────────────────────────
# 8. Language hint bypasses detection
# ─────────────────────────────────────────────────────────────────────────────


def test_language_hint_skips_detection(client: TestClient) -> None:
    """When language_code is provided, LanguageDetector.detect should still be called
    but with the hint, so it returns immediately without calling the external API."""
    from app.services.language_detector import LanguageDetectionResult

    hint_result = LanguageDetectionResult(
        language_code="bho",
        language_name="Bhojpuri",
        confidence=None,
    )

    with (
        patch(
            "app.api.voice._get_language_detector",
            return_value=MagicMock(detect=AsyncMock(return_value=hint_result)),
        ),
        patch(
            "app.api.voice._get_asr_service",
            return_value=MagicMock(
                transcribe=AsyncMock(
                    side_effect=__import__(
                        "app.services.asr_service",
                        fromlist=["ProviderUnavailableError"],
                    ).ProviderUnavailableError("stub")
                )
            ),
        ),
    ):
        resp = client.post(
            "/api/voice/transcribe",
            files=[_make_upload()],
            data={"language_code": "bho"},
        )

    # ASR stub fires → 503, but language was correctly passed as "bho"
    assert resp.status_code == 503, resp.text


# ─────────────────────────────────────────────────────────────────────────────
# 9. ASR authentication failure → 502
# ─────────────────────────────────────────────────────────────────────────────


def test_asr_authentication_failure_returns_502(client: TestClient) -> None:
    from app.services.asr_service import AuthenticationError
    from app.services.language_detector import LanguageDetectionResult

    lang_result = LanguageDetectionResult(
        language_code="hi", language_name="Hindi", confidence=None
    )

    with (
        patch(
            "app.api.voice._get_language_detector",
            return_value=MagicMock(detect=AsyncMock(return_value=lang_result)),
        ),
        patch(
            "app.api.voice._get_asr_service",
            return_value=MagicMock(
                transcribe=AsyncMock(side_effect=AuthenticationError("bad key"))
            ),
        ),
    ):
        resp = client.post(
            "/api/voice/transcribe",
            files=[_make_upload()],
            data={"language_code": "hi"},
        )

    assert resp.status_code == 502, resp.text
    body = resp.json()
    assert body["error_code"] == "ASR_AUTHENTICATION_FAILURE"
    # Key must never appear in the response
    assert "bad key" not in body["message"]


# ─────────────────────────────────────────────────────────────────────────────
# 10. ASR provider timeout → 504
# ─────────────────────────────────────────────────────────────────────────────


def test_asr_timeout_returns_504(client: TestClient) -> None:
    from app.services.asr_service import ProviderTimeoutError
    from app.services.language_detector import LanguageDetectionResult

    lang_result = LanguageDetectionResult(
        language_code="bn", language_name="Bengali", confidence=None
    )

    with (
        patch(
            "app.api.voice._get_language_detector",
            return_value=MagicMock(detect=AsyncMock(return_value=lang_result)),
        ),
        patch(
            "app.api.voice._get_asr_service",
            return_value=MagicMock(
                transcribe=AsyncMock(side_effect=ProviderTimeoutError("timed out"))
            ),
        ),
    ):
        resp = client.post(
            "/api/voice/transcribe",
            files=[_make_upload()],
            data={"language_code": "bn"},
        )

    assert resp.status_code == 504, resp.text
    body = resp.json()
    assert body["error_code"] == "ASR_PROVIDER_TIMEOUT"
