import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.agent.service import _SESSIONS
from tests.test_voice import _make_upload
import uuid
from app.api import voice

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_sessions():
    _SESSIONS.clear()

class StatefulMockProvider:
    PROVIDER_NAME = "mock"
    def __init__(self, transcript):
        self.transcript = transcript
        
    async def detect_language(self, *args, **kwargs):
        from app.services.providers.base import LanguageDetectionResult
        return LanguageDetectionResult(language_code="en", language_name="English", confidence=1.0)
        
    async def transcribe(self, *args, **kwargs):
        from app.services.providers.base import TranscriptionResult
        return TranscriptionResult(original_text=self.transcript, language_code="en", language_name="English", confidence=1.0, provider="mock")
        
    async def synthesize(self, *args, **kwargs):
        return b"fake_audio"
        
    async def transliterate(self, *args, **kwargs):
        return "transliterated"
        
    async def ocr(self, *args, **kwargs):
        return "ocr"

def test_stateful_agent_flow(monkeypatch):
    session_id = str(uuid.uuid4())
    
    # Turn 1
    monkeypatch.setattr(voice, "_get_process_provider", lambda: StatefulMockProvider("I am a farmer and I do solar."))
    
    resp1 = client.post(
        "/api/voice/agent",
        files=[_make_upload()],
        data={"spoken_language": "en", "session_id": session_id}
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["status"] == "collecting"
    assert data1["profile"]["occupation"] == "Farmer"
    assert "Solar Panel Installation" in data1["profile"]["skills"]
    assert data1["ready_for_downstream_processing"] == False
    
    # Turn 2
    monkeypatch.setattr(voice, "_get_process_provider", lambda: StatefulMockProvider("I have been doing it for five years."))
    
    resp2 = client.post(
        "/api/voice/agent",
        files=[_make_upload()],
        data={"spoken_language": "en", "session_id": session_id}
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    
    # Check that previous data is retained
    assert data2["profile"]["occupation"] == "Farmer"
    assert "Solar Panel Installation" in data2["profile"]["skills"]
    # Check new data merged
    assert data2["profile"]["experience_years"] == 5
    
    # Status should be completed (mock says if no missing fields left (well mock doesn't fill all required fields, let's just test the merge))
    
def test_stateful_merge_logic():
    from app.services.agent.service import merge_profiles
    from app.services.agent.models import LivelihoodProfile, AgentExtraction, SessionState
    
    profile = LivelihoodProfile(
        occupation="Farmer",
        skills=["Farming"],
        income_monthly=10000
    )
    session = SessionState(session_id="test", profile=profile)
    
    extracted = AgentExtraction(
        skills=["Solar Panel Installation", "Farming"],
        income_monthly=15000,
        experience_years=5
    )
    
    merge_profiles(session, extracted)
    
    assert session.profile.occupation == "Farmer"
    assert session.profile.income_monthly == 15000
    assert session.profile.experience_years == 5
    assert len(session.profile.skills) == 2
    assert "Solar Panel Installation" in session.profile.skills
    assert "Farming" in session.profile.skills
