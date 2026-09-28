import uuid
from typing import List, Dict
from app.services.skills.models import SkillRequirement, NormalizedSkill, Qualification
from .models import Recommendation, LearningPath
from app.services.skills.catalog import DevelopmentQualificationProvider
from app.services.qualifications.matcher import QualificationMatcher

class RecommendationEngine:
    def __init__(self, matcher: QualificationMatcher = None):
        self.matcher = matcher or QualificationMatcher()

    async def recommend_roles(
        self,
        normalized_skills: List[NormalizedSkill],
        available_roles: Dict[str, SkillRequirement]
    ) -> List[Recommendation]:
        
        user_canonical_skills = set()
        for ns in normalized_skills:
            if ns.canonical_name:
                user_canonical_skills.add(ns.canonical_name.lower())
                
        recommendations = []
        
        for role_id, role in available_roles.items():
            matched = []
            missing = []
            
            for req in role.required_skills:
                if req.lower() in user_canonical_skills:
                    matched.append(req)
                else:
                    missing.append(req)
                    
            total = len(role.required_skills)
            if total == 0:
                match_pct = 100.0
            else:
                match_pct = round((len(matched) / total) * 100, 2)
                
            # Deterministic reason
            reason_parts = []
            if matched:
                reason_parts.append(f"The profile contains {', '.join(matched)}.")
            else:
                reason_parts.append("The profile does not contain any of the required skills.")
                
            if missing:
                reason_parts.append(f"This role requires {', '.join(missing)} which is missing from the profile.")
            else:
                reason_parts.append("All required skills for this role are met.")
                
            reason = " ".join(reason_parts)
            
            learning_path = []
            for m in missing:
                learning_path.append(LearningPath(
                    skill=m,
                    priority="required_for_role",
                    reason="This skill is required by the selected development role but is not present in the beneficiary profile."
                ))
                
            match_record = await self.matcher.match_role(role_id, role.role_name)
            qual = Qualification(
                qualification_id=match_record.qualification_id,
                qualification_name=match_record.qualification_name,
                nsqf_level=match_record.nsqf_level,
                source=match_record.source_type
            )
            data_status = match_record.data_status

            
            recommendations.append(Recommendation(
                recommendation_id=str(uuid.uuid4()),
                role_id=role_id,
                role_name=role.role_name,
                matched_skills=matched,
                missing_skills=missing,
                match_percentage=match_pct,
                reason=reason,
                qualification=qual,
                data_status=data_status,
                learning_path=learning_path if missing else None
            ))
            
        # Sort descending by match percentage
        recommendations.sort(key=lambda x: x.match_percentage, reverse=True)
        return recommendations
