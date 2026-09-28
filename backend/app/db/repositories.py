import logging
from sqlalchemy.ext.asyncio import AsyncSession
from .models import TranscriptDB, LivelihoodProfileDB, ProfileSkillDB, RecommendationDB, SkillGapDB

logger = logging.getLogger(__name__)

class RecommendationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_transcript(self, request_id: str, original_text: str, code: str, name: str, provider: str):
        try:
            db_transcript = TranscriptDB(
                request_id=request_id,
                original_text=original_text,
                language_code=code,
                language_name=name,
                provider=provider
            )
            self.session.add(db_transcript)
            await self.session.commit()
        except Exception as e:
            logger.error(f"DB Error saving transcript: {e}")
            await self.session.rollback()

    async def save_profile(self, profile_id: str, profile_data: dict, skills: list, transcript_id: str = None):
        try:
            db_profile = LivelihoodProfileDB(
                id=profile_id,
                occupation=profile_data.get("occupation"),
                experience_years=profile_data.get("experience_years"),
                work_description=profile_data.get("work_description"),
                education=profile_data.get("education"),
                employment_preference=profile_data.get("employment_preference"),
                source_transcript_id=transcript_id
            )
            self.session.add(db_profile)
            
            for sk in skills:
                db_skill = ProfileSkillDB(
                    profile_id=profile_id,
                    raw_skill=sk.raw_skill,
                    canonical_name=sk.canonical_name,
                    normalization_method=sk.normalization_method
                )
                self.session.add(db_skill)
                
            await self.session.commit()
        except Exception as e:
            logger.error(f"DB Error saving profile: {e}")
            await self.session.rollback()

    async def save_recommendation(self, rec, profile_id: str):
        try:
            db_rec = RecommendationDB(
                id=rec.recommendation_id,
                profile_id=profile_id,
                role_id=rec.role_id,
                match_percentage=rec.match_percentage,
                reason=rec.reason
            )
            self.session.add(db_rec)
            
            for ms in rec.matched_skills:
                db_gap = SkillGapDB(
                    recommendation_id=rec.recommendation_id,
                    skill_name=ms,
                    gap_status="matched"
                )
                self.session.add(db_gap)
                
            for ms in rec.missing_skills:
                db_gap = SkillGapDB(
                    recommendation_id=rec.recommendation_id,
                    skill_name=ms,
                    gap_status="missing"
                )
                self.session.add(db_gap)
                
            await self.session.commit()
        except Exception as e:
            logger.error(f"DB Error saving recommendation: {e}")
            await self.session.rollback()
