from typing import List, Optional
from pydantic import BaseModel, Field

class NormalizedSkill(BaseModel):
    raw_skill: str = Field(..., description="The original raw skill string.")
    canonical_name: Optional[str] = Field(None, description="The standardized skill name from the catalog.")
    normalization_status: str = Field(..., description="'matched' or 'unmatched'")
    normalization_method: Optional[str] = Field(None, description="'alias_match', etc.")
    
class SkillRequirement(BaseModel):
    role_id: str
    role_name: str
    required_skills: List[str]

class Qualification(BaseModel):
    qualification_id: Optional[str] = None
    qualification_name: Optional[str] = None
    nsqf_level: Optional[int] = None
    source: Optional[str] = None

class SkillGapResult(BaseModel):
    target_role: dict
    matched_skills: List[str]
    missing_skills: List[str]
    match_percentage: float
    qualification: Qualification
    data_status: str
