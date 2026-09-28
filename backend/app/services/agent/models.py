from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

class LivelihoodProfile(BaseModel):
    # Identity
    name: Optional[str] = None
    location: Optional[str] = None
    
    # Livelihood
    occupation: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience_years: Optional[int] = None
    work_description: Optional[str] = None
    
    # Economic
    income_monthly: Optional[int] = None
    income_frequency: Optional[str] = None
    
    # Education
    education: Optional[str] = None
    certifications: List[str] = Field(default_factory=list)
    major_certification: Optional[bool] = None
    
    # Preference
    job_preference: Optional[str] = None
    preferred_work_type: Optional[str] = None
    expected_income: Optional[int] = None
    relocation_willing: Optional[bool] = None

class AgentExtraction(BaseModel):
    # Partial profile containing ONLY what was extracted from the current turn
    name: Optional[str] = None
    location: Optional[str] = None
    occupation: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    work_description: Optional[str] = None
    income_monthly: Optional[int] = None
    income_frequency: Optional[str] = None
    education: Optional[str] = None
    certifications: Optional[List[str]] = None
    major_certification: Optional[bool] = None
    job_preference: Optional[str] = None
    preferred_work_type: Optional[str] = None
    expected_income: Optional[int] = None
    relocation_willing: Optional[bool] = None

class AgentResponse(BaseModel):
    response_text: str = Field(..., description="The assistant's natural language response.")
    language_code: str = Field(..., description="The ISO-639 language code of the response.")
    intent: str = Field("livelihood_followup", description="The classified intent of this turn.")
    target_field: Optional[str] = Field(None, description="The specific missing field this question is targeting.")
    should_continue: bool = Field(True, description="Whether the conversation should continue.")
    extraction_failed: bool = False
    extracted_info: Optional[AgentExtraction] = Field(None, description="Newly extracted structured information from the current turn ONLY.")

class ConversationTurn(BaseModel):
    role: str
    transcript: str
    language: str
    turn_id: int

class SessionState(BaseModel):
    session_id: str
    profile: LivelihoodProfile = Field(default_factory=LivelihoodProfile)
    answered_fields: Dict[str, bool] = Field(default_factory=dict)
    last_asked_field: Optional[str] = None
    conversation_history: List[ConversationTurn] = Field(default_factory=list)
    status: str = "collecting"
    turn_count: int = 0
    processed_requests: List[str] = Field(default_factory=list)

class AgentConfidenceComponents(BaseModel):
    speech_recognition: Optional[float] = None
    language_detection: Optional[float] = None
    extraction_confidence: Optional[float] = None
    profile_completeness: Optional[float] = None
    skill_normalization: Optional[float] = None

class AgentConfidence(BaseModel):
    overall: Optional[float] = None
    label: str
    components: AgentConfidenceComponents
