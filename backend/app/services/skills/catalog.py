from typing import Dict, List, Optional
from .models import SkillRequirement, Qualification

DEVELOPMENT_SKILL_CATALOG = {
    "Agriculture": {
        "category": "Agriculture",
        "aliases": ["kheti", "farming", "agriculture", "खेती", "खेती करना"]
    },
    "Tractor Operation": {
        "category": "Mechanical",
        "aliases": ["tractor chalata hoon", "tractor driving", "tractor operation"]
    },
    "Tractor Repair": {
        "category": "Mechanical",
        "aliases": ["tractor repair", "tractor repairing", "tractor fixing", "tractor theek karta hoon", "tractor thik karta hoon", "tractor repair karta hoon"]
    },
    "Welding": {
        "category": "Construction",
        "aliases": ["welding", "welder", "gas welding"]
    },
    "Electrical Repair": {
        "category": "Electrical",
        "aliases": ["electrical repair", "electrician", "bijli ka kaam"]
    },
    "Masonry": {
        "category": "Construction",
        "aliases": ["masonry", "mason", "rajmistri"]
    },
    "Carpentry": {
        "category": "Construction",
        "aliases": ["carpentry", "carpenter", "badhai"]
    },
    "Tailoring": {
        "category": "Apparel",
        "aliases": ["silai", "stitching", "tailoring", "सिलाई"]
    },
    "Driving": {
        "category": "Transport",
        "aliases": ["driving", "driver", "gadi chalana"]
    },
    "Mobile Phone Repair": {
        "category": "Electronics",
        "aliases": ["mobile phone repair", "mobile repair", "mobile theek karna"]
    }
}

DEVELOPMENT_ROLE_CATALOG = {
    "tractor_mechanic_demo": SkillRequirement(
        role_id="tractor_mechanic_demo",
        role_name="Tractor Mechanic",
        required_skills=["Tractor Repair", "Electrical Repair"]
    ),
    "farmer_demo": SkillRequirement(
        role_id="farmer_demo",
        role_name="Farmer",
        required_skills=["Agriculture"]
    ),
    "tailor_demo": SkillRequirement(
        role_id="tailor_demo",
        role_name="Tailor",
        required_skills=["Tailoring"]
    )
}

class QualificationCatalogProvider:
    def get_qualification(self, role_id: str) -> Qualification:
        raise NotImplementedError

class DevelopmentQualificationProvider(QualificationCatalogProvider):
    def get_qualification(self, role_id: str) -> Qualification:
        # Returns unverified/development structure with null NSQF fields
        return Qualification(
            qualification_id=None,
            qualification_name=None,
            nsqf_level=None,
            source="unverified/development"
        )
