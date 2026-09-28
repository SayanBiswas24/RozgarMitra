import asyncio
import os
from dotenv import load_dotenv

load_dotenv(".env", override=True)

from app.services.providers.bhashini_provider import BhashiniLanguageProvider

async def main():
    api_key = os.getenv("BHASHINI_API_KEY")
    print(f"BHASHINI API Key Present: {bool(api_key)}")
    
    bhashini = BhashiniLanguageProvider()
    
    text = "रउआ के महीना के आमदनी कतना बा?"
    lang = "bho"
    
    print(f"\nRequesting TTS for {lang}: {text}")
    
    try:
        audio_bytes = await bhashini.synthesize(text, lang)
        print(f"\nSuccess! Audio bytes length: {len(audio_bytes)}")
    except Exception as e:
        print(f"TTS failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
