import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch, AsyncMock

client = TestClient(app)

def test_translate_mock():
    resp = client.post(
        "/api/voice/translate",
        json={"text": "Hello", "source_language": "hi", "target_language": "en"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["original_text"] == "Hello"
    assert data["translated_text"] == "Mock translation of 'Hello' from hi to en"
    assert data["provider"] == "mock"

def test_translate_same_language():
    resp = client.post(
        "/api/voice/translate",
        json={"text": "Hello", "source_language": "en", "target_language": "en"}
    )
    assert resp.status_code == 200
    assert resp.json()["translated_text"] == "Hello"

def test_translate_empty_text():
    resp = client.post(
        "/api/voice/translate",
        json={"text": "  ", "source_language": "hi", "target_language": "en"}
    )
    assert resp.status_code == 200
    assert resp.json()["translated_text"] == ""

@pytest.mark.asyncio
async def test_bhashini_payload(monkeypatch):
    from app.services.providers.bhashini_provider import BhashiniLanguageProvider
    monkeypatch.setenv("BHASHINI_ENABLED", "true")
    monkeypatch.setenv("BHASHINI_API_URL", "http://fake")
    monkeypatch.setenv("BHASHINI_API_KEY", "fake-key")
    monkeypatch.setenv("BHASHINI_NMT_SERVICE_ID", "fake-nmt")

    provider = BhashiniLanguageProvider()

    mock_api = AsyncMock()
    mock_api.return_value = {
        "pipelineResponse": [
            {
                "output": [
                    {
                        "target": "I am a farmer."
                    }
                ]
            }
        ]
    }

    with patch.object(provider, '_make_api_call', mock_api):
        res = await provider.translate("मैं किसान हूँ।", "hi", "en")
        assert res == "I am a farmer."
        
        payload = mock_api.call_args[0][0]
        assert payload["pipelineTasks"][0]["taskType"] == "translation"
        assert payload["pipelineTasks"][0]["config"]["language"]["sourceLanguage"] == "hi"
        assert payload["pipelineTasks"][0]["config"]["language"]["targetLanguage"] == "en"
        assert payload["pipelineTasks"][0]["config"]["serviceId"] == "fake-nmt"
        assert payload["inputData"]["input"][0]["source"] == "मैं किसान हूँ।"
