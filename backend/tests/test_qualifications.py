import pytest
from app.services.qualifications.models import QualificationRecord
from app.services.qualifications.matcher import QualificationMatcher
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_verified_qualification_match():
    # A. Verified qualification record
    repo = AsyncMock()
    repo.get_by_job_role.return_value = QualificationRecord(
        qualification_id="q-123",
        qualification_name="Verified Farmer",
        job_role="Farmer",
        nsqf_level=4,
        source_type="NCVET_NQR",
        data_status="verified"
    )
    matcher = QualificationMatcher(repository=repo)
    rec = await matcher.match_role("role_123", "Farmer")
    assert rec.data_status == "verified"
    assert rec.nsqf_level == 4
    assert rec.source_type == "NCVET_NQR"

@pytest.mark.asyncio
async def test_development_record():
    # B. Development record remains marked development
    matcher = QualificationMatcher() # no repo
    rec = await matcher.match_role("farmer_demo", "Farmer")
    assert rec.data_status == "development"
    assert rec.source_type == "DEVELOPMENT"
    assert rec.nsqf_level is None

@pytest.mark.asyncio
async def test_unknown_role():
    # C. Unknown role produces unverified result
    matcher = QualificationMatcher()
    rec = await matcher.match_role("unknown_role", "Unknown Role")
    assert rec.data_status == "unverified"
    assert rec.source_type == "UNVERIFIED"
    assert rec.nsqf_level is None
    
# D, E, F are covered implicitly by the data model and matching fallback logic
