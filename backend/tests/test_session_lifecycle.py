import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.agent.service import _SESSIONS

client = TestClient(app)

def _make_upload(content: bytes = b"dummy audio content") -> tuple:
    return ("audio", ("test.wav", content, "audio/wav"))

def test_session_lifecycle_and_idempotency(monkeypatch):
    import app.api.voice
    
    # Setup mock pipeline
    class CompletingMockProvider:
        PROVIDER_NAME = "mock"
        async def detect_language(self, *args, **kwargs):
            from app.services.providers.base import LanguageDetectionResult
            return LanguageDetectionResult(language_code="hi", language_name="Hindi", confidence=1.0)

        async def transcribe(self, *args, **kwargs):
            from app.services.providers.base import TranscriptionResult
            return TranscriptionResult(original_text="I am a farmer with 5 years experience, make 10000, have certificates, relocation willing, skills are farming.", language_code="hi", language_name="Hindi", confidence=1.0, provider="mock")

        async def synthesize(self, *args, **kwargs):
            return b"audio"
            
    class CompletingAgentService:
        async def generate_response(self, *args, **kwargs):
            session_id = kwargs.get("session_id")
            from app.services.agent.models import SessionState, AgentResponse, AgentExtraction
            
            if session_id not in _SESSIONS:
                _SESSIONS[session_id] = SessionState(session_id=session_id)
            session = _SESSIONS[session_id]
            session.status = "completed"
            
            return {
                "session_state": session,
                "missing_fields": [],
                "agent_response": AgentResponse(
                    response_text="Profile completed.",
                    language_code="hi",
                    should_continue=False,
                    extracted_info=AgentExtraction(
                        occupation="Farmer",
                        skills=["Farming"],
                        experience_years=5,
                        income_monthly=10000,
                        certifications=["Agri"],
                        relocation_willing=True
                    )
                )
            }
            
    monkeypatch.setattr(app.api.voice, "_get_process_provider", lambda: CompletingMockProvider())
    monkeypatch.setattr(app.api.voice, "get_agent_service", lambda: CompletingAgentService())
    
    session_id = "lifecycle_sess_1"
    request_id_1 = "req_1"
    
    resp1 = client.post(
        "/api/voice/agent",
        files=[_make_upload()],
        data={"spoken_language": "hi", "assistant_language": "hi", "session_id": session_id, "request_id": request_id_1}
    )
    
    assert resp1.status_code == 200
    
    # Debug print
    print("SESSION PROCESSED REQUESTS:", _SESSIONS[session_id].processed_requests)
    print("SESSION STATUS:", _SESSIONS[session_id].status)
    
    resp2 = client.post(
        "/api/voice/agent",
        files=[_make_upload()],
        data={"spoken_language": "hi", "assistant_language": "hi", "session_id": session_id, "request_id": request_id_1}
    )
    print("RESP2 STATUS:", resp2.status_code, resp2.json())
    assert resp2.status_code == 409
    
    request_id_2 = "req_2"
    resp3 = client.post(
        "/api/voice/agent",
        files=[_make_upload()],
        data={"spoken_language": "hi", "assistant_language": "hi", "session_id": session_id, "request_id": request_id_2}
    )
    assert resp3.status_code == 400
    
    session_id_new = "lifecycle_sess_2"
    request_id_3 = "req_3"
    resp4 = client.post(
        "/api/voice/agent",
        files=[_make_upload()],
        data={"spoken_language": "hi", "assistant_language": "hi", "session_id": session_id_new, "request_id": request_id_3}
    )
    assert resp4.status_code == 200
