import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app
from app.services.providers.base import TranscriptionResult, ProviderTimeoutError
import io


def make_audio_file(filename="test.wav"):
    return (filename, b"fake_audio_content", "audio/wav")

def test_pipeline_hindi_mock_flow():
    # A. Hindi mock audio flow
    # G. Skill normalization with known alias (tractor repair in Hindi mock)
    # I. Recommendation generation
    # J. Database persistence
    # L. Original transcript unchanged
    files = {"audio": make_audio_file("hindi.wav")}
    
    # We use LLM_PROVIDER=mock which delegates to MockLivelihoodExtractor
    # The MockExtractor handles specific files deterministically (like 'hindi.wav' simulating a Hindi transcript)
    # Wait, the pipeline reads audio content. The AudioValidation checks size etc.
    # Actually the MockLanguageProvider responds based on audio bytes if they match hardcoded, but for tests it usually returns a default.
    # Let's mock the ALD/ASR to ensure it returns specific values so MockExtractor gives exact skills,
    # OR let's just see what the default mock ALD/ASR gives.
    
    with patch("app.services.providers.mock_provider.MockLanguageProvider.detect_language") as mock_ald, \
         patch("app.services.providers.mock_provider.MockLanguageProvider.transcribe") as mock_asr:
         
         mock_ald.return_value = AsyncMock(language_code="hi", language_name="Hindi", confidence=1.0)
         
         # Extractor mock looks for "I work in farming" to return agriculture, "tractor" for tractor repair
         mock_asr.return_value = TranscriptionResult(
             original_text="tractor repair",
             language_code="hi",
             language_name="Hindi",
             confidence=1.0,
             provider="mock",
             language_mode="monolingual"
         )
         
         resp = TestClient(app).post("/api/pipeline", files=files)
         assert resp.status_code == 200
         data = resp.json()
         
         assert data["status"] == "success"
         assert data["persistence_status"] == "saved"
         assert data["transcript"]["original_text"] == "tractor repair"
         assert data["transcript"]["language_code"] == "hi"
         
         assert len(data["normalized_skills"]) > 0
         assert data["normalized_skills"][0]["canonical_name"] == "Tractor Repair"
         
         assert len(data["recommendations"]) > 0

def test_pipeline_bhojpuri_mock_flow():
    # B. Bhojpuri mock flow
    files = {"audio": make_audio_file("bhojpuri.wav")}
    with patch("app.services.providers.mock_provider.MockLanguageProvider.transcribe") as mock_asr:
         mock_asr.return_value = TranscriptionResult(
             original_text="tractor aur kheti",
             language_code="bho",
             language_name="Bhojpuri",
             confidence=1.0,
             provider="mock"
         )
         resp = TestClient(app).post("/api/pipeline", files=files)
         assert resp.status_code == 200
         data = resp.json()
         assert data["transcript"]["language_code"] == "bho"

def test_pipeline_code_switched_flow():
    # C. Code-switched flow
    files = {"audio": make_audio_file("cs.wav")}
    with patch("app.services.providers.mock_provider.MockLanguageProvider.transcribe") as mock_asr:
         mock_asr.return_value = TranscriptionResult(
             original_text="farming bhi karta hoon",
             language_code="hi",
             language_name="Hindi",
             confidence=1.0,
             provider="mock",
             language_mode="code_switched"
         )
         resp = TestClient(app).post("/api/pipeline", files=files)
         assert resp.status_code == 200
         data = resp.json()
         assert data["transcript"]["language_mode"] == "code_switched"

def test_pipeline_missing_livelihood_info():
    # D. Missing livelihood information
    files = {"audio": make_audio_file("empty.wav")}
    with patch("app.services.providers.mock_provider.MockLanguageProvider.transcribe") as mock_asr:
         mock_asr.return_value = TranscriptionResult(
             original_text="hello",
             language_code="en",
             language_name="English",
             confidence=1.0,
             provider="mock"
         )
         resp = TestClient(app).post("/api/pipeline", files=files)
         assert resp.status_code == 200
         data = resp.json()
         assert data["livelihood_profile"]["occupation"] is None

def test_pipeline_asr_failure():
    # E. ASR failure
    files = {"audio": make_audio_file("fail.wav")}
    with patch("app.services.providers.mock_provider.MockLanguageProvider.transcribe", side_effect=Exception("ASR Broken")):
         resp = TestClient(app).post("/api/pipeline", files=files)
         assert resp.status_code == 500
         assert "Transcription failed" in resp.json()["message"]

def test_pipeline_llm_failure():
    # F. LLM failure
    files = {"audio": make_audio_file("llmfail.wav")}
    with patch("app.services.extraction.llm_extractor.LLMLivelihoodExtractor.extract", side_effect=Exception("LLM Broken")):
         resp = TestClient(app).post("/api/pipeline", files=files)
         assert resp.status_code == 500
         assert "Structured extraction failed" in resp.json()["message"]

def test_pipeline_unknown_skill():
    # H. Unknown skill remains unmatched
    files = {"audio": make_audio_file("unknown.wav")}
    with patch("app.services.providers.mock_provider.MockLanguageProvider.transcribe") as mock_asr:
         mock_asr.return_value = TranscriptionResult(
             original_text="I can do magic tricks",
             language_code="en",
             language_name="English",
             confidence=1.0,
             provider="mock"
         )
         resp = TestClient(app).post("/api/pipeline", files=files)
         assert resp.status_code == 200
         data = resp.json()
         
         # The mock extractor returns a skill based on string matching "magic" -> it doesn't match default so it might return raw string if we override mock
         # Let's mock the normalizer input or the LLM extractor output
         
    # Better approach for H: Mock the extractor to return "magic"
    with patch("app.services.extraction.mock_extractor.MockLivelihoodExtractor.extract") as mock_ext:
        mock_ext.return_value = AsyncMock()
        from app.schemas.livelihood import LivelihoodProfile
        mock_ext.return_value = LivelihoodProfile(skills=["magic tricks"])
        resp = TestClient(app).post("/api/pipeline", files=files)
        data = resp.json()
        assert data["normalized_skills"][0]["canonical_name"] is None
        assert data["normalized_skills"][0]["normalization_status"] == "unmatched"

def test_pipeline_database_failure():
    # K. Database failure is reported separately
    files = {"audio": make_audio_file("dbfail.wav")}
    with patch("app.db.repositories.RecommendationRepository.save_transcript", side_effect=Exception("DB Down")):
         resp = TestClient(app).post("/api/pipeline", files=files)
         assert resp.status_code == 200
         data = resp.json()
         assert data["status"] == "success"
         assert data["persistence_status"] == "failed"

