from typing import List, Optional
from pydantic import BaseModel
from app.services.skills.models import Qualification

class LearningPath(BaseModel):
    skill: str
    priority: str
    reason: str

class Recommendation(BaseModel):
    recommendation_id: str
    role_id: str
    role_name: str
    matched_skills: List[str]
    missing_skills: List[str]
    match_percentage: float
    reason: str
    qualification: Qualification
    data_status: str
    learning_path: Optional[List[LearningPath]] = None
