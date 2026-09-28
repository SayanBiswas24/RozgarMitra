import uuid
import logging
from fastapi import APIRouter, status, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.db.repositories import RecommendationRepository
from app.services.skills.normalizer import SkillNormalizer
from app.services.skills.catalog import DEVELOPMENT_ROLE_CATALOG
from app.services.recommendation.engine import RecommendationEngine
from app.services.recommendation.models import Recommendation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

class ProfileInput(BaseModel):
    occupation: Optional[str] = None
    skills: List[str]
    experience_years: Optional[float] = None
    work_description: Optional[str] = None
    education: Optional[str] = None
    employment_preference: Optional[str] = None

class RecommendationRequest(BaseModel):
    request_id: str
    profile: ProfileInput

class RecommendationResponse(BaseModel):
    request_id: str
    status: str
    persistence_status: str
    recommendations: List[Recommendation]

_normalizer = SkillNormalizer()
_engine = RecommendationEngine()

@router.post("", response_model=RecommendationResponse)
async def create_recommendation(request: RecommendationRequest, db: AsyncSession = Depends(get_db_session)):
    try:
        # 1. Normalize skills if required.
        normalized = _normalizer.normalize(request.profile.skills)
        
        # 2. Load available roles.
        # 3. Calculate matching.
        # 4. Calculate skill gaps.
        # 5. Generate deterministic explanations.
        # 6. Attach qualification metadata.
        recs = await _engine.recommend_roles(normalized, DEVELOPMENT_ROLE_CATALOG)
        
        # 7. Persist recommendation if database is configured.
        repo = RecommendationRepository(db)
        profile_id = str(uuid.uuid4())
        
        persistence_status = "saved"
        try:
            # We save profile and its skills
            await repo.save_profile(
                profile_id=profile_id,
                profile_data=request.profile.model_dump(),
                skills=normalized,
                transcript_id=request.request_id
            )
            
            for r in recs:
                await repo.save_recommendation(r, profile_id)
        except Exception as e:
            logger.error(f"Persistence failed: {e}")
            persistence_status = "failed"
            
    except Exception as e:
        logger.exception("Unexpected error in recommendation processing")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "INTERNAL_SERVER_ERROR"}
        )
        
    return RecommendationResponse(
        request_id=request.request_id,
        status="success",
        persistence_status=persistence_status,
        recommendations=recs
    )
