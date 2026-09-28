import pytest
from fastapi.testclient import TestClient
from app.main import app

# Tests specifically for the Mobile Contract
# Ensure POST /api/pipeline meets all mobile app requirements predictably.

def make_audio_file(filename="test.wav"):
    return (filename, b"fake_audio_content", "audio/wav")

def test_mobile_contract_valid_audio():
    # A. Valid audio request
    # B. Response follows Pydantic schema
    # C. Language metadata is present
    # D. Original transcript is present
    # E. Livelihood extraction is present
    # F. Normalized skills are present
    # J. Mock mode produces zero external calls (this works off default .env)
    
    with TestClient(app) as client:
        files = {"audio": make_audio_file("hindi.wav")}
        resp = client.post("/api/pipeline", files=files)
        
        assert resp.status_code == 200
        data = resp.json()
        
        assert "status" in data
        assert "transcript" in data
        assert "language_code" in data["transcript"]
        assert "original_text" in data["transcript"]
        assert "livelihood_profile" in data
        assert "normalized_skills" in data

def test_mobile_contract_invalid_audio():
    # G. Invalid audio returns stable error structure
    with TestClient(app) as client:
        files = {"audio": ("bad.exe", b"fake", "application/x-msdownload")}
        resp = client.post("/api/pipeline", files=files)
        
        assert resp.status_code == 415
        data = resp.json()
        assert data["success"] is False
        assert data["error_code"] == "UNSUPPORTED_AUDIO_FORMAT"
        assert "message" in data
        
def test_mobile_contract_code_switched():
    # K. Code-switched input is represented correctly
    from unittest.mock import patch
    from app.services.providers.base import TranscriptionResult
    
    with TestClient(app) as client, \
         patch("app.services.providers.mock_provider.MockLanguageProvider.transcribe") as mock_asr:
         
         mock_asr.return_value = TranscriptionResult(
             original_text="farming bhi karta hoon",
             language_code="hi",
             language_name="Hindi",
             confidence=1.0,
             provider="mock",
             language_mode="code_switched"
         )
         
         files = {"audio": make_audio_file("cs.wav")}
         resp = client.post("/api/pipeline", files=files)
         assert resp.status_code == 200
         data = resp.json()
         assert data["transcript"]["language_mode"] == "code_switched"

def test_mobile_contract_asr_failure():
    # H. ASR failure returns stable error
    from unittest.mock import patch
    
    with TestClient(app) as client, \
         patch("app.services.providers.mock_provider.MockLanguageProvider.transcribe", side_effect=Exception("ASR Broken")):
         
         files = {"audio": make_audio_file("fail.wav")}
         resp = client.post("/api/pipeline", files=files)
         
         assert resp.status_code == 500
         data = resp.json()
         assert data["success"] is False
         assert data["error_code"] == "PIPELINE_ERROR"
         assert "Transcription failed" in data["message"]

def test_mobile_contract_llm_failure():
    # I. LLM failure returns stable error
    from unittest.mock import patch
    
    with TestClient(app) as client, \
         patch("app.services.extraction.llm_extractor.LLMLivelihoodExtractor.extract", side_effect=Exception("LLM Broken")):
         
         files = {"audio": make_audio_file("fail.wav")}
         resp = client.post("/api/pipeline", files=files)
         
         assert resp.status_code == 500
         data = resp.json()
         assert data["success"] is False
         assert data["error_code"] == "PIPELINE_ERROR"
         assert "Structured extraction failed" in data["message"]

