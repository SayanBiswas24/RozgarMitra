import os
import json
import logging
import httpx
from typing import Optional
from pydantic import ValidationError
from app.schemas.livelihood import LivelihoodProfile, TranscriptInput
from .base import BaseLivelihoodExtractor, ExtractorNotConfiguredError, ExtractorTimeoutError, ExtractorMalformedResponseError

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a livelihood information extraction system.
Extract only facts explicitly stated in the transcript.
Do not infer or hallucinate missing information.
Return structured JSON matching the supplied schema.
Preserve the meaning of multilingual and code-switched speech.
Normalize obvious linguistic variations only when the meaning is explicit.
Translate and output all extracted string fields in English.

Respond ONLY with valid JSON. Do not include markdown formatting (like ```json).
The JSON must have the following structure:
{
  "occupation": "string or null",
  "skills": ["array of strings"],
  "experience_years": "number or null",
  "work_description": "string or null",
  "education": "string or null",
  "interests": ["array of strings"],
  "employment_preference": "string or null",
  "extraction_confidence": "High"
}
If information is missing, leave the field as null or an empty array.
"""

class RealLLMExtractor(BaseLivelihoodExtractor):
    def __init__(self, provider: str, api_key: str, model: str, base_url: Optional[str] = None):
        self.provider = provider
        self.api_key = api_key
        self.model = model
        
        # Default base URLs for known providers if not explicitly set
        if base_url:
            self.base_url = base_url
        elif provider == "openai":
            self.base_url = "https://api.openai.com/v1"
        elif provider == "gemini":
            self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
        elif provider == "ollama":
            self.base_url = "http://localhost:11434/v1"
        else:
            self.base_url = "https://api.openai.com/v1"

    async def extract(self, transcript: TranscriptInput, request_id: str) -> LivelihoodProfile:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        user_message = f"Transcript ({transcript.language_name}): {transcript.original_text}"
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                resp.raise_for_status()
                data = resp.json()
        except httpx.TimeoutException:
            logger.error("LLM Provider Timeout.")
            raise ExtractorTimeoutError("The LLM provider timed out.")
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM Provider HTTP Error: {e.response.status_code}")
            raise ExtractorMalformedResponseError(f"Provider returned error: {e.response.status_code}")
        except Exception as e:
            logger.error(f"LLM Request Failed: {e}")
            raise ExtractorMalformedResponseError("Failed to connect to LLM provider.")

        try:
            content = data["choices"][0]["message"]["content"]
            # Clean up possible markdown code blocks if the model ignored the system prompt
            if content.startswith("```json"):
                content = content[7:-3]
            elif content.startswith("```"):
                content = content[3:-3]
                
            parsed = json.loads(content)
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            logger.error(f"LLM returned malformed JSON: {e}")
            raise ExtractorMalformedResponseError("The provider did not return valid JSON.")

        try:
            profile = LivelihoodProfile(
                occupation=parsed.get("occupation"),
                skills=parsed.get("skills", []),
                experience_years=parsed.get("experience_years"),
                work_description=parsed.get("work_description"),
                education=parsed.get("education"),
                interests=parsed.get("interests", []),
                employment_preference=parsed.get("employment_preference"),
                source_transcript_id=request_id,
                source_language=transcript.language_code,
                extraction_confidence=parsed.get("extraction_confidence", "High")
            )
            return profile
        except ValidationError as e:
            logger.error(f"Pydantic validation failed on LLM output: {e}")
            raise ValueError(f"Extracted data is invalid: {e}")

class LLMLivelihoodExtractor(BaseLivelihoodExtractor):
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "mock").lower()
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.model = os.getenv("LLM_MODEL", "gpt-4o-mini")
        self.base_url = os.getenv("LLM_BASE_URL")

    async def extract(self, transcript: TranscriptInput, request_id: str) -> LivelihoodProfile:
        if self.provider == "mock":
            from .mock_extractor import MockLivelihoodExtractor
            return await MockLivelihoodExtractor().extract(transcript, request_id)
            
        if not self.api_key and self.provider != "ollama":
            raise ExtractorNotConfiguredError("LLM_API_KEY is not set.")
            
        real_extractor = RealLLMExtractor(self.provider, self.api_key, self.model, self.base_url)
        return await real_extractor.extract(transcript, request_id)
