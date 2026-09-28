from typing import List
from .models import NormalizedSkill
from .catalog import DEVELOPMENT_SKILL_CATALOG

class SkillNormalizer:
    def __init__(self):
        # Build inverted index for fast lookup
        self.alias_map = {}
        for canonical_name, data in DEVELOPMENT_SKILL_CATALOG.items():
            self.alias_map[canonical_name.lower()] = canonical_name
            for alias in data["aliases"]:
                self.alias_map[alias.lower()] = canonical_name

    def normalize(self, raw_skills: List[str]) -> List[NormalizedSkill]:
        normalized = []
        for raw in raw_skills:
            key = raw.strip().lower()
            if key in self.alias_map:
                normalized.append(NormalizedSkill(
                    raw_skill=raw,
                    canonical_name=self.alias_map[key],
                    normalization_status="matched",
                    normalization_method="alias_match"
                ))
            else:
                normalized.append(NormalizedSkill(
                    raw_skill=raw,
                    canonical_name=None,
                    normalization_status="unmatched",
                    normalization_method=None
                ))
        return normalized
