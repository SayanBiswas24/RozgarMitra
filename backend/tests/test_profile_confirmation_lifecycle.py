import pytest
import asyncio
from app.services.agent.models import SessionState, AgentExtraction
from app.services.agent.service import merge_profiles, get_missing_fields, REQUIRED_PROFILE_FIELDS, MockConversationalAgentService, _SESSIONS

@pytest.mark.asyncio
async def test_status_becomes_awaiting_confirmation_not_completed():
    session = SessionState(session_id="lifecycle_1")
    _SESSIONS["lifecycle_1"] = session
    
    extracted = AgentExtraction(
        occupation="F",
        skills=["F"],
        experience_years=1,
        income_monthly=1,
        relocation_willing=True,
        certifications=["C"]
    )
    merge_profiles(session, extracted)
    
    svc = MockConversationalAgentService()
    res = await svc.generate_response("I am a farmer with five years solar", "en", "en", "lifecycle_1")
    
    assert res["session_state"].status == "awaiting_confirmation"

@pytest.mark.asyncio
async def test_user_confirms_becomes_completed():
    session = SessionState(session_id="lifecycle_3", status="awaiting_confirmation")
    _SESSIONS["lifecycle_3"] = session
    
    svc = MockConversationalAgentService()
    res = await svc.generate_response("yes", "en", "en", "lifecycle_3")
    
    assert res["session_state"].status == "completed"

@pytest.mark.asyncio
async def test_user_rejects_becomes_collecting():
    session = SessionState(session_id="lifecycle_4", status="awaiting_confirmation")
    _SESSIONS["lifecycle_4"] = session
    
    svc = MockConversationalAgentService()
    res = await svc.generate_response("no wait I am a plumber", "en", "en", "lifecycle_4")
    
    assert res["session_state"].status == "collecting"
