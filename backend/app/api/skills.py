from fastapi import APIRouter, status, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List
from app.services.skills.normalizer import SkillNormalizer
from app.services.skills.gap_engine import SkillGapEngine
from app.services.skills.models import NormalizedSkill, SkillGapResult

router = APIRouter(prefix="/api/skills", tags=["skills"])

class NormalizeRequest(BaseModel):
    request_id: str
    skills: List[str]

class NormalizeResponse(BaseModel):
    request_id: str
    skills: List[NormalizedSkill]

class GapRequest(BaseModel):
    request_id: str
    target_role_id: str
    skills: List[str]

class GapResponse(SkillGapResult):
    request_id: str

_normalizer = SkillNormalizer()
_gap_engine = SkillGapEngine()

@router.post("/normalize", response_model=NormalizeResponse)
async def normalize_skills(request: NormalizeRequest):
    # Eliminate duplicate raw skills
    seen = set()
    unique_skills = []
    for s in request.skills:
        if s not in seen:
            unique_skills.append(s)
            seen.add(s)
            
    normalized = _normalizer.normalize(unique_skills)
    return NormalizeResponse(
        request_id=request.request_id,
        skills=normalized
    )

@router.post("/gap", response_model=GapResponse)
async def calculate_gap(request: GapRequest):
    result = _gap_engine.calculate_gap(request.target_role_id, request.skills)
    if not result:
        # Invalid role
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Role not found."}
        )
        
    return GapResponse(
        request_id=request.request_id,
        target_role=result.target_role,
        matched_skills=result.matched_skills,
        missing_skills=result.missing_skills,
        match_percentage=result.match_percentage,
        qualification=result.qualification,
        data_status=result.data_status
    )
