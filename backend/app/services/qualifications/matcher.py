from typing import Optional, List
from .models import QualificationRecord
from app.services.skills.catalog import DevelopmentQualificationProvider

class QualificationMatcher:
    def __init__(self, repository=None):
        self.repository = repository
        self.dev_provider = DevelopmentQualificationProvider()
        
    async def match_role(self, role_id: str, role_name: str) -> QualificationRecord:
        # 1. Check official DB if configured
        if self.repository:
            official = await self.repository.get_by_job_role(role_name)
            if official:
                return official
                
        # 2. Check development catalog
        from app.services.skills.catalog import DEVELOPMENT_ROLE_CATALOG
        dev = self.dev_provider.get_qualification(role_id) if role_id in DEVELOPMENT_ROLE_CATALOG else None
        if dev and dev.source == "unverified/development":
            return QualificationRecord(
                qualification_id=dev.qualification_id,
                qualification_name=dev.qualification_name,
                job_role=role_name,
                nsqf_level=dev.nsqf_level,
                source_type="DEVELOPMENT",
                data_status="development"
            )
            
        # 3. Fallback to unverified
        return QualificationRecord(
            job_role=role_name,
            source_type="UNVERIFIED",
            data_status="unverified"
        )
