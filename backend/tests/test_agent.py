import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.agent.service import _SESSIONS
from tests.test_voice import _make_upload
from app.services.providers.base import ProviderNotConfiguredError, ProviderMalformedResponseError

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_sessions():
    _SESSIONS.clear()

def test_agent_mock_pipeline_success():
    resp = client.post(
        "/api/voice/agent",
        files=[_make_upload()],
        data={"spoken_language": "hi", "assistant_language": "hi", "session_id": "sess1"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ["collecting", "completed"]
    assert data["user"]["language_code"] == "hi"
    assert data["assistant"]["language_code"] == "hi"
    assert "text" in data["assistant"]
    assert "audio_base64" in data["tts"]
    assert data["tts"]["provider"] == "mock"

def test_agent_auto_language_detection():
    resp = client.post(
        "/api/voice/agent",
        files=[_make_upload(b"english")],
        data={"spoken_language": "auto", "session_id": "sess2"}
    )
    assert resp.status_code == 200
    data = resp.json()
    # Mock detects "english" bytes as "en"
    assert data["user"]["language_code"] == "en"
    assert data["assistant"]["language_code"] == "en"

def test_agent_history_maintained():
    client.post(
        "/api/voice/agent",
        files=[_make_upload()],
        data={"spoken_language": "en", "session_id": "sess_hist"}
    )
    assert len(_SESSIONS["sess_hist"].conversation_history) == 2
    client.post(
        "/api/voice/agent",
        files=[_make_upload()],
        data={"spoken_language": "en", "session_id": "sess_hist"}
    )
    assert len(_SESSIONS["sess_hist"].conversation_history) == 4

def test_agent_tts_failure_handled(monkeypatch):
    import app.api.voice
    
    class FailingTTSMockProvider:
        PROVIDER_NAME = "mock"
        async def detect_language(self, *args, **kwargs):
            from app.services.providers.base import LanguageDetectionResult
            return LanguageDetectionResult(language_code="hi", language_name="Hindi", confidence=1.0)
            
        async def transcribe(self, *args, **kwargs):
            from app.services.providers.base import TranscriptionResult
            return TranscriptionResult(original_text="text", language_code="hi", language_name="Hindi", confidence=1.0, provider="mock")
            
        async def synthesize(self, *args, **kwargs):
            raise ProviderMalformedResponseError("TTS broken")
            
    monkeypatch.setattr(app.api.voice, "_get_process_provider", lambda: FailingTTSMockProvider())
    
    resp = client.post(
        "/api/voice/agent",
        files=[_make_upload()],
        data={"spoken_language": "hi", "assistant_language": "hi"}
    )
    assert resp.status_code == 200 # Still returns 200 for agent success
    data = resp.json()
    assert data["tts"]["provider"] == "failed"
    assert "broken" in data["tts"]["error"]

def test_agent_groq_failure_handled(monkeypatch):
    import app.api.voice
    
    async def failing_agent(*args, **kwargs):
        raise RuntimeError("Groq down")
        
    class FailingAgent:
        generate_response = failing_agent
        
    monkeypatch.setattr(app.api.voice, "get_agent_service", lambda: FailingAgent())
    
    resp = client.post(
        "/api/voice/agent",
        files=[_make_upload()],
        data={"spoken_language": "hi"}
    )
    assert resp.status_code == 500
    assert resp.json()["error_code"] == "AGENT_ERROR"

def test_backward_compatibility_pipeline():
    resp = client.post(
        "/api/pipeline",
        files=[_make_upload()],
        data={"language_code": "hi"}
    )
    assert resp.status_code == 200
    assert "livelihood_profile" in resp.json()
