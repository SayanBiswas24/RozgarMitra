import pytest
import os
from dotenv import load_dotenv
load_dotenv('.env')
import time
from app.services.providers.bhashini_provider import BhashiniLanguageProvider
from app.services.providers.base import ProviderNotConfiguredError

@pytest.mark.asyncio
async def test_live_bhashini_ald():
    """
    Real Integration Test.
    Requires real credentials in .env.
    """
    api_key = os.getenv("BHASHINI_API_KEY")
    if not api_key or api_key == "<REAL_INFERENCE_KEY>":
        pytest.skip("Live credentials missing in .env")

    provider = BhashiniLanguageProvider()
    try:
        provider._check_config()
    except ProviderNotConfiguredError as e:
        pytest.skip(f"Provider not fully configured for live test: {e}")

    # Read the valid small audio file
    audio_path = os.path.join(os.path.dirname(__file__), "hindi_human_16k.wav")
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    # Send a real authenticated request
    start_time = time.time()
    try:
        result = await provider.detect_language(audio_bytes, "audio/wav")
        latency = time.time() - start_time
        
        # Report HTTP status (implicitly 200 if no exception was raised by httpx)
        print(f"\nReal ALD HTTP status: 200 OK")
        print(f"Detected language: {result.language_code}")
        print(f"Latency: {latency:.2f}s")
        
        assert result.language_code is not None

        # --- ASR Test (Dynamic) ---
        print("\nStarting ASR Test (Dynamic from ALD)...")
        start_time_asr = time.time()
        try:
            asr_result = await provider.transcribe(audio_bytes, "audio/wav", result.language_code)
            latency_asr = time.time() - start_time_asr
            print(f"Real ASR HTTP status: 200 OK")
            print(f"Detected/Source language: {asr_result.language_code}")
            print(f"Transcript: {asr_result.original_text}")
            print(f"Latency: {latency_asr:.2f}s")
        except Exception as e:
            pytest.fail(f"Real ASR request failed safely: {str(e)}")

        # --- ASR Test (Forced Hindi) ---
        print("\nStarting ASR Test (Forced 'hi')...")
        start_time_asr2 = time.time()
        try:
            asr_result2 = await provider.transcribe(audio_bytes, "audio/wav", "hi")
            latency_asr2 = time.time() - start_time_asr2
            print(f"Real ASR HTTP status: 200 OK")
            print(f"Detected/Source language: {asr_result2.language_code}")
            print(f"Transcript: {asr_result2.original_text}")
            print(f"Latency: {latency_asr2:.2f}s")
            assert asr_result2.original_text is not None
        except Exception as e:
            pytest.fail(f"Real ASR request failed safely: {str(e)}")

        
    except Exception as e:
        # If the request fails, show the safe HTTP status and sanitized error message and stop.
        # e.g., ProviderMalformedResponseError("BHASHINI returned HTTP 400")
        pytest.fail(f"Real ALD request failed safely: {str(e)}")
