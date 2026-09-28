import pytest
import asyncio
import json
from app.services.agent.models import SessionState, AgentExtraction
from app.services.agent.service import RealConversationalAgentService, _SESSIONS

@pytest.mark.asyncio
@pytest.mark.parametrize("assistant_lang,expected_lang_name", [
    ("en", "English"),
    ("hi", "Hindi"),
    ("bho", "Bhojpuri"),
    ("mai", "Maithili"),
    ("bn", "Bengali"),
    ("sat", "Santali")
])
async def test_confirmation_response_language(monkeypatch, assistant_lang, expected_lang_name):
    # Setup session with no missing fields
    session_id = f"lang_test_{assistant_lang}"
    session = SessionState(session_id=session_id)
    session.answered_fields = {
        "occupation": True,
        "skills": True,
        "experience_years": True,
        "income_monthly": True,
        "relocation_willing": True,
        "certifications": True
    }
    _SESSIONS[session_id] = session

    intercepted_payload = None
    
    # We simulate the LLM responding perfectly in the requested language
    fake_llm_response_text = f"This is a confirmation in {expected_lang_name}"
    
    class MockResponse:
        def raise_for_status(self): pass
        @property
        def is_success(self): return True
        @property
        def status_code(self): return 200
        def json(self):
            return {
                "choices": [{
                    "message": {
                        "content": json.dumps({
                            "response_text": fake_llm_response_text,
                            "language_code": assistant_lang,
                            "intent": "profile_confirmed",
                            "target_field": "confirmation",
                            "should_continue": False,
                            "extracted_info": {}
                        })
                    }
                }]
            }

    class MockAsyncClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, headers, json, **kwargs):
            nonlocal intercepted_payload
            intercepted_payload = json
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: MockAsyncClient())
    
    svc = RealConversationalAgentService("mock", "key", "model", "")
    
    result = await svc.generate_response(
        user_text="User input",
        source_language="en",
        assistant_language=assistant_lang,
        session_id=session_id
    )
    
    agent_resp = result["agent_response"]
    
    # 1. Check prompt contains correct language name
    assert intercepted_payload is not None
    last_msg = intercepted_payload["messages"][-1]["content"]
    assert f"[Please respond in language: {expected_lang_name}]" in last_msg
    
    # 2. Check the response text was NOT overwritten by the hardcoded English fallback
    assert agent_resp.response_text == fake_llm_response_text
    assert "Thank you, I have collected all the information" not in agent_resp.response_text

@pytest.mark.asyncio
async def test_deduplication_still_works_for_non_confirmation(monkeypatch):
    """Test that deduplication protection STILL fires if missing > 0 and the LLM hallucinates an already-answered field."""
    session_id = "dedup_test"
    session = SessionState(session_id=session_id)
    # Occupation is answered, skills is missing
    session.answered_fields = {"occupation": True}
    _SESSIONS[session_id] = session

    class MockResponse:
        def raise_for_status(self): pass
        @property
        def is_success(self): return True
        @property
        def status_code(self): return 200
        def json(self):
            return {
                "choices": [{
                    "message": {
                        "content": json.dumps({
                            "response_text": "Tell me your occupation?", # Hallucinated duplicate
                            "language_code": "hi",
                            "intent": "gather_info",
                            "target_field": "occupation",
                            "should_continue": True,
                            "extracted_info": {}
                        })
                    }
                }]
            }

    class MockAsyncClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, headers, json, **kwargs): return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: MockAsyncClient())
    svc = RealConversationalAgentService("mock", "key", "model", "")
    
    result = await svc.generate_response(
        user_text="User input",
        source_language="hi",
        assistant_language="hi",
        session_id=session_id
    )
    
    agent_resp = result["agent_response"]
    
    # Since 'occupation' was already answered and 'skills' is missing, 
    # deduplication should override target_field to 'skills' and use the fallback.
    assert agent_resp.target_field == "skills"
    assert "Thank you. Now, could you tell me about your skills?" in agent_resp.response_text
