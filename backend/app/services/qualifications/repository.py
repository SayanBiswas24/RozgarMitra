import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import QualificationDB
from .models import QualificationRecord

logger = logging.getLogger(__name__)

class QualificationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
        
    async def get_by_job_role(self, job_role: str) -> Optional[QualificationRecord]:
        try:
            stmt = select(QualificationDB).where(
                QualificationDB.job_role == job_role,
                QualificationDB.data_status == "verified"
            ).limit(1)
            result = await self.session.execute(stmt)
            row = result.scalars().first()
            if row:
                return QualificationRecord(
                    qualification_id=row.id,
                    qualification_code=row.qualification_code,
                    qualification_name=row.qualification_name,
                    job_role=row.job_role,
                    nsqf_level=row.nsqf_level,
                    awarding_body=row.awarding_body,
                    sector=row.sector,
                    status=row.status,
                    source_type=row.source_type,
                    data_status=row.data_status,
                    last_verified=row.last_verified
                )
        except Exception as e:
            logger.error(f"DB Error getting qualification: {e}")
        return None
        
    async def save(self, record: QualificationRecord):
        try:
            db_record = QualificationDB(
                id=record.qualification_id,
                qualification_code=record.qualification_code,
                qualification_name=record.qualification_name,
                job_role=record.job_role,
                nsqf_level=record.nsqf_level,
                awarding_body=record.awarding_body,
                sector=record.sector,
                status=record.status,
                source_type=record.source_type,
                data_status=record.data_status,
                last_verified=record.last_verified
            )
            self.session.add(db_record)
            await self.session.commit()
        except Exception as e:
            logger.error(f"DB Error saving qualification: {e}")
            await self.session.rollback()

    async def search(self, query: str) -> List[QualificationRecord]:
        try:
            # Simple ilike search for API
            stmt = select(QualificationDB).where(
                QualificationDB.qualification_name.ilike(f"%{query}%") |
                QualificationDB.job_role.ilike(f"%{query}%")
            )
            result = await self.session.execute(stmt)
            rows = result.scalars().all()
            return [
                QualificationRecord(
                    qualification_id=r.id,
                    qualification_code=r.qualification_code,
                    qualification_name=r.qualification_name,
                    job_role=r.job_role,
                    nsqf_level=r.nsqf_level,
                    awarding_body=r.awarding_body,
                    sector=r.sector,
                    status=r.status,
                    source_type=r.source_type,
                    data_status=r.data_status,
                    last_verified=r.last_verified
                ) for r in rows
            ]
        except Exception as e:
            logger.error(f"DB Error searching qualifications: {e}")
            return []
