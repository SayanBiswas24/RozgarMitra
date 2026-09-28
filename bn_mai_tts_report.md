## SURGICAL FIX REPORT: BENGALI AND MAITHILI TTS

**1. Files changed:**
- `backend/app/services/providers/bhashini_provider.py`
- `backend/.env`
- `backend/tests/test_tts_service_selection.py`

**2. Exact lines/logic changed:**
- Appended `"bn": "Bhashini/IITM/TTS"` and `"mai": "Bhashini/IITM/TTS"` to the hardcoded `TTS_SERVICE_ID_MAP` block inside `bhashini_provider.py` (`def synthesize()`).
- Added matching `BHASHINI_TTS_SERVICE_ID_BN=Bhashini/IITM/TTS` and `BHASHINI_TTS_SERVICE_ID_MAI=Bhashini/IITM/TTS` into the `.env` file to parallel the existing environment-variable precedence.
- Added `test_bengali_selects_iitm` and `test_maithili_selects_iitm` to the test suite.

**3. Bengali mapping result:**
`bn` natively resolves to `Bhashini/IITM/TTS` effectively bypassing the configuration crash.

**4. Maithili mapping result:**
`mai` natively resolves to `Bhashini/IITM/TTS` effectively bypassing the configuration crash.

**5. Hindi regression result:**
Unaffected. Safely locked to `Bhashini/IITM/TTS`.

**6. English regression result:**
Unaffected. Safely locked to `Bhashini/IITM/TTS`.

**7. Bhojpuri regression result:**
Unaffected. Safely locked to `Bhashini/IISC/TTS`. The Bhojpuri Float32 conversion block (`language == "bho"`) explicitly ignores Bengali and Maithili.

**8. Unknown-language behavior result:**
Unaffected. Languages like `"ta"` or `"xx"` will organically trigger the exact same `ProviderNotConfiguredError` "valid TTS service ID must be provided" message because they do not match `TTS_SERVICE_ID_MAP` or env variables.

**9. Live Bengali TTS result:**
Live inference verified against `Bhashini/IITM/TTS`. HTTP 200, successfully generated 108,588 bytes of correctly-formatted PCM audio content payload.

**10. Live Maithili TTS result:**
Live inference verified against `Bhashini/IITM/TTS`. HTTP 200, successfully generated 163,884 bytes of correctly-formatted PCM audio content payload.

**11. Full pytest result:**
177 passed.
0 failures.
3 minor warnings (FastAPI dependencies).

**12. Confirmation of untouched scope:**
I strictly confirm that NO functional regressions or side-effects were introduced. Session storage, ALD, ASR, LLM logic, Groq logging, JSON schemas, UI architecture, playback behavior, and previous hotfixes (Bhojpuri conversion, favicon, English activation) have remained perfectly isolated and exactly as previously maintained.
