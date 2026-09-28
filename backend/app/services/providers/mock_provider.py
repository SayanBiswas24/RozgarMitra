from typing import Optional
from .base import BaseLanguageProvider, LanguageDetectionResult, TranscriptionResult

class MockLanguageProvider(BaseLanguageProvider):
    PROVIDER_NAME = "mock"
    
    async def detect_language(self, audio_bytes: bytes, mime_type: str) -> LanguageDetectionResult:
        if b"bhojpuri" in audio_bytes:
            return LanguageDetectionResult(language_code="bho", language_name="Bhojpuri", confidence=0.96)
        if b"maithili" in audio_bytes:
            return LanguageDetectionResult(language_code="mai", language_name="Maithili", confidence=0.96)
        if b"english" in audio_bytes:
            return LanguageDetectionResult(language_code="en", language_name="English", confidence=0.96)
        if b"mixed" in audio_bytes:
            return LanguageDetectionResult(language_code="hi", language_name="Hindi", confidence=0.96)
        return LanguageDetectionResult(language_code="hi", language_name="Hindi", confidence=0.96)
        
    async def transcribe(self, audio_bytes: bytes, mime_type: str, language_hint: Optional[str] = None) -> TranscriptionResult:
        code = language_hint or "hi"
        
        # Override with audio content if present
        if b"bhojpuri" in audio_bytes:
            code = "bho"
        elif b"maithili" in audio_bytes:
            code = "mai"
        elif b"english" in audio_bytes:
            code = "en"
        elif b"mixed" in audio_bytes:
            return TranscriptionResult(
                original_text="Hum farming karte hain aur tractor repair bhi karta hoon.",
                language_code="hi",
                language_name="Hindi",
                confidence=0.96,
                provider=self.PROVIDER_NAME,
                language_mode="code_switched"
            )
            
        texts = {
            "hi": "मैं खेती करता हूं और ट्रैक्टर की मरम्मत भी करता हूं।",
            "bho": "हम खेती करिला आ ट्रैक्टर भी ठीक करिला।",
            "mai": "हम खेती करैत छी आ मशीनक मरम्मति सेहो करैत छी।",
            "en": "I work in farming and also repair tractors.",
        }
        names = {
            "hi": "Hindi",
            "bho": "Bhojpuri",
            "mai": "Maithili",
            "en": "English",
        }
        return TranscriptionResult(
            original_text=texts.get(code, texts.get("hi")),
            language_code=code,
            language_name=names.get(code, "Unknown"),
            confidence=0.96,
            provider=self.PROVIDER_NAME,
            language_mode="monolingual"
        )
        
    async def synthesize(self, text: str, language: str) -> bytes:
        return b"mock_audio"

    async def translate(self, text: str, source_language: str, target_language: str) -> str:
        if source_language == target_language:
            return text
        if text.strip() == "":
            return ""
        return f"Mock translation of '{text}' from {source_language} to {target_language}"

    async def transliterate(self, text: str, source_language: str, target_language: str) -> str:
        if text.strip() == "":
            return ""
        if "किसान" in text:
            return "main kisan hoon"
        return f"Mock transliteration of '{text}' from {source_language} to {target_language}"

    async def ocr(self, image_bytes: bytes, source_language: str, request_id: Optional[str] = None) -> str:
        if len(image_bytes) == 0:
            return ""
        return "Name: Vijay Prasad\nOccupation: Farmer"
