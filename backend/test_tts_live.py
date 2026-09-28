import asyncio
import os
from dotenv import load_dotenv

load_dotenv(".env", override=True)
if "LLM_PROVIDER" in os.environ and os.environ["LLM_PROVIDER"] == "mock":
    load_dotenv(".env", override=True)

from app.services.providers.bhashini_provider import BhashiniLanguageProvider

async def main():
    api_key = os.getenv("BHASHINI_API_KEY")
    tts_service = os.getenv("BHASHINI_TTS_SERVICE_ID")
    
    print(f"BHASHINI API Key Present: {bool(api_key)}")
    print(f"BHASHINI TTS Service ID: {tts_service}")
    
    if not api_key or not tts_service:
        print("Missing credentials or TTS Service ID.")
        return
        
    provider = BhashiniLanguageProvider()
    
    text = "नमस्कार, मैं आपकी सहायता करने के लिए तैयार हूँ।"
    lang = "hi"
    
    print(f"\nSynthesizing: '{text}' ({lang})")
    
    try:
        audio_bytes = await provider.synthesize(text, lang)
        print(f"Success! Received {len(audio_bytes)} bytes of audio data.")
        
        output_file = "test_output.wav"
        with open(output_file, "wb") as f:
            f.write(audio_bytes)
            
        print(f"Saved audio to {output_file}")
        
    except Exception as e:
        print(f"TTS Failed: {type(e).__name__} - {e}")

if __name__ == "__main__":
    asyncio.run(main())
