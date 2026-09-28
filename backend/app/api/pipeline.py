import uuid
import logging
from fastapi import APIRouter, status, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.services.audio_service import AudioService
from app.services.pipeline.orchestrator import LivelihoodPipeline
from app.schemas.pipeline import PipelineResponse
from app.schemas.voice import ErrorDetail

# Provider imports
import os
from app.services.providers.base import BaseLanguageProvider
from app.services.providers.mock_provider import MockLanguageProvider
from app.services.providers.bhashini_provider import BhashiniLanguageProvider
from app.services.extraction.llm_extractor import LLMLivelihoodExtractor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

def get_language_provider() -> BaseLanguageProvider:
    if os.getenv("LANGUAGE_PROVIDER", "mock").lower() == "bhashini":
        return BhashiniLanguageProvider()
    return MockLanguageProvider()

def get_extraction_provider() -> LLMLivelihoodExtractor:
    return LLMLivelihoodExtractor()

def get_audio_service() -> AudioService:
    return AudioService()

@router.post("", response_model=PipelineResponse, status_code=status.HTTP_200_OK)
async def run_pipeline(
    audio: UploadFile = File(...),
    language_code: str = Form("auto"),
    db: AsyncSession = Depends(get_db_session),
    audio_svc: AudioService = Depends(get_audio_service),
    lang_provider: BaseLanguageProvider = Depends(get_language_provider),
    extractor: LLMLivelihoodExtractor = Depends(get_extraction_provider)
) -> JSONResponse:
    request_id = str(uuid.uuid4())
    
    validation = await audio_svc.validate_and_read(audio)
    if not validation.is_valid:
        code = validation.error_code
        http_status = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE if code == "UNSUPPORTED_AUDIO_FORMAT" else status.HTTP_400_BAD_REQUEST
        return JSONResponse(
            status_code=http_status,
            content=ErrorDetail(error_code=code, message=validation.error_message).model_dump(),
        )
        
    pipeline = LivelihoodPipeline(lang_provider, extractor, db)
    
    try:
        response = await pipeline.process(validation.audio_bytes, validation.mime_type, request_id, language_code)
        return JSONResponse(content=response.model_dump())
    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}")
        # In a real app we might want to map specific provider errors to 502/503/504
        # but the prompt asked for "A failure at one stage must produce a clear application error."
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorDetail(error_code="PIPELINE_ERROR", message=str(e)).model_dump()
        )
