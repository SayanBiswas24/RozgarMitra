import asyncio
import os
from dotenv import load_dotenv

load_dotenv(".env", override=True)
if "LLM_PROVIDER" in os.environ and os.environ["LLM_PROVIDER"] == "mock":
    load_dotenv(".env", override=True)

from app.services.providers.bhashini_provider import BhashiniLanguageProvider

async def main():
    print("Starting Transliteration Live End-to-End Test")
    
    api_key = os.getenv("BHASHINI_API_KEY")
    transliteration_service_id = os.getenv("BHASHINI_TRANSLITERATION_SERVICE_ID")
    
    print(f"BHASHINI API Key Present: {bool(api_key)}")
    print(f"BHASHINI Transliteration Service ID: {transliteration_service_id}")
    
    if not api_key or not transliteration_service_id:
        print("STOPPING: Transliteration service ID or API Key is missing. Live test aborted.")
        return
        
    bhashini = BhashiniLanguageProvider()
    
    source = "hi"
    target = "en"
    text = "मैं किसान हूँ और दस साल से खेती करता हूँ।"
    
    print(f"\nRequesting transliteration: '{text}' ({source} -> {target})")
    
    try:
        transliterated = await bhashini.transliterate(text, source, target)
        print(f"\nSuccess!")
        print(f"Original text: {text}")
        print(f"Transliterated text: {transliterated}")
    except Exception as e:
        print(f"Transliteration failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
