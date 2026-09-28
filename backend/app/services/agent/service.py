import os
import json
import logging
import httpx
from typing import Optional, List
from pydantic import ValidationError
from app.services.agent.models import AgentResponse, AgentExtraction, SessionState, ConversationTurn

logger = logging.getLogger(__name__)

# Lightweight in-memory session store
_SESSIONS = {}

REQUIRED_PROFILE_FIELDS = [
    "occupation",
    "skills",
    "experience_years",
    "income_monthly",
    "relocation_willing",
    "certifications"
]

SYSTEM_PROMPT = """You are a highly efficient Voice Agent collecting livelihood profiles from rural users.
Your goal is to build a structured profile by asking follow-up questions.

IMPORTANT RULES:
1. Extract any relevant livelihood information from the user's latest message. Put this in 'extracted_info'.
2. If the user explicitly answers negatively (e.g., "I don't have any certificates", "no skills", "none"), you MUST extract an empty list [] or false so the system registers it as answered. Do NOT leave it null.
3. NEVER ask the user for information that already exists in the KNOWN PROFILE or ANSWERED FIELDS.
4. Review the MISSING FIELDS list. Ask ONE short, natural question to collect the NEXT missing field.
5. Identify the exact field you are asking about and output it in 'target_field'. If you are confirming, set it to "confirmation".
6. If there are no missing fields left, summarize the collected profile, ask for confirmation, and set should_continue=False.
7. If the user is responding to your confirmation summary:
   - If they confirm it is correct, set intent='profile_confirmed'.
   - If they reject or correct something, extract the new info and set intent='profile_correction'.
8. Return strictly valid JSON.
9. IMPORTANT: The user-facing 'response_text' MUST be in the exact target assistant language requested at the end of the prompt.
10. CRITICAL: The 'extracted_info' MUST ALWAYS be in canonical English. Do NOT translate structured profile fields (like skills, occupation) into the user's language. Normalize them to standard English.

Expected JSON format:
{
    "response_text": "string",
    "language_code": "string",
    "intent": "string",
    "target_field": "string or null",
    "should_continue": boolean,
    "extracted_info": {
        "occupation": "string or null",
        "skills": ["string"] or null,
        "experience_years": integer or null,
        "income_monthly": integer or null,
        "relocation_willing": boolean or null,
        "certifications": ["string"] or null,
        "major_certification": boolean or null,
        "job_preference": "string or null"
    }
}
"""

def merge_profiles(session, extracted: AgentExtraction):
    if not extracted:
        return
    
    # We use exclude_unset=True to know exactly what fields the LLM provided an answer for.
    # We DO NOT exclude_none because an explicit null/empty might be a valid explicit answer.
    data = extracted.model_dump(exclude_unset=True)
    
    for k, v in data.items():
        if v is None:
            # LLM output null (e.g. per prompt instructions for missing fields)
            continue
            
        # Record this field as definitively answered by the user for this session
        session.answered_fields[k] = True
        current_val = getattr(session.profile, k)
        
        if isinstance(v, list):
            # If the user explicitly answered with an empty list (e.g. no skills, no certs),
            # it stays empty list, and since answered_fields[k]=True, we won't ask again.
            if len(v) == 0:
                if current_val is None:
                    setattr(session.profile, k, [])
            else:
                if current_val is None:
                    current_val = []
                merged_list = list(dict.fromkeys(current_val + v))
                setattr(session.profile, k, merged_list)
        else:
            # Overwrite scalar values (latest correction wins)
            setattr(session.profile, k, v)

def get_missing_fields(session) -> List[str]:
    missing = []
    for f in REQUIRED_PROFILE_FIELDS:
        # Rely strictly on the authoritative backend answered_fields state
        if not session.answered_fields.get(f, False):
            missing.append(f)
    return missing

class MockConversationalAgentService:
    async def generate_response(
        self,
        user_text: str,
        source_language: str,
        assistant_language: str,
        session_id: str
    ) -> dict:
        
        if session_id not in _SESSIONS:
            _SESSIONS[session_id] = SessionState(session_id=session_id)
            
        session = _SESSIONS[session_id]
        session.turn_count += 1
        
        session.conversation_history.append(ConversationTurn(
            role="user",
            transcript=user_text,
            language=source_language,
            turn_id=session.turn_count
        ))
        
        # Simple deterministic mock logic
        extracted = AgentExtraction()
        
        response_text = "What else do you do?"
        should_continue = True
        
        if "farmer" in user_text.lower() or "किसान" in user_text:
            extracted.occupation = "Farmer"
        if "solar" in user_text.lower() or "सोलर" in user_text:
            extracted.skills = ["Solar Panel Installation"]
        if "five" in user_text.lower() or "पांच" in user_text:
            extracted.experience_years = 5
            
        merge_profiles(session, extracted)
        missing = get_missing_fields(session)
        
        if session.status == "awaiting_confirmation":
            if "yes" in user_text.lower() or "हाँ" in user_text:
                session.status = "completed"
                response_text = "Profile confirmed."
            else:
                session.status = "collecting"
                response_text = "Please provide the correction."
                should_continue = True
        elif len(missing) == 0:
            should_continue = False
            lang_name = LANG_NAME_MAP.get(assistant_language, assistant_language)
            response_text = f"Thank you, I have all the information. Is this correct? [Language: {lang_name}]"
            session.status = "awaiting_confirmation"
        else:
            session.status = "collecting"
            
        session.turn_count += 1
        session.conversation_history.append(ConversationTurn(
            role="assistant",
            transcript=response_text,
            language=assistant_language,
            turn_id=session.turn_count
        ))
        
        agent_resp = AgentResponse(
            response_text=response_text,
            language_code=assistant_language,
            intent="gather_info",
            should_continue=should_continue,
            extracted_info=extracted
        )
        
        return {
            "agent_response": agent_resp,
            "session_state": session,
            "missing_fields": missing
        }


LANG_NAME_MAP = {
    "hi": "Hindi",
    "bho": "Bhojpuri",
    "mai": "Maithili",
    "bn": "Bengali",
    "sat": "Santali",
    "en": "English",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "or": "Odia",
    "as": "Assamese",
    "ur": "Urdu",
    "kok": "Konkani",
    "mni": "Manipuri",
    "ne": "Nepali"
}

class RealConversationalAgentService:
    def __init__(self, provider: str, api_key: str, model: str, base_url: str):
        self.provider = provider
        self.api_key = api_key
        self.model = model
        
        if base_url:
            self.base_url = base_url
        elif provider == "openai":
            self.base_url = "https://api.openai.com/v1"
        elif provider == "gemini":
            self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
        elif provider == "groq":
            self.base_url = "https://api.groq.com/openai/v1"
        else:
            self.base_url = "https://api.openai.com/v1"

    async def generate_response(
        self,
        user_text: str,
        source_language: str,
        assistant_language: str,
        session_id: str
    ) -> dict:
        
        if session_id not in _SESSIONS:
            _SESSIONS[session_id] = SessionState(session_id=session_id)
            
        session = _SESSIONS[session_id]
        session.turn_count += 1
        
        session.conversation_history.append(ConversationTurn(
            role="user",
            transcript=user_text,
            language=source_language,
            turn_id=session.turn_count
        ))
        
        missing = get_missing_fields(session)
        
        profile_json = session.profile.model_dump_json(exclude_none=True)
        
        answered = [f for f, v in session.answered_fields.items() if v]
        answered_section = (
            "\n\nANSWERED FIELDS (already collected — do NOT ask for these again):\n"
            + (", ".join(answered) if answered else "(none yet)")
            + "\nNote: A field may be answered with an empty list, False, or 0. "
            "These are valid negative answers and must still be treated as answered."
        )
        
        dynamic_prompt = (
            SYSTEM_PROMPT
            + f"\n\nKNOWN PROFILE:\n{profile_json}"
            + answered_section
            + f"\n\nMISSING FIELDS TO COLLECT:\n{missing}\n"
        )
        
        messages = [{"role": "system", "content": dynamic_prompt}]
        
        # Add last few turns
        for turn in session.conversation_history[-5:]:
            messages.append({
                "role": "user" if turn.role == "user" else "assistant",
                "content": turn.transcript
            })
            
        # The last message is already added in the loop because we appended it to history
        # Let's ensure the assistant knows what language to reply in
        assistant_language_name = LANG_NAME_MAP.get(assistant_language, assistant_language)
        messages[-1]["content"] += f"\n[Please respond in language: {assistant_language_name}]"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                if not resp.is_success:
                    try:
                        error_data = resp.json().get("error", {})
                        logger.error(f"LLM API Error -> Status: {resp.status_code}, Message: {error_data.get('message')}, Type: {error_data.get('type')}, Code: {error_data.get('code')}")
                    except Exception:
                        logger.error(f"LLM API Error -> Status: {resp.status_code}, Response: {resp.text[:200]}")
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.error(f"Agent LLM failed: {e}")
            raise RuntimeError(f"Agent failed to generate response: {e}")

        content = data["choices"][0]["message"]["content"]
        try:
            parsed = json.loads(content)
            agent_resp = AgentResponse(**parsed)
            agent_resp.language_code = assistant_language
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"Agent output validation failed: {e}, content: {content}")
            # Fallback
            agent_resp = AgentResponse(
                response_text="I couldn't process that properly. Could you repeat?",
                language_code=assistant_language,
                should_continue=True,
                extraction_failed=True
            )
            
        if agent_resp.extracted_info:
            merge_profiles(session, agent_resp.extracted_info)
            
        missing = get_missing_fields(session)
        
        # Deduplication protection: If the LLM still tried to ask an answered field, force the next missing one.
        # We skip this if there are no missing fields, because the LLM is correctly summarizing answered fields for confirmation.
        is_confirmation = (agent_resp.target_field == "confirmation" or getattr(agent_resp, "intent", "") == "profile_confirmed")
        
        if missing and agent_resp.target_field and not is_confirmation and session.answered_fields.get(agent_resp.target_field):
            agent_resp.target_field = missing[0]
            # Since LLM asked the wrong question, we must override. In a full production system, we'd do a second LLM pass.
            agent_resp.response_text = f"Thank you. Now, could you tell me about your {missing[0]}?"
        
        if agent_resp.target_field:
            session.last_asked_field = agent_resp.target_field
            
        # Authoritative Completion Condition
        if getattr(agent_resp, "intent", "") == "profile_confirmed":
            session.status = "completed"
        elif getattr(agent_resp, "intent", "") == "profile_correction":
            session.status = "collecting"
        elif len(missing) == 0:
            session.status = "awaiting_confirmation"
        else:
            session.status = "collecting"
            
        session.turn_count += 1
        session.conversation_history.append(ConversationTurn(
            role="assistant",
            transcript=agent_resp.response_text,
            language=assistant_language,
            turn_id=session.turn_count
        ))
        
        return {
            "agent_response": agent_resp,
            "session_state": session,
            "missing_fields": missing
        }

def get_agent_service():
    provider = os.getenv("LLM_PROVIDER", "mock").lower()
    if provider == "mock":
        return MockConversationalAgentService()
        
    api_key = os.getenv("LLM_API_KEY", "")
    model = os.getenv("LLM_MODEL", "gpt-4o-mini")
    base_url = os.getenv("LLM_BASE_URL", "")
    
    if not api_key:
        raise RuntimeError("LLM_API_KEY is missing for agent service.")
        
    return RealConversationalAgentService(provider, api_key, model, base_url)

def get_session(session_id: str) -> Optional[SessionState]:
    return _SESSIONS.get(session_id)
