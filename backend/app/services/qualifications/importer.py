import logging
from typing import List, Dict, Any
from .models import QualificationRecord

logger = logging.getLogger(__name__)

class QualificationImporter:
    """
    Boundary for importing official qualification exports (e.g. NCVET CSV/JSON).
    Currently implemented as an empty boundary pending availability of 
    machine-readable official NQR data for PM-AJAY.
    """
    def __init__(self, repository):
        self.repository = repository
        
    async def import_from_json(self, records: List[Dict[str, Any]]) -> int:
        imported = 0
        for data in records:
            # Map raw fields to QualificationRecord
            try:
                rec = QualificationRecord(
                    qualification_id=data.get("id"),
                    qualification_code=data.get("code"),
                    qualification_name=data.get("name"),
                    job_role=data.get("job_role"),
                    nsqf_level=data.get("nsqf_level"),
                    awarding_body=data.get("awarding_body"),
                    sector=data.get("sector"),
                    status=data.get("status"),
                    source_type="NCVET_NQR",
                    data_status="verified"
                )
                await self.repository.save(rec)
                imported += 1
            except Exception as e:
                logger.error(f"Failed to import record: {e}")
                
        return imported
