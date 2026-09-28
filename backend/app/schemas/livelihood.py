from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class LivelihoodProfile(BaseModel):
    occupation: Optional[str] = Field(None, description="Current or stated occupation.")
    skills: List[str] = Field(default_factory=list, description="List of skills.")
    experience_years: Optional[float] = Field(None, ge=0, description="Years of experience.")
    work_description: Optional[str] = Field(None, description="Description of the work performed.")
    education: Optional[str] = Field(None, description="Highest educational qualification.")
    interests: List[str] = Field(default_factory=list, description="Areas of interest.")
    employment_preference: Optional[str] = Field(None, description="Preference for future employment.")

    source_transcript_id: Optional[str] = Field(None, description="Request ID from transcription phase.")
    source_language: Optional[str] = Field(None, description="Language code of the source transcript.")
    extraction_confidence: Optional[str] = Field(None, description="Qualitative confidence (e.g., High, Medium, Low).")

    @field_validator('skills', 'interests')
    @classmethod
    def no_empty_strings(cls, v: List[str]) -> List[str]:
        if any(not s.strip() for s in v):
            raise ValueError("List must not contain empty or whitespace-only strings.")
        return v

class TranscriptInput(BaseModel):
    original_text: str
    language_code: str
    language_name: str
    language_mode: str

class ExtractionRequest(BaseModel):
    request_id: str
    transcript: TranscriptInput

class ExtractionResponse(BaseModel):
    request_id: str
    status: str
    profile: LivelihoodProfile
    source: dict
