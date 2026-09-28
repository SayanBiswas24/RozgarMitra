"""Tests for the one-turn completion regression and language instruction."""
import pytest
from app.services.agent.models import SessionState, AgentExtraction
from app.services.agent.service import (
    merge_profiles,
    get_missing_fields,
    REQUIRED_PROFILE_FIELDS,
    RealConversationalAgentService,
    _SESSIONS
)

def test_regression_one_turn_completion_prevented():
    """TEST 1: Ensure explicit nulls in AgentExtraction do not mark fields as answered."""
    session = SessionState(session_id="reg_test_1")
    
    # Simulate LLM output where missing fields are explicitly null
    extracted = AgentExtraction(
        occupation="Electrician",
        skills=None,
        experience_years=None,
        income_monthly=None,
        certifications=None,
        relocation_willing=None
    )
    
    merge_profiles(session, extracted)
    
    # occupation should be the ONLY answered field
    assert "occupation" in session.answered_fields
    assert session.answered_fields["occupation"] is True
    
    # None values should NOT be in answered_fields
    assert "skills" not in session.answered_fields
    assert "experience_years" not in session.answered_fields
    
    # get_missing_fields should still contain all others
    missing = get_missing_fields(session)
    assert "occupation" not in missing
    assert "skills" in missing
    assert "experience_years" in missing
    assert len(missing) == len(REQUIRED_PROFILE_FIELDS) - 1

def test_regression_negative_answers_remain_valid():
    """TEST 2: Ensure explicit empty/negative answers still count as answered."""
    session = SessionState(session_id="reg_test_2")
    
    # Simulate valid explicit negative answers
    extracted = AgentExtraction(
        certifications=[],
        relocation_willing=False,
        experience_years=0
    )
    
    merge_profiles(session, extracted)
    
    assert session.answered_fields.get("certifications") is True
    assert session.answered_fields.get("relocation_willing") is True
    assert session.answered_fields.get("experience_years") is True
    
    missing = get_missing_fields(session)
    assert "certifications" not in missing
    assert "relocation_willing" not in missing
    assert "experience_years" not in missing

@pytest.mark.asyncio
async def test_regression_language_instruction_mapping(monkeypatch):
    """TEST 4: Verify the dynamic prompt uses human-readable language names."""
    import json
    
    # We will monkeypatch httpx.AsyncClient.post to intercept the payload and verify the prompt
    intercepted_payload = None
    
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
                            "response_text": "Bhojpuri response here",
                            "intent": "gather_info",
                            "should_continue": True,
                            "extracted_info": {"occupation": "Electrician"}
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
    
    await svc.generate_response(
        user_text="नमस्ते",
        source_language="hi",
        assistant_language="bho", # passing the ISO code
        session_id="reg_test_lang"
    )
    
    assert intercepted_payload is not None
    messages = intercepted_payload["messages"]
    
    # The last message should contain the human-readable language instruction
    last_msg = messages[-1]["content"]
    assert "[Please respond in language: Bhojpuri]" in last_msg
