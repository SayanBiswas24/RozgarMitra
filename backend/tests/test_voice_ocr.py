import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch, AsyncMock
import io

client = TestClient(app)

def _make_image(mime="image/jpeg", content=b"fake_image_data"):
    return ("image", ("test.jpg", content, mime))

def test_ocr_mock():
    resp = client.post(
        "/api/voice/ocr",
        files=[_make_image()],
        data={"source_language": "hi"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "Vijay Prasad" in data["text"]
    assert data["provider"] == "mock"

def test_ocr_empty_file():
    resp = client.post(
        "/api/voice/ocr",
        files=[_make_image(content=b"")],
        data={"source_language": "hi"}
    )
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "EMPTY_IMAGE"

def test_ocr_unsupported_mime():
    resp = client.post(
        "/api/voice/ocr",
        files=[_make_image(mime="application/pdf")],
        data={"source_language": "hi"}
    )
    assert resp.status_code == 415
    assert resp.json()["error_code"] == "UNSUPPORTED_IMAGE_FORMAT"

@pytest.mark.asyncio
async def test_bhashini_payload_ocr(monkeypatch):
    from app.services.providers.bhashini_provider import BhashiniLanguageProvider
    monkeypatch.setenv("BHASHINI_ENABLED", "true")
    monkeypatch.setenv("BHASHINI_API_URL", "http://fake")
    monkeypatch.setenv("BHASHINI_API_KEY", "fake-key")
    monkeypatch.setenv("BHASHINI_OCR_SERVICE_ID", "bhashini/iiith-bhasha-ocr")

    provider = BhashiniLanguageProvider()

    mock_api = AsyncMock()
    mock_api.return_value = {
        "pipelineResponse": [
            {
                "output": [
                    {
                        "source": "Recognized text"
                    }
                ]
            }
        ]
    }

    with patch.object(provider, '_make_api_call', mock_api):
        res = await provider.ocr(b"data", "hi")
        assert res == "Recognized text"
        
        payload = mock_api.call_args[0][0]
        assert payload["pipelineTasks"][0]["taskType"] == "ocr"
        assert payload["pipelineTasks"][0]["config"]["language"]["sourceLanguage"] == "hi"
        assert payload["pipelineTasks"][0]["config"]["serviceId"] == "bhashini/iiith-bhasha-ocr"
        assert payload["inputData"]["image"][0]["imageContent"] == "ZGF0YQ==" # "data" base64

def test_ocr_missing_service_id(monkeypatch):
    import app.api.voice
    from app.services.providers.base import ProviderNotConfiguredError
    
    class FailingOCRProvider:
        PROVIDER_NAME = "mock"
        async def ocr(self, *args, **kwargs):
            raise ProviderNotConfiguredError("Missing config")
            
    monkeypatch.setattr(app.api.voice, "_get_process_provider", lambda: FailingOCRProvider())
    
    resp = client.post(
        "/api/voice/ocr",
        files=[_make_image()],
        data={"source_language": "hi"}
    )
    assert resp.status_code == 503
    assert resp.json()["error_code"] == "PROVIDER_NOT_CONFIGURED"
