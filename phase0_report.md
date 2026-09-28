## PHASE 0: AUDIT FINDINGS

**A. Where confirmation response text is generated**
Confirmation response text is currently generated correctly by the LLM when it sees `len(missing) == 0`. However, a deduplication block in `RealConversationalAgentService` (lines 294-300) checks `if agent_resp.target_field and session.answered_fields.get(agent_resp.target_field)` and overwrites the LLM's response with a hardcoded English fallback.

**B. Whether any hardcoded English confirmation string still exists**
Yes. In `backend/app/services/agent/service.py`:
- `RealConversationalAgentService`: `agent_resp.response_text = "Thank you, I have collected all the information. Is this correct?"`
- `MockConversationalAgentService`: `response_text = "Thank you, I have all the information. Is this correct?"`

**C. Whether the confirmation prompt receives assistant_language**
Yes. `assistant_language` is successfully sent in the final system prompt message constraint.

**D. Whether LANG_NAME_MAP is used consistently**
Yes. The previous fix successfully implemented `LANG_NAME_MAP` so the instruction correctly says `[Please respond in language: Bhojpuri]` rather than `bho`.

**E. Whether confirmation intent is language-independent**
Yes. The intent strings are `profile_confirmed` and `profile_correction`, which do not depend on the user's language.

**F. How assistant_language travels**
1. Frontend `FormData` sends `assistant_language` to `POST /api/voice/agent`.
2. `voice.py` uses `target_assistant_lang = assistant_language or detected_lang`.
3. Sent to `generate_response(..., assistant_language=target_assistant_lang)`.
4. Translated by `LANG_NAME_MAP` inside `service.py`.
5. Re-attached to the outgoing `AgentResponse` and sent to TTS via `BhashiniProvider.synthesize(text, language)`.

**G. How English TTS service is currently selected**
In `BhashiniProvider`, it looks for `BHASHINI_TTS_SERVICE_ID_EN`, then `BHASHINI_TTS_SERVICE_ID`, then `TTS_SERVICE_ID_MAP.get("en")`. Currently, none of these are populated. `BHASHINI_TTS_SERVICE_ID` is commented out in `.env`, and `"en"` is not in `TTS_SERVICE_ID_MAP`.

**H. Why English audio may not be playing**
Because the service ID resolves to `None`, throwing a `ProviderNotConfiguredError`. This halts the TTS synthesis, setting `audio_base64` to `null` and raising "TTS Failed" on the frontend. (Verified that `Bhashini/IITM/TTS` successfully supports English `en`).

**I. Where favicon is served**
It is not served anywhere. The static folder is mounted at `/demo`, but browsers request `/favicon.ico` at the root domain by default. 

**J. Why /favicon.ico currently returns 404**
FastAPI has no route for `/favicon.ico` at the root level, and `backend/static/favicon.ico` does not physically exist.
