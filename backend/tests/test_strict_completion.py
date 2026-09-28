import pytest
from app.services.agent.models import SessionState, AgentExtraction
from app.services.agent.service import merge_profiles, get_missing_fields, REQUIRED_PROFILE_FIELDS

def test_premature_completion_prevented():
    session = SessionState(session_id="strict_test_1")
    
    # 1. One answered field -> collecting
    extracted1 = AgentExtraction(occupation="Electrician")
    merge_profiles(session, extracted1)
    
    missing = get_missing_fields(session)
    # len should be len(REQUIRED_PROFILE_FIELDS) - 1
    assert len(missing) == len(REQUIRED_PROFILE_FIELDS) - 1
    assert "occupation" not in missing
    assert "skills" in missing
    
    # Even if LLM extraction had some other random field
    extracted2 = AgentExtraction(skills=["Wiring"])
    merge_profiles(session, extracted2)
    missing = get_missing_fields(session)
    assert len(missing) == len(REQUIRED_PROFILE_FIELDS) - 2
    assert "skills" not in missing

def test_negative_answers_count_as_completion():
    session = SessionState(session_id="strict_test_2")
    
    extracted = AgentExtraction(
        experience_years=0, # Zero
        relocation_willing=False, # False
        certifications=[] # Empty list
    )
    merge_profiles(session, extracted)
    
    missing = get_missing_fields(session)
    assert "experience_years" not in missing
    assert "relocation_willing" not in missing
    assert "certifications" not in missing

def test_full_completion_trigger():
    session = SessionState(session_id="strict_test_3")
    
    extracted = AgentExtraction(
        occupation="Farmer",
        skills=["Farming"],
        experience_years=5,
        income_monthly=10000,
        relocation_willing=True,
        certifications=["Agri"]
    )
    merge_profiles(session, extracted)
    missing = get_missing_fields(session)
    assert len(missing) == 0

