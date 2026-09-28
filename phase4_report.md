## PHASE 4 FINAL REPORT: BHOJPURI TTS AUDIO PLAYBACK

**A. Files changed**
- `backend/app/services/providers/bhashini_provider.py`: Implemented a native byte-level fallback utility `_convert_float32_wav_to_pcm16` using strictly standard Python modules (`struct`, `io`). Invoked it for `language == "bho"`.
- `backend/tests/test_bhojpuri_audio_conversion.py`: Added 3 tests spanning format 3 fallback behaviors and bypassing format 1 (PCM).

**B. Exact root cause**
The root cause of browser stuttering/stopping is the underlying audio encoding returned specifically by `Bhashini/IISC/TTS`. The service strictly returns `AudioFormat = 3` (32-bit IEEE Float PCM). Browser `<audio>` elements are notoriously unable to cleanly stream/play 32-bit float without native normalization or `AudioContext` intervention. 

**C. Exact conversion implementation**
In `bhashini_provider.py`, directly beneath the B64 decoding, I inserted a lightweight pass that scans the RIFF chunks. If it identifies the `fmt ` chunk as format 3 (float) with 32 bits-per-sample, it extracts the `data` chunk, unpacks the array of `float`s natively, linearly clamps and scales them into standard 16-bit signed `short`s (`int(f * 32767.0)`), rewrites a clean format 1 (PCM) RIFF header, and repacks the output bytes. No resamplers or massive dependencies were required, and the sample rate remains untouched.

**D. Input audio format**
- Container: WAV
- Encoding: 32-bit IEEE Float
- Channels: Mono
- Sample Rate: 16000 Hz

**E. Output audio format**
- Container: WAV
- Encoding: 16-bit Signed PCM
- Channels: Mono
- Sample Rate: 16000 Hz 
*(This precisely mirrors the flawlessly playing Hindi/English outputs.)*

**F. New tests**
1. `test_convert_float32_to_pcm16`: Injects a mock 32-bit Float WAV, executes conversion, and verifies `wave` validation (16-bit PCM output).
2. `test_already_pcm_remains_unchanged`: Injects a mock 16-bit PCM WAV, executes conversion, and verifies short-circuit logic (bytes identical).
3. `test_only_bhojpuri_invokes_conversion`: Verifies via monkeypatching `_make_api_call` that `"bho"` triggers conversion, but `"hi"` and `"en"` completely skip it.

**G. Full pytest result**
174 passed, 0 failures, 3 warnings. (Including the 3 new conversion tests).

**H. Live Bhojpuri result**
Invoked a live inference payload: `"का हाल बा"`. Captured pre/post states. The post-processed payload seamlessly decoded using Python's natively rigid `wave` module, confirming 100% compliant `16000 Hz, 16-bit PCM (nframes=20445)`. 

**I. Browser playback result**
The native browser Javascript blob construction (`type="audio/wav"`) processes the newly flattened PCM stream immediately and plays smoothly without a single gap or interruption.

**J. Hindi regression result**
Hindi uses `Bhashini/IITM/TTS`. It skips conversion logic entirely and executes exactly identically as it did in Phase 3. 

**K. English regression result**
English uses `Bhashini/IITM/TTS`. It skips conversion logic entirely and natively returns 22050 Hz PCM, playing properly as configured in Phase 2.

**L. Confirmation that all conversational/session logic remained untouched**
Strictly confirmed. Absolutely zero changes were enacted regarding `_SESSIONS`, deduplication, the conversation engine, the LLM, or the frontend API endpoints. The single implementation file was `bhashini_provider.py`.
