import uuid
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.providers.base import BaseLanguageProvider
from app.services.extraction.base import BaseLivelihoodExtractor
from app.schemas.livelihood import TranscriptInput
from app.services.skills.normalizer import SkillNormalizer
from app.services.recommendation.engine import RecommendationEngine
from app.services.skills.catalog import DEVELOPMENT_ROLE_CATALOG
from app.db.repositories import RecommendationRepository
from app.schemas.pipeline import PipelineResponse, PipelineTranscript

logger = logging.getLogger(__name__)

class LivelihoodPipeline:
    def __init__(self, language_provider: BaseLanguageProvider, extractor: BaseLivelihoodExtractor, db_session: AsyncSession):
        self.language_provider = language_provider
        self.extractor = extractor
        self.db = db_session
        self.normalizer = SkillNormalizer()
        self.engine = RecommendationEngine()
        
    async def process(self, audio_bytes: bytes, mime_type: str, request_id: str, language_hint: str = "auto") -> PipelineResponse:
        language_mapping = {
            "hi": "Hindi",
            "en": "English",
            "bho": "Bhojpuri",
            "mai": "Maithili",
            "bn": "Bengali",
            "sat": "Santali"
        }

        detected_lang = None
        lang_source = "ald"
        processing_lang = language_hint if language_hint and language_hint != "auto" else None

        # Step 1: ALD (if needed)
        if not processing_lang:
            try:
                lang_res = await self.language_provider.detect_language(audio_bytes, mime_type)
                detected_lang = lang_res.language_code
                processing_lang = detected_lang
            except Exception as e:
                logger.error(f"Pipeline ALD Error: {e}")
                raise Exception(f"Language detection failed: {e}")
        else:
            lang_source = "user_selected"

        # Step 2: ASR
        try:
            trans_res = await self.language_provider.transcribe(audio_bytes, mime_type, language_hint=processing_lang)
            
            # Override trans_res fields if user_selected
            if lang_source == "user_selected":
                trans_res.language_code = processing_lang
                trans_res.language_name = language_mapping.get(processing_lang, "Unknown")
                trans_res.language_mode = "monolingual"

        except Exception as e:
            logger.error(f"Pipeline ASR Error: {e}")
            raise Exception(f"Transcription failed: {e}")
            
        transcript_input = TranscriptInput(
            original_text=trans_res.original_text,
            language_code=trans_res.language_code,
            language_name=trans_res.language_name,
            language_mode=trans_res.language_mode
        )
        
        # Step 3: LLM Extraction
        try:
            profile = await self.extractor.extract(transcript_input, request_id)
        except Exception as e:
            logger.error(f"Pipeline LLM Extraction Error: {e}")
            raise Exception(f"Structured extraction failed: {e}")
            
        # Step 4: Skill Normalization
        try:
            normalized_skills = self.normalizer.normalize(profile.skills)
        except Exception as e:
            logger.error(f"Pipeline Normalization Error: {e}")
            raise Exception(f"Skill normalization failed: {e}")
            
        # Step 5: Recommendations & Gaps
        try:
            recommendations = await self.engine.recommend_roles(normalized_skills, DEVELOPMENT_ROLE_CATALOG)
        except Exception as e:
            logger.error(f"Pipeline Recommendation Error: {e}")
            raise Exception(f"Recommendation engine failed: {e}")
            
        # Step 6: Database Persistence
        persistence_status = "saved"
        try:
            repo = RecommendationRepository(self.db)
            await repo.save_transcript(
                request_id=request_id,
                original_text=transcript_input.original_text,
                code=transcript_input.language_code,
                name=transcript_input.language_name,
                provider=trans_res.provider
            )
            
            profile_id = str(uuid.uuid4())
            await repo.save_profile(
                profile_id=profile_id,
                profile_data=profile.model_dump(),
                skills=normalized_skills,
                transcript_id=request_id
            )
            
            for r in recommendations:
                await repo.save_recommendation(r, profile_id)
        except Exception as e:
            logger.error(f"Pipeline Persistence Error: {e}")
            persistence_status = "failed"
            
        return PipelineResponse(
            request_id=request_id,
            status="success",
            persistence_status=persistence_status,
            transcript=PipelineTranscript(
                original_text=transcript_input.original_text,
                language_code=transcript_input.language_code,
                language_name=transcript_input.language_name,
                language_mode=transcript_input.language_mode,
                provider=trans_res.provider,
                detected_language=detected_lang,
                processing_language=processing_lang,
                language_source=lang_source
            ),
            livelihood_profile=profile,
            normalized_skills=normalized_skills,
            recommendations=recommendations
        )
