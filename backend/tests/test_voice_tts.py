import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.providers.base import ProviderNotConfiguredError, ProviderAuthenticationError, ProviderTimeoutError, ProviderMalformedResponseError

client = TestClient(app)

def test_synthesize_success():
    # Will use the mock provider because of conftest.py
    resp = client.post(
        "/api/voice/synthesize",
        json={"text": "Hello", "language_code": "en"}
    )
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == "audio/wav"
    assert resp.headers["X-Status"] == "success"
    assert resp.headers["X-Provider"] == "mock"
    assert resp.headers["X-Language-Code"] == "en"
    assert resp.content == b"mock_audio"

def test_synthesize_empty_text():
    resp = client.post(
        "/api/voice/synthesize",
        json={"text": "   ", "language_code": "en"}
    )
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "EMPTY_TEXT"

def test_synthesize_provider_not_configured(monkeypatch):
    import app.api.voice
    async def mock_synth(*args, **kwargs):
        raise ProviderNotConfiguredError("Not configured")
        
    class MockProvider:
        PROVIDER_NAME = "mock"
        synthesize = mock_synth
        
    monkeypatch.setattr(app.api.voice, "_get_process_provider", lambda: MockProvider())
    
    resp = client.post("/api/voice/synthesize", json={"text": "test", "language_code": "hi"})
    assert resp.status_code == 503
    assert resp.json()["error_code"] == "PROVIDER_NOT_CONFIGURED"

def test_synthesize_provider_auth_error(monkeypatch):
    import app.api.voice
    async def mock_synth(*args, **kwargs):
        raise ProviderAuthenticationError("Auth failed")
        
    class MockProvider:
        PROVIDER_NAME = "mock"
        synthesize = mock_synth
        
    monkeypatch.setattr(app.api.voice, "_get_process_provider", lambda: MockProvider())
    
    resp = client.post("/api/voice/synthesize", json={"text": "test", "language_code": "hi"})
    assert resp.status_code == 502
    assert resp.json()["error_code"] == "PROVIDER_AUTHENTICATION_FAILURE"

def test_synthesize_provider_timeout_error(monkeypatch):
    import app.api.voice
    async def mock_synth(*args, **kwargs):
        raise ProviderTimeoutError("Timeout")
        
    class MockProvider:
        PROVIDER_NAME = "mock"
        synthesize = mock_synth
        
    monkeypatch.setattr(app.api.voice, "_get_process_provider", lambda: MockProvider())
    
    resp = client.post("/api/voice/synthesize", json={"text": "test", "language_code": "hi"})
    assert resp.status_code == 504
    assert resp.json()["error_code"] == "PROVIDER_TIMEOUT"

def test_synthesize_provider_malformed_error(monkeypatch):
    import app.api.voice
    async def mock_synth(*args, **kwargs):
        raise ProviderMalformedResponseError("Malformed")
        
    class MockProvider:
        PROVIDER_NAME = "mock"
        synthesize = mock_synth
        
    monkeypatch.setattr(app.api.voice, "_get_process_provider", lambda: MockProvider())
    
    resp = client.post("/api/voice/synthesize", json={"text": "test", "language_code": "hi"})
    assert resp.status_code == 502
    assert resp.json()["error_code"] == "PROVIDER_MALFORMED_RESPONSE"

import pytest
from unittest.mock import AsyncMock, patch
from app.services.providers.bhashini_provider import BhashiniLanguageProvider

@pytest.mark.asyncio
async def test_bhashini_tts_payload_structure(monkeypatch):
    monkeypatch.setenv("BHASHINI_ENABLED", "true")
    monkeypatch.setenv("BHASHINI_API_URL", "http://fake")
    monkeypatch.setenv("BHASHINI_API_KEY", "fake-key")
    monkeypatch.setenv("BHASHINI_TTS_SERVICE_ID", "Bhashini/IITM/TTS")

    provider = BhashiniLanguageProvider()

    mock_make_api_call = AsyncMock()
    mock_make_api_call.return_value = {
        "pipelineResponse": [
            {
                "audio": [
                    {
                        "audioContent": "ZmFrZV9hdWRpbw==" # "fake_audio" in base64
                    }
                ]
            }
        ]
    }

    with patch.object(provider, '_make_api_call', mock_make_api_call):
        result = await provider.synthesize("नमस्कार", "hi")
        
        # Verify the mock returned the decoded bytes
        assert result == b"fake_audio"
        
        # Verify the exact payload shape
        mock_make_api_call.assert_called_once()
        payload = mock_make_api_call.call_args[0][0]
        
        assert payload == {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {
                            "sourceLanguage": "hi"
                        },
                        "serviceId": "Bhashini/IITM/TTS",
                        "gender": "female",
                        "samplingRate": 16000
                    }
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": "नमस्कार"
                    }
                ]
            }
        }
