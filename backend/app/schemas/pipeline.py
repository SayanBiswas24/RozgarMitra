from typing import List, Optional
from pydantic import BaseModel
from .voice import Transcript
from .livelihood import LivelihoodProfile
from app.services.skills.models import NormalizedSkill
from app.services.recommendation.models import Recommendation

class PipelineTranscript(BaseModel):
    original_text: str
    language_code: str
    language_name: str
    language_mode: str
    provider: str
    detected_language: Optional[str] = None
    processing_language: Optional[str] = None
    language_source: Optional[str] = "ald"

class PipelineResponse(BaseModel):
    request_id: str
    status: str
    persistence_status: str
    transcript: PipelineTranscript
    livelihood_profile: LivelihoodProfile
    normalized_skills: List[NormalizedSkill]
    recommendations: List[Recommendation]
