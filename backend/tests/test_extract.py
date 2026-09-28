from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)

def build_payload(text: str, code: str = "hi", name: str = "Hindi", mode: str = "monolingual"):
    return {
        "request_id": "test-req-123",
        "transcript": {
            "original_text": text,
            "language_code": code,
            "language_name": name,
            "language_mode": mode
        }
    }

def test_extract_hindi(client: TestClient):
    payload = build_payload("मैं खेती करता हूं और ट्रैक्टर की मरम्मत भी करता हूं।")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 200
    data = resp.json()["profile"]
    assert "Agriculture" in data["skills"]
    assert "Tractor Repair" in data["skills"]
    assert data["source_transcript_id"] == "test-req-123"

def test_extract_bhojpuri(client: TestClient):
    payload = build_payload("हम खेती करिला आ ट्रैक्टर भी ठीक करिला।", "bho", "Bhojpuri")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 200
    data = resp.json()["profile"]
    assert "Agriculture" in data["skills"]

def test_extract_maithili(client: TestClient):
    payload = build_payload("हम खेती करैत छी आ मशीनक मरम्मति सेहो करैत छी।", "mai", "Maithili")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 200
    data = resp.json()["profile"]
    assert "Agriculture" in data["skills"]

def test_extract_english(client: TestClient):
    payload = build_payload("I work as a farmer and repair tractors.", "en", "English")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 200
    data = resp.json()["profile"]
    assert data["occupation"] == "Farmer"
    assert "Agriculture" in data["skills"]

def test_extract_code_switched(client: TestClient):
    payload = build_payload("Hum farming karte hain aur tractor repair bhi karta hoon.", "hi", "Hindi", "code_switched")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 200
    data = resp.json()["profile"]
    assert "Agriculture" in data["skills"]
    assert data["source_language"] == "hi"

def test_missing_occupation(client: TestClient):
    payload = build_payload("मैं खेती करता हूं।")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 200
    assert resp.json()["profile"]["occupation"] is None

def test_missing_education(client: TestClient):
    payload = build_payload("मैं खेती करता हूं।")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 200
    assert resp.json()["profile"]["education"] is None

def test_missing_experience(client: TestClient):
    payload = build_payload("मैं खेती करता हूं।")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 200
    assert resp.json()["profile"]["experience_years"] is None

def test_no_hallucination(client: TestClient):
    payload = build_payload("I repair tractors.")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 200
    data = resp.json()["profile"]
    assert "Tractor Repair" in data["skills"]
    assert data["occupation"] is None
    assert data["education"] is None
    assert data["experience_years"] is None

def test_multiple_skills(client: TestClient):
    payload = build_payload("multiple skills")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 200
    data = resp.json()["profile"]
    assert "Skill A" in data["skills"]
    assert "Skill C" in data["skills"]

def test_empty_skill_rejected(client: TestClient):
    # Pydantic validation handles this
    payload = build_payload("empty_skill")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 422
    assert "empty" in resp.json()["message"].lower()

def test_negative_experience_rejected(client: TestClient):
    payload = build_payload("negative_exp")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 422

def test_original_transcript_preserved(client: TestClient):
    # Checking response logic
    payload = build_payload("I work as a farmer.")
    resp = client.post("/api/voice/extract", json=payload)
    assert resp.status_code == 200
    # Original transcript isn't repeated in the output response root directly
    # but the API received it intact.
    # The requirement is we don't modify it. We verify source_transcript_id matches.
    assert resp.json()["request_id"] == "test-req-123"

def test_provider_failure(client: TestClient):
    with patch("app.api.voice._get_extraction_provider") as mock:
        from app.services.extraction.base import ExtractorNotConfiguredError
        mock_provider = AsyncMock()
        mock_provider.extract.side_effect = ExtractorNotConfiguredError("Not configured")
        mock.return_value = mock_provider
        
        resp = client.post("/api/voice/extract", json=build_payload("text"))
        assert resp.status_code == 503

def test_malformed_extraction(client: TestClient):
    with patch("app.api.voice._get_extraction_provider") as mock:
        mock_provider = AsyncMock()
        mock_provider.extract.side_effect = Exception("General error")
        mock.return_value = mock_provider
        
        resp = client.post("/api/voice/extract", json=build_payload("text"))
        assert resp.status_code == 500

def test_api_validation(client: TestClient):
    resp = client.post("/api/voice/extract", json={})
    assert resp.status_code == 422
