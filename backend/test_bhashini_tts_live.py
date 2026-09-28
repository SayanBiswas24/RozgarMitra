import asyncio
import os
from dotenv import load_dotenv

load_dotenv(".env", override=True)

from app.services.providers.bhashini_provider import BhashiniLanguageProvider

async def main():
    api_key = os.getenv("BHASHINI_API_KEY")
    print(f"BHASHINI API Key Present: {bool(api_key)}")
    
    bhashini = BhashiniLanguageProvider()
    
    tests = [
        {"lang": "hi", "text": "नमस्कार, आप कैसे हैं?"},
        {"lang": "bho", "text": "रउआ के महीना के आमदनी कतना बा?"}
    ]
    
    for t in tests:
        lang = t["lang"]
        text = t["text"]
        
        env_key = f"BHASHINI_TTS_SERVICE_ID_{lang.upper()}"
        tts_service_id = os.getenv(env_key) or os.getenv("BHASHINI_TTS_SERVICE_ID")
        
        print(f"\nRequesting TTS for language: {lang}")
        print(f"Expected Service ID: {tts_service_id}")
        print(f"Text: {text}")
        
        try:
            audio_bytes = await bhashini.synthesize(text, lang)
            print(f"Status: SUCCESS - Audio bytes length: {len(audio_bytes)}")
        except Exception as e:
            print(f"Status: FAILED - {e}")

if __name__ == "__main__":
    asyncio.run(main())
