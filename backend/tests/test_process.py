import io
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from app.main import app

def _make_upload(content: bytes = b"\x00" * 1024, filename: str = "test.wav", content_type: str = "audio/wav"):
    return ("audio", (filename, io.BytesIO(content), content_type))

@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)

def test_process_missing_audio(client: TestClient):
    resp = client.post("/api/voice/process")
    assert resp.status_code in (400, 422)

def test_process_invalid_mime(client: TestClient):
    resp = client.post("/api/voice/process", files=[_make_upload(content=b"fake-pdf", content_type="application/pdf")])
    assert resp.status_code == 415

def test_process_empty_audio(client: TestClient):
    resp = client.post("/api/voice/process", files=[_make_upload(content=b"")])
    assert resp.status_code == 400

def test_process_oversized_audio(client: TestClient):
    from app.config import get_settings
    orig = get_settings().max_audio_size_bytes
    get_settings().max_audio_size_bytes = 1
    resp = client.post("/api/voice/process", files=[_make_upload(content=b"123")])
    assert resp.status_code == 400
    get_settings().max_audio_size_bytes = orig

def test_process_hindi(client: TestClient):
    resp = client.post("/api/voice/process", files=[_make_upload(content=b"hindi")])
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["language"]["code"] == "hi"
    assert data["transcript"]["original_text"] == "मैं खेती करता हूं और ट्रैक्टर की मरम्मत भी करता हूं।"
    assert data["processing"]["language_mode"] == "monolingual"

def test_process_bhojpuri(client: TestClient):
    resp = client.post("/api/voice/process", files=[_make_upload(content=b"bhojpuri")])
    assert resp.status_code == 200
    data = resp.json()
    assert data["language"]["code"] == "bho"
    assert data["transcript"]["original_text"] == "हम खेती करिला आ ट्रैक्टर भी ठीक करिला।"

def test_process_maithili(client: TestClient):
    resp = client.post("/api/voice/process", files=[_make_upload(content=b"maithili")])
    assert resp.status_code == 200
    data = resp.json()
    assert data["language"]["code"] == "mai"
    assert data["transcript"]["original_text"] == "हम खेती करैत छी आ मशीनक मरम्मति सेहो करैत छी।"

def test_process_english(client: TestClient):
    resp = client.post("/api/voice/process", files=[_make_upload(content=b"english")])
    assert resp.status_code == 200
    data = resp.json()
    assert data["language"]["code"] == "en"
    assert data["transcript"]["original_text"] == "I work in farming and also repair tractors."

def test_process_code_switched(client: TestClient):
    resp = client.post("/api/voice/process", files=[_make_upload(content=b"mixed")])
    assert resp.status_code == 200
    data = resp.json()
    assert data["language"]["code"] == "hi"
    assert data["transcript"]["original_text"] == "Hum farming karte hain aur tractor repair bhi karta hoon."
    assert data["processing"]["language_mode"] == "code_switched"

def test_process_provider_not_configured(client: TestClient):
    with patch("app.api.voice._get_process_provider") as mock:
        from app.services.providers.base import ProviderNotConfiguredError
        mock_provider = AsyncMock()
        mock_provider.detect_language.side_effect = ProviderNotConfiguredError("Not configured")
        mock.return_value = mock_provider
        
        resp = client.post("/api/voice/process", files=[_make_upload()])
        assert resp.status_code == 503

def test_process_provider_timeout(client: TestClient):
    with patch("app.api.voice._get_process_provider") as mock:
        from app.services.providers.base import ProviderTimeoutError
        mock_provider = AsyncMock()
        mock_provider.detect_language.side_effect = ProviderTimeoutError("Timeout")
        mock.return_value = mock_provider
        
        resp = client.post("/api/voice/process", files=[_make_upload()])
        assert resp.status_code == 504

def test_process_provider_malformed(client: TestClient):
    with patch("app.api.voice._get_process_provider") as mock:
        from app.services.providers.base import ProviderMalformedResponseError
        mock_provider = AsyncMock()
        mock_provider.detect_language.side_effect = ProviderMalformedResponseError("Malformed")
        mock.return_value = mock_provider
        
        resp = client.post("/api/voice/process", files=[_make_upload()])
        assert resp.status_code == 502

def test_process_provider_auth(client: TestClient):
    with patch("app.api.voice._get_process_provider") as mock:
        from app.services.providers.base import ProviderAuthenticationError
        mock_provider = AsyncMock()
        mock_provider.detect_language.side_effect = ProviderAuthenticationError("Auth")
        mock.return_value = mock_provider
        
        resp = client.post("/api/voice/process", files=[_make_upload()])
        assert resp.status_code == 502

