import asyncio
import os
from dotenv import load_dotenv

load_dotenv(".env", override=True)
if "LLM_PROVIDER" in os.environ and os.environ["LLM_PROVIDER"] == "mock":
    load_dotenv(".env", override=True)

from app.services.providers.bhashini_provider import BhashiniLanguageProvider

async def main():
    print("Starting NMT Live End-to-End Test")
    
    api_key = os.getenv("BHASHINI_API_KEY")
    nmt_service_id = os.getenv("BHASHINI_NMT_SERVICE_ID")
    
    print(f"BHASHINI API Key Present: {bool(api_key)}")
    print(f"BHASHINI NMT Service ID: {nmt_service_id}")
    
    if not api_key or not nmt_service_id:
        print("STOPPING: NMT service ID or API Key is missing. Live test aborted.")
        return
        
    bhashini = BhashiniLanguageProvider()
    
    source = "hi"
    target = "en"
    text = "मैं किसान हूँ और दस साल से खेती करता हूँ।"
    
    print(f"\nRequesting translation: '{text}' ({source} -> {target})")
    
    try:
        translated = await bhashini.translate(text, source, target)
        print(f"\nSuccess!")
        print(f"Original text: {text}")
        print(f"Translated text: {translated}")
    except Exception as e:
        print(f"Translation failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
