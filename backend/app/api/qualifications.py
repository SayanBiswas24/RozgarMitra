import logging
from typing import List
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.services.qualifications.repository import QualificationRepository
from app.services.qualifications.models import QualificationRecord

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/qualifications", tags=["qualifications"])

@router.get("/search", response_model=List[QualificationRecord], status_code=status.HTTP_200_OK)
async def search_qualifications(
    q: str = Query(..., description="Search query for qualification name or job role"),
    db: AsyncSession = Depends(get_db_session)
) -> JSONResponse:
    try:
        repo = QualificationRepository(db)
        results = await repo.search(q)
        return JSONResponse(content=[r.model_dump(mode="json") for r in results])
    except Exception as e:
        logger.error(f"Search API error: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error_code": "DB_ERROR", "message": "Failed to search qualifications."}
        )
