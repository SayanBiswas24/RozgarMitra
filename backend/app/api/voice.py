"""
app/api/voice.py
─────────────────
FastAPI router for voice processing endpoints.

Endpoint:
  POST /api/voice/transcribe
    - Accepts multipart/form-data with an 'audio' file field.
    - Optional 'language_code' form field (ISO-639) to skip auto-detection.
    - Returns TranscribeResponse on success.
    - Returns ErrorDetail on failure.

Security:
  - API keys and authentication headers are never returned to the client.
  - Internal errors are mapped to safe, descriptive messages.
  - Audio bytes are discarded after processing; not written to disk.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.schemas.voice import (
    ASRProviderInfo,
    AudioInfo,
    ErrorDetail,
    LanguageInfo,
    TranscribeResponse,
    TranscriptInfo,
)
from app.services.audio_service import AudioService
from app.services.asr_service import (
    ASRError,
    AuthenticationError,
    BhashiniASRService,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from app.services.language_detector import (
    BhashiniLanguageDetector,
    LanguageDetectionError,
    ProviderUnavailableError as LangProviderUnavailableError,
    language_name_for_code,
)

router = APIRouter(prefix="/api/voice", tags=["voice"])
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Dependency factories (can be swapped for testing via FastAPI dependency override)
# ─────────────────────────────────────────────────────────────────────────────


def _get_audio_service() -> AudioService:
    return AudioService()


def _get_language_detector() -> BhashiniLanguageDetector:
    return BhashiniLanguageDetector()


def _get_asr_service() -> BhashiniASRService:
    return BhashiniASRService()


# ─────────────────────────────────────────────────────────────────────────────
# Route
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    status_code=status.HTTP_200_OK,
    summary="Transcribe an audio file to text",
    description=(
        "Upload an audio file to receive a multilingual transcript. "
        "Supported Indian languages include Hindi, Bengali, Bhojpuri, Maithili, "
        "Santali, and English. Provide `language_code` (ISO-639) to skip "
        "automatic language detection."
    ),
    responses={
        200: {"model": TranscribeResponse},
        400: {"model": ErrorDetail, "description": "Invalid or missing audio file"},
        415: {"model": ErrorDetail, "description": "Unsupported audio format"},
        422: {"model": ErrorDetail, "description": "Request validation error"},
        500: {"model": ErrorDetail, "description": "Internal server error"},
        502: {"model": ErrorDetail, "description": "ASR provider error"},
        503: {"model": ErrorDetail, "description": "ASR provider unavailable"},
        504: {"model": ErrorDetail, "description": "ASR provider timed out"},
    },
)
async def transcribe(
    audio: UploadFile = File(
        ...,
        description=(
            "Audio file in a supported format (WAV, WebM, OGG, MP3, MP4, FLAC, AAC, OPUS, 3GPP). "
            "Maximum size: 25 MB. Do NOT auto-record microphone — the user must explicitly upload."
        ),
    ),
    language_code: Optional[str] = Form(
        None,
        description=(
            "Optional ISO-639 language code (e.g. 'hi', 'bn', 'bho', 'mai', 'sat', 'en'). "
            "If supplied, language detection is skipped. "
            "If omitted, language is detected automatically from the audio."
        ),
    ),
) -> JSONResponse:
    """
    Process an uploaded audio file through the multilingual ASR pipeline.

    Pipeline:
      Audio Upload → Validation → Language Detection → ASR → Transcript Response
    """

    audio_svc = _get_audio_service()
    lang_detector = _get_language_detector()
    asr_svc = _get_asr_service()

    # ── 1. Validate and read audio ────────────────────────────────────────────
    validation = await audio_svc.validate_and_read(audio)

    if not validation.is_valid:
        code = validation.error_code
        http_status = (
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
            if code == "UNSUPPORTED_AUDIO_FORMAT"
            else status.HTTP_400_BAD_REQUEST
        )
        return JSONResponse(
            status_code=http_status,
            content=ErrorDetail(
                error_code=code,
                message=validation.error_message,
            ).model_dump(),
        )

    audio_bytes: bytes = validation.audio_bytes
    mime_type: str = validation.mime_type
    size_bytes: int = validation.size_bytes

    # ── 2. Language detection ─────────────────────────────────────────────────
    detected_code: str
    detected_name: Optional[str]
    detection_confidence: Optional[float]

    try:
        lang_result = await lang_detector.detect(
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            hint_language_code=language_code or None,
        )
        detected_code = lang_result.language_code
        detected_name = lang_result.language_name
        detection_confidence = lang_result.confidence

    except (LangProviderUnavailableError, LanguageDetectionError) as exc:
        logger.warning("voice_route: language detection unavailable: %s", str(exc))
        # If caller already knows the language, use it and continue.
        if language_code:
            detected_code = language_code
            detected_name = language_name_for_code(language_code)
            detection_confidence = None
        else:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content=ErrorDetail(
                    error_code="LANGUAGE_DETECTION_UNAVAILABLE",
                    message=(
                        "Automatic language detection is not available. "
                        "Please supply the 'language_code' parameter with your request."
                    ),
                ).model_dump(),
            )

    # ── 3. ASR transcription ──────────────────────────────────────────────────
    try:
        asr_result = await asr_svc.transcribe(
            audio_bytes=audio_bytes,
            language_code=detected_code,
            mime_type=mime_type,
        )

    except AuthenticationError:
        # Do NOT reveal key details.
        logger.error("voice_route: ASR provider authentication failure")
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(
                error_code="ASR_AUTHENTICATION_FAILURE",
                message="The ASR service could not authenticate. Please contact the administrator.",
            ).model_dump(),
        )

    except ProviderTimeoutError:
        logger.warning("voice_route: ASR provider timed out")
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content=ErrorDetail(
                error_code="ASR_PROVIDER_TIMEOUT",
                message="The ASR service did not respond in time. Please try again.",
            ).model_dump(),
        )

    except ProviderUnavailableError as exc:
        logger.warning("voice_route: ASR provider unavailable: %s", str(exc))
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ErrorDetail(
                error_code="ASR_PROVIDER_UNAVAILABLE",
                message=str(exc),
            ).model_dump(),
        )

    except ASRError as exc:
        logger.warning("voice_route: ASR error: %s", str(exc))
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(
                error_code="ASR_TRANSCRIPTION_FAILED",
                message="Transcription failed. The audio may be too noisy, too short, or corrupt.",
            ).model_dump(),
        )

    except Exception:
        logger.exception("voice_route: unexpected error during transcription")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorDetail(
                error_code="INTERNAL_SERVER_ERROR",
                message="An unexpected error occurred. Please try again later.",
            ).model_dump(),
        )

    # ── 4. Build and return response ──────────────────────────────────────────
    response = TranscribeResponse(
        success=True,
        language=LanguageInfo(
            code=detected_code,
            name=detected_name,
            confidence=detection_confidence,
        ),
        transcript=TranscriptInfo(
            original=asr_result.transcript,
            normalized=None,
        ),
        audio=AudioInfo(
            duration_seconds=None,
            mime_type=mime_type,
            size_bytes=size_bytes,
        ),
        asr=ASRProviderInfo(
            provider=asr_result.provider,
            model=asr_result.model,
            confidence=asr_result.confidence,
        ),
    )

    logger.info(
        "voice_route: transcription complete (lang=%s, provider=%s)",
        detected_code,
        asr_result.provider,
    )
    return JSONResponse(content=response.model_dump())
from app.services.providers.base import BaseLanguageProvider, ProviderNotConfiguredError as NewProviderNotConfiguredError, ProviderAuthenticationError, ProviderTimeoutError as NewProviderTimeoutError, ProviderMalformedResponseError
from app.services.providers.mock_provider import MockLanguageProvider
from app.services.providers.bhashini_provider import BhashiniLanguageProvider
import os
import uuid
from app.schemas.voice import ProcessResponse, ProcessLanguageInfo, ProcessTranscriptInfo, ProcessProcessingInfo

def _get_process_provider() -> BaseLanguageProvider:
    use_bhashini = os.getenv("LANGUAGE_PROVIDER", "mock").lower() == "bhashini"
    if use_bhashini:
        return BhashiniLanguageProvider()
    return MockLanguageProvider()

@router.post(
    "/process",
    response_model=ProcessResponse,
    status_code=status.HTTP_200_OK,
    summary="Process an audio file and return structured transcription",
)
async def process_audio(
    audio: UploadFile = File(...),
    language_hint: Optional[str] = Form(None)
) -> JSONResponse:
    request_id = str(uuid.uuid4())
    audio_svc = _get_audio_service()
    provider = _get_process_provider()

    validation = await audio_svc.validate_and_read(audio)
    if not validation.is_valid:
        code = validation.error_code
        http_status = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE if code == "UNSUPPORTED_AUDIO_FORMAT" else status.HTTP_400_BAD_REQUEST
        return JSONResponse(
            status_code=http_status,
            content=ErrorDetail(error_code=code, message=validation.error_message).model_dump(),
        )

    try:
        lang_res = await provider.detect_language(validation.audio_bytes, validation.mime_type)
        trans_res = await provider.transcribe(validation.audio_bytes, validation.mime_type, language_hint=language_hint or lang_res.language_code)
        
    except NewProviderNotConfiguredError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ErrorDetail(error_code="PROVIDER_NOT_CONFIGURED", message=str(exc)).model_dump()
        )
    except ProviderAuthenticationError:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(error_code="PROVIDER_AUTHENTICATION_FAILURE", message="Authentication failed.").model_dump()
        )
    except NewProviderTimeoutError:
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content=ErrorDetail(error_code="PROVIDER_TIMEOUT", message="Provider timed out.").model_dump()
        )
    except ProviderMalformedResponseError:
         return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(error_code="PROVIDER_MALFORMED_RESPONSE", message="Malformed response.").model_dump()
        )
    except Exception:
        logger.exception("Unexpected error")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorDetail(error_code="INTERNAL_SERVER_ERROR", message="Unexpected error.").model_dump()
        )
        
    response = ProcessResponse(
        request_id=request_id,
        status="success",
        language=ProcessLanguageInfo(
            code=trans_res.language_code,
            name=trans_res.language_name,
            confidence=trans_res.confidence
        ),
        transcript=ProcessTranscriptInfo(
            original_text=trans_res.original_text,
            provider=trans_res.provider
        ),
        processing=ProcessProcessingInfo(
            language_mode=trans_res.language_mode
        )
    )
    return JSONResponse(content=response.model_dump())

from app.schemas.livelihood import ExtractionRequest, ExtractionResponse
from app.services.extraction.base import ExtractorNotConfiguredError, ExtractorTimeoutError, ExtractorMalformedResponseError
from app.services.extraction.llm_extractor import LLMLivelihoodExtractor

def _get_extraction_provider():
    return LLMLivelihoodExtractor()

@router.post(
    "/extract",
    response_model=ExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract structured livelihood profile from transcript",
)
async def extract_livelihood(request: ExtractionRequest) -> JSONResponse:
    extractor = _get_extraction_provider()
    
    try:
        profile = await extractor.extract(request.transcript, request.request_id)
    except ExtractorNotConfiguredError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ErrorDetail(error_code="EXTRACTOR_NOT_CONFIGURED", message=str(exc)).model_dump()
        )
    except ValueError as exc:
        # Pydantic validation errors inside extract logic (e.g., negative experience)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ErrorDetail(error_code="VALIDATION_ERROR", message=str(exc)).model_dump()
        )
    except Exception as exc:
        logger.exception("Unexpected error in extraction")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorDetail(error_code="INTERNAL_SERVER_ERROR", message="Unexpected error.").model_dump()
        )
        
    response = ExtractionResponse(
        request_id=request.request_id,
        status="success",
        profile=profile,
        source={
            "language_code": request.transcript.language_code,
            "provider": getattr(extractor, 'provider', 'mock')
        }
    )
    return JSONResponse(content=response.model_dump())

from pydantic import BaseModel
from fastapi import Response

class SynthesizeRequest(BaseModel):
    text: str
    language_code: str

@router.post(
    "/synthesize",
    summary="Synthesize text to speech",
)
async def synthesize_audio(request: SynthesizeRequest):
    if not request.text.strip():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ErrorDetail(error_code="EMPTY_TEXT", message="Text cannot be empty.").model_dump()
        )
        
    provider = _get_process_provider()
    try:
        audio_bytes = await provider.synthesize(request.text, request.language_code)
        
        headers = {
            "X-Request-ID": str(uuid.uuid4()),
            "X-Status": "success",
            "X-Language-Code": request.language_code,
            "X-Provider": getattr(provider, "PROVIDER_NAME", "mock")
        }
        
        return Response(content=audio_bytes, media_type="audio/wav", headers=headers)
        
    except NewProviderNotConfiguredError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ErrorDetail(error_code="PROVIDER_NOT_CONFIGURED", message=str(exc)).model_dump()
        )
    except ProviderAuthenticationError:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(error_code="PROVIDER_AUTHENTICATION_FAILURE", message="Authentication failed.").model_dump()
        )
    except NewProviderTimeoutError:
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content=ErrorDetail(error_code="PROVIDER_TIMEOUT", message="Provider timed out.").model_dump()
        )
    except ProviderMalformedResponseError:
         return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(error_code="PROVIDER_MALFORMED_RESPONSE", message="Malformed response.").model_dump()
        )
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Unexpected error")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorDetail(error_code="INTERNAL_SERVER_ERROR", message="Unexpected error.").model_dump()
        )

from app.services.agent.service import get_agent_service
from app.services.agent.models import AgentConfidence, AgentConfidenceComponents

class AgentResponseModel(BaseModel):
    request_id: str
    session_id: str
    status: str
    ready_for_downstream_processing: bool
    user: dict
    assistant: dict
    profile: dict
    missing_fields: list
    tts: dict
    confidence: Optional[AgentConfidence] = None

@router.post(
    "/agent",
    response_model=AgentResponseModel,
    summary="Conversational agent turn",
)
async def agent_turn(
    audio: UploadFile = File(...),
    spoken_language: str = Form("auto"),
    assistant_language: Optional[str] = Form(None),
    session_id: str = Form(None),
    request_id: str = Form(None)
):
    req_id = str(uuid.uuid4())
    if not session_id:
        session_id = req_id
    
    # Idempotency check
    from app.services.agent.service import _SESSIONS
    if request_id and session_id in _SESSIONS:
        if request_id in _SESSIONS[session_id].processed_requests:
            return JSONResponse(status_code=409, content={"message": "Duplicate request detected."})
        if _SESSIONS[session_id].status == "completed":
            # Already completed, don't process further questions
            return JSONResponse(status_code=400, content={"message": "Profile collection already completed."})

        
    audio_svc = _get_audio_service()
    lang_provider = _get_process_provider()
    
    # 1. Validate audio
    validation = await audio_svc.validate_and_read(audio)
    if not validation.is_valid:
        return JSONResponse(
            status_code=400,
            content=ErrorDetail(error_code=validation.error_code, message=validation.error_message).model_dump()
        )
        
    try:
        # 2. Detect language
        if spoken_language == "auto":
            lang_res = await lang_provider.detect_language(validation.audio_bytes, validation.mime_type)
            detected_lang = lang_res.language_code
        else:
            detected_lang = spoken_language
            
        target_assistant_lang = assistant_language or detected_lang
            
        # 3. Transcribe
        trans_res = await lang_provider.transcribe(validation.audio_bytes, validation.mime_type, language_hint=detected_lang)
        original_text = trans_res.original_text
        
        # 4. Agent Response
        agent_svc = get_agent_service()
        agent_result = await agent_svc.generate_response(
            user_text=original_text,
            source_language=detected_lang,
            assistant_language=target_assistant_lang,
            session_id=session_id
        )
        agent_resp = agent_result["agent_response"]
        session_state = agent_result["session_state"]
        missing_fields = agent_result["missing_fields"]
        
        # 5. Synthesize Audio
        try:
            audio_bytes = await lang_provider.synthesize(agent_resp.response_text, agent_resp.language_code)
            
            import base64
            # We'll return base64 inline for the demo for simplicity, 
            # the prompt allows this or a reference. Base64 is easiest to hook into JS.
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            tts_info = {
                "provider": getattr(lang_provider, "PROVIDER_NAME", "mock"),
                "language_code": agent_resp.language_code,
                "content_type": "audio/wav",
                "audio_base64": audio_b64
            }
        except Exception as e:
            logger.warning(f"TTS Failed: {e}")
            tts_info = {
                "provider": "failed",
                "error": str(e)
            }
            
        
        # --- Calculate AI Understanding Confidence ---
        ald_conf = None
        if spoken_language == "auto" and 'lang_res' in locals():
            val = getattr(lang_res, "confidence", None)
            if val is not None:
                ald_conf = round(val * 100, 1)
                
        asr_conf = None
        val = getattr(trans_res, "confidence", None)
        if val is not None:
            asr_conf = round(val * 100, 1)
            
        # Extract completeness
        p = session_state.profile
        fields = [p.occupation, p.skills, p.experience_years, p.income_monthly, p.relocation_willing, p.certifications, p.major_certification, p.job_preference]
        filled = sum(1 for f in fields if f is not None and f != [] and f != "")
        profile_completeness_score = round((filled / 8.0) * 100, 1)
        
        # Skill Normalization (no genuine confidence score right now)
        skill_norm = None
        
        # If extraction failed due to JSON decode, score is 0, else we lack a reliable LLM confidence score without logprobs, so None
        ext_failed = getattr(agent_resp, "extraction_failed", False)
        ext_conf = 0.0 if ext_failed else None
            
        genuine_conf_signals = [ald_conf, asr_conf, ext_conf]
        valid_components = [c for c in genuine_conf_signals if c is not None]
        overall = round(sum(valid_components) / len(valid_components), 1) if valid_components else None
        
        if overall is None:
            label = "N/A"
        else:
            label = "High" if overall >= 80 else ("Medium" if overall >= 50 else "Low")
        
        confidence = AgentConfidence(
            overall=overall,
            label=label,
            components=AgentConfidenceComponents(
                speech_recognition=asr_conf,
                language_detection=ald_conf,
                extraction_confidence=ext_conf,
                profile_completeness=profile_completeness_score,
                skill_normalization=skill_norm
            )
        )
        
        if request_id and request_id not in session_state.processed_requests:
            session_state.processed_requests.append(request_id)
            
        return AgentResponseModel(
            request_id=req_id,
            session_id=session_id,
            status=session_state.status,
            ready_for_downstream_processing=(session_state.status == "completed"),
            user={
                "transcript": original_text,
                "language_code": detected_lang
            },
            assistant={
                "text": agent_resp.response_text,
                "language_code": agent_resp.language_code,
                "provider": os.getenv("LLM_PROVIDER", "mock"),
                "intent": getattr(agent_resp, "intent", ""),
                "should_continue": agent_resp.should_continue
            },
            profile=session_state.profile.model_dump(),
            missing_fields=missing_fields,
            confidence=confidence,
            tts=tts_info
        )
        
    except Exception as e:
        logger.exception("Agent turn failed")
        return JSONResponse(
            status_code=500,
            content=ErrorDetail(error_code="AGENT_ERROR", message=str(e)).model_dump()
        )

class TranslateRequest(BaseModel):
    text: str
    source_language: str
    target_language: str

class TranslateResponse(BaseModel):
    request_id: str
    status: str
    source_language: str
    target_language: str
    original_text: str
    translated_text: str
    provider: str

@router.post(
    "/translate",
    response_model=TranslateResponse,
    summary="Translate text",
)
async def translate_text(request: TranslateRequest):
    req_id = str(uuid.uuid4())
    provider = _get_process_provider()
    
    try:
        translated_text = await provider.translate(
            text=request.text,
            source_language=request.source_language,
            target_language=request.target_language
        )
        
        return TranslateResponse(
            request_id=req_id,
            status="success",
            source_language=request.source_language,
            target_language=request.target_language,
            original_text=request.text,
            translated_text=translated_text,
            provider=getattr(provider, "PROVIDER_NAME", "mock")
        )
        
    except NewProviderNotConfiguredError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ErrorDetail(error_code="PROVIDER_NOT_CONFIGURED", message=str(exc)).model_dump()
        )
    except ProviderAuthenticationError:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(error_code="PROVIDER_AUTHENTICATION_FAILURE", message="Authentication failed.").model_dump()
        )
    except NewProviderTimeoutError:
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content=ErrorDetail(error_code="PROVIDER_TIMEOUT", message="Provider timed out.").model_dump()
        )
    except ProviderMalformedResponseError:
         return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(error_code="PROVIDER_MALFORMED_RESPONSE", message="Malformed response.").model_dump()
        )
    except Exception as e:
        logger.exception("Unexpected error")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorDetail(error_code="INTERNAL_SERVER_ERROR", message=str(e)).model_dump()
        )

class TransliterateRequest(BaseModel):
    text: str
    source_language: str
    target_language: str

class TransliterateResponse(BaseModel):
    request_id: str
    status: str
    source_language: str
    target_language: str
    original_text: str
    transliterated_text: str
    provider: str

@router.post(
    "/transliterate",
    response_model=TransliterateResponse,
    summary="Transliterate text",
)
async def transliterate_text(request: TransliterateRequest):
    req_id = str(uuid.uuid4())
    provider = _get_process_provider()
    
    try:
        transliterated_text = await provider.transliterate(
            text=request.text,
            source_language=request.source_language,
            target_language=request.target_language
        )
        
        return TransliterateResponse(
            request_id=req_id,
            status="success",
            source_language=request.source_language,
            target_language=request.target_language,
            original_text=request.text,
            transliterated_text=transliterated_text,
            provider=getattr(provider, "PROVIDER_NAME", "mock")
        )
        
    except NewProviderNotConfiguredError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ErrorDetail(error_code="PROVIDER_NOT_CONFIGURED", message=str(exc)).model_dump()
        )
    except ProviderAuthenticationError:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(error_code="PROVIDER_AUTHENTICATION_FAILURE", message="Authentication failed.").model_dump()
        )
    except NewProviderTimeoutError:
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content=ErrorDetail(error_code="PROVIDER_TIMEOUT", message="Provider timed out.").model_dump()
        )
    except ProviderMalformedResponseError:
         return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(error_code="PROVIDER_MALFORMED_RESPONSE", message="Malformed response.").model_dump()
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("Unexpected error")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorDetail(error_code="INTERNAL_SERVER_ERROR", message=str(e)).model_dump()
        )

class OCRResponse(BaseModel):
    request_id: str
    status: str
    source_language: str
    text: str
    provider: str

@router.post(
    "/ocr",
    response_model=OCRResponse,
    summary="OCR an image",
)
async def process_ocr(
    image: UploadFile = File(...),
    source_language: str = Form("hi")
):
    req_id = str(uuid.uuid4())
    provider = _get_process_provider()
    
    try:
        # Validate MIME type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if image.content_type not in allowed_types:
            return JSONResponse(
                status_code=415,
                content=ErrorDetail(error_code="UNSUPPORTED_IMAGE_FORMAT", message="Supported formats: JPEG, PNG, WEBP").model_dump()
            )
            
        image_bytes = await image.read()
        if len(image_bytes) == 0:
            return JSONResponse(
                status_code=400,
                content=ErrorDetail(error_code="EMPTY_IMAGE", message="Image file is empty.").model_dump()
            )
            
        # Max size 10MB
        if len(image_bytes) > 10 * 1024 * 1024:
            return JSONResponse(
                status_code=400,
                content=ErrorDetail(error_code="FILE_TOO_LARGE", message="Image exceeds 10MB limit.").model_dump()
            )
            
        extracted_text = await provider.ocr(
            image_bytes=image_bytes,
            source_language=source_language,
            request_id=req_id
        )
        
        return OCRResponse(
            request_id=req_id,
            status="success",
            source_language=source_language,
            text=extracted_text,
            provider=getattr(provider, "PROVIDER_NAME", "mock")
        )
        
    except NewProviderNotConfiguredError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ErrorDetail(error_code="PROVIDER_NOT_CONFIGURED", message=str(exc)).model_dump()
        )
    except ProviderAuthenticationError:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(error_code="PROVIDER_AUTHENTICATION_FAILURE", message="Authentication failed.").model_dump()
        )
    except NewProviderTimeoutError:
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content=ErrorDetail(error_code="PROVIDER_TIMEOUT", message="Provider timed out.").model_dump()
        )
    except ProviderMalformedResponseError as e:
         return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content=ErrorDetail(error_code="PROVIDER_MALFORMED_RESPONSE", message=str(e)).model_dump()
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("Unexpected error")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorDetail(error_code="INTERNAL_SERVER_ERROR", message=str(e)).model_dump()
        )
