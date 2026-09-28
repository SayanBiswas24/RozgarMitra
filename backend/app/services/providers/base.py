from abc import ABC, abstractmethod
from typing import Optional, List
from pydantic import BaseModel

class LanguageDetectionResult(BaseModel):
    language_code: str
    language_name: str
    confidence: Optional[float] = None
    alternatives: List[dict] = []

class TranscriptionResult(BaseModel):
    original_text: str
    language_code: str
    language_name: str
    confidence: Optional[float] = None
    provider: str
    language_mode: str = "monolingual"

class BaseLanguageProvider(ABC):
    @abstractmethod
    async def detect_language(self, audio_bytes: bytes, mime_type: str) -> LanguageDetectionResult:
        pass
        
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, mime_type: str, language_hint: Optional[str] = None) -> TranscriptionResult:
        pass
        
    @abstractmethod
    async def synthesize(self, text: str, language: str) -> bytes:
        pass

    @abstractmethod
    async def translate(self, text: str, source_language: str, target_language: str) -> str:
        pass

    @abstractmethod
    async def transliterate(self, text: str, source_language: str, target_language: str) -> str:
        pass

    @abstractmethod
    async def ocr(self, image_bytes: bytes, source_language: str, request_id: Optional[str] = None) -> str:
        pass




class ProviderNotConfiguredError(Exception):
    pass
    
class ProviderTimeoutError(Exception):
    pass
    
class ProviderAuthenticationError(Exception):
    pass
    
class ProviderMalformedResponseError(Exception):
    pass
