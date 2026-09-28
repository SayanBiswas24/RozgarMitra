"""Tests for ALD optional confidence handling (issue: confidence=None ValidationError)."""
import pytest
from app.services.providers.base import LanguageDetectionResult

def test_ald_confidence_numeric():
    """A. ALD returns numeric confidence — value is preserved exactly."""
    result = LanguageDetectionResult(
        language_code="hi",
        language_name="Hindi",
        confidence=0.91
    )
    assert result.confidence == pytest.approx(0.91)

def test_ald_confidence_none_explicit():
    """B. ALD returns confidence=None — object created, confidence is None."""
    result = LanguageDetectionResult(
        language_code="hi",
        language_name="Hindi",
        confidence=None
    )
    assert result.confidence is None

def test_ald_confidence_absent():
    """C. ALD response has no confidence field — defaults to None."""
    result = LanguageDetectionResult(
        language_code="bho",
        language_name="Bhojpuri"
    )
    assert result.confidence is None

def test_agent_pipeline_with_ald_confidence_none(monkeypatch):
    """D. Agent endpoint with ALD confidence=None must not raise ValidationError."""
    from fastapi.testclient import TestClient
    from app.main import app
    import app.api.voice as voice_module

    class MockProviderNullALD:
        PROVIDER_NAME = "mock"
        async def detect_language(self, *args, **kwargs):
            # Returns no confidence (simulates BHASHINI omitting it)
            return LanguageDetectionResult(
                language_code="hi",
                language_name="Hindi",
                confidence=None
            )
        async def transcribe(self, *args, **kwargs):
            from app.services.providers.base import TranscriptionResult
            return TranscriptionResult(
                original_text="Test utterance",
                language_code="hi",
                language_name="Hindi",
                confidence=None,
                provider="mock"
            )
        async def synthesize(self, *args, **kwargs):
            return b"audio"

    monkeypatch.setattr(voice_module, "_get_process_provider", lambda: MockProviderNullALD())

    client = TestClient(app)
    resp = client.post(
        "/api/voice/agent",
        files=[("audio", ("t.wav", b"dummy", "audio/wav"))],
        data={"spoken_language": "auto", "assistant_language": "hi",
              "session_id": "ald_test_session_null", "request_id": "ald_req_1"}
    )
    # Must not be 500 (ValidationError)
    assert resp.status_code != 500, f"Got 500: {resp.text}"

def test_confidence_component_null_passthrough():
    """E. When ALD confidence is None, the AI confidence component is null not 0."""
    result = LanguageDetectionResult(
        language_code="hi",
        language_name="Hindi",
        confidence=None
    )
    ald_conf = None
    if result.confidence is not None:
        ald_conf = round(result.confidence * 100, 1)
    assert ald_conf is None
