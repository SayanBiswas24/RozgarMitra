import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch, AsyncMock

client = TestClient(app)

def test_transliterate_mock():
    resp = client.post(
        "/api/voice/transliterate",
        json={"text": "मैं किसान हूँ", "source_language": "hi", "target_language": "en"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["original_text"] == "मैं किसान हूँ"
    assert data["transliterated_text"] == "main kisan hoon"
    assert data["provider"] == "mock"

def test_transliterate_empty_text():
    resp = client.post(
        "/api/voice/transliterate",
        json={"text": "  ", "source_language": "hi", "target_language": "en"}
    )
    assert resp.status_code == 200
    assert resp.json()["transliterated_text"] == ""

@pytest.mark.asyncio
async def test_bhashini_payload_transliteration(monkeypatch):
    from app.services.providers.bhashini_provider import BhashiniLanguageProvider
    monkeypatch.setenv("BHASHINI_ENABLED", "true")
    monkeypatch.setenv("BHASHINI_API_URL", "http://fake")
    monkeypatch.setenv("BHASHINI_API_KEY", "fake-key")
    monkeypatch.setenv("BHASHINI_TRANSLITERATION_SERVICE_ID", "fake-tl")

    provider = BhashiniLanguageProvider()

    mock_api = AsyncMock()
    mock_api.return_value = {
        "pipelineResponse": [
            {
                "output": [
                    {
                        "target": "main kisan hoon"
                    }
                ]
            }
        ]
    }

    with patch.object(provider, '_make_api_call', mock_api):
        res = await provider.transliterate("मैं किसान हूँ", "hi", "en")
        assert res == "main kisan hoon"
        
        payload = mock_api.call_args[0][0]
        assert payload["pipelineTasks"][0]["taskType"] == "transliteration"
        assert payload["pipelineTasks"][0]["config"]["language"]["sourceLanguage"] == "hi"
        assert payload["pipelineTasks"][0]["config"]["language"]["targetLanguage"] == "en"
        assert payload["pipelineTasks"][0]["config"]["serviceId"] == "fake-tl"
        assert payload["inputData"]["input"][0]["source"] == "मैं किसान हूँ"

def test_transliterate_missing_service_id(monkeypatch):
    import app.api.voice
    from app.services.providers.base import ProviderNotConfiguredError
    
    class FailingTLProvider:
        PROVIDER_NAME = "mock"
        async def transliterate(self, *args, **kwargs):
            raise ProviderNotConfiguredError("Missing config")
            
    monkeypatch.setattr(app.api.voice, "_get_process_provider", lambda: FailingTLProvider())
    
    resp = client.post(
        "/api/voice/transliterate",
        json={"text": "मैं किसान हूँ", "source_language": "hi", "target_language": "en"}
    )
    assert resp.status_code == 503
    assert resp.json()["error_code"] == "PROVIDER_NOT_CONFIGURED"
