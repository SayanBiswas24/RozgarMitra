## FINAL REPORT

**A. Files changed**
- `backend/app/services/agent/service.py`: Updated `SYSTEM_PROMPT` to add intent rules for `profile_confirmed` and `profile_correction`. Updated the backend completion logic to transition to `awaiting_confirmation`. Updated the `MockConversationalAgentService` equivalently.
- `backend/static/index.html`: Added the visual 'Awaiting Confirmation' badge.
- `backend/tests/test_profile_confirmation_lifecycle.py`: Added comprehensive lifecycle tests.

**B. New status/state behavior**
When `len(missing) == 0` is reached, the backend sets `session.status = "awaiting_confirmation"`. Since this is not `"completed"`, `ready_for_downstream_processing` remains `False`, and the frontend maintains the "Reply 🎙️" button so the user can actually answer the confirmation question.

**C. Confirmation flow**
If the user answers affirmatively (e.g. "हाँ, सही बा"), the LLM sets `intent='profile_confirmed'`. The backend sees this intent and transitions the session to `session.status = "completed"`, marking it ready for downstream processing. The frontend then correctly locks the conversation and shows the "Start New Conversation" button.

**D. Correction flow**
If the user rejects or corrects the summary (e.g., "No wait I am a plumber"), the LLM extracts the new info and sets `intent='profile_correction'`. The backend correctly transitions back to `session.status = "collecting"`. The corrected field is merged into the profile via `merge_profiles()` exactly as before, without resetting anything.

**E. Tests**
Added `test_status_becomes_awaiting_confirmation_not_completed`, `test_user_confirms_becomes_completed`, `test_user_rejects_becomes_collecting`, etc.

**F. Full pytest result**
161 passed, 0 failures, 3 warnings in 9.68s.

**G. Confirmation that TTS was untouched**
Confirmed. `BhashiniProvider`, audio formats, sampling rates, and playback were completely untouched.

**H. Confirmation that session memory was untouched**
Confirmed. `_SESSIONS` architecture, idempotency, history, and the `merge_profiles()` behavior were strictly preserved. The confirmation turns use the exact same `session_id`.
