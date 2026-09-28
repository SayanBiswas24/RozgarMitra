from typing import List, Optional
from .models import SkillGapResult, SkillRequirement
from .catalog import DEVELOPMENT_ROLE_CATALOG, DevelopmentQualificationProvider

class SkillGapEngine:
    def __init__(self):
        self.qual_provider = DevelopmentQualificationProvider()

    def calculate_gap(self, target_role_id: str, available_skills: List[str]) -> Optional[SkillGapResult]:
        if target_role_id not in DEVELOPMENT_ROLE_CATALOG:
            return None
            
        role: SkillRequirement = DEVELOPMENT_ROLE_CATALOG[target_role_id]
        
        matched = []
        missing = []
        
        avail_set = {s.lower() for s in available_skills}
        
        for req in role.required_skills:
            if req.lower() in avail_set:
                matched.append(req)
            else:
                missing.append(req)
                
        total = len(role.required_skills)
        if total == 0:
            match_percentage = 100.0
        else:
            match_percentage = round((len(matched) / total) * 100, 2)
            
        qual = self.qual_provider.get_qualification(target_role_id)
        
        return SkillGapResult(
            target_role={"id": role.role_id, "name": role.role_name},
            matched_skills=matched,
            missing_skills=missing,
            match_percentage=match_percentage,
            qualification=qual,
            data_status="development"
        )
