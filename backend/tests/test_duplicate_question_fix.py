import pytest
from app.services.agent.models import SessionState, LivelihoodProfile, AgentExtraction, AgentResponse
from app.services.agent.service import merge_profiles, get_missing_fields

def test_negative_answer_stores_empty_list():
    # User says: "कोई प्रमाण पत्र ना बा" (No certificates)
    session = SessionState(session_id="test")
    extracted = AgentExtraction(
        certifications=[]
    )
    
    merge_profiles(session, extracted)
    
    # 1. State must show it's answered
    assert session.answered_fields.get("certifications") is True
    
    # 2. Value must be []
    assert session.profile.certifications == []
    
    # 3. Must not be in missing fields
    missing = get_missing_fields(session)
    assert "certifications" not in missing

def test_user_correction_updates_answered_field():
    session = SessionState(session_id="test")
    session.answered_fields["experience_years"] = True
    session.profile.experience_years = 5
    
    # User corrects: "actually 10 years"
    extracted = AgentExtraction(experience_years=10)
    merge_profiles(session, extracted)
    
    assert session.answered_fields["experience_years"] is True
    assert session.profile.experience_years == 10

def test_zero_valid_answer():
    session = SessionState(session_id="test")
    extracted = AgentExtraction(income_monthly=0)
    
    merge_profiles(session, extracted)
    
    assert session.answered_fields.get("income_monthly") is True
    assert session.profile.income_monthly == 0
    missing = get_missing_fields(session)
    assert "income_monthly" not in missing

def test_missing_fields_ignores_unanswered():
    session = SessionState(session_id="test")
    # Even if default is None, it should be missing because it's not in answered_fields
    missing = get_missing_fields(session)
    assert "occupation" in missing
    assert "skills" in missing
    
    session.answered_fields["skills"] = True
    missing = get_missing_fields(session)
    assert "skills" not in missing
