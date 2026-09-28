import asyncio
import os
from dotenv import load_dotenv

load_dotenv(".env", override=True)
if "LLM_PROVIDER" in os.environ and os.environ["LLM_PROVIDER"] == "mock":
    load_dotenv(".env", override=True)

from app.services.providers.bhashini_provider import BhashiniLanguageProvider

async def run_test(bhashini, filename, lang):
    print(f"\\n{'='*50}")
    print(f"Running OCR Test: {filename} (Lang: {lang})")
    print(f"{'='*50}")
    try:
        with open(filename, "rb") as f:
            image_bytes = f.read()
    except FileNotFoundError:
        print(f"{filename} not found.")
        return
        
    try:
        ocr_text = await bhashini.ocr(image_bytes, lang)
        print(f"\\n[SUCCESS] Extracted OCR text:\\n{ocr_text}")
    except Exception as e:
        print(f"\\n[FAILURE] OCR failed: {e}")

async def main():
    api_key = os.getenv("BHASHINI_API_KEY")
    ocr_service_id = os.getenv("BHASHINI_OCR_SERVICE_ID")
    
    print(f"BHASHINI API Key Present: {'<REDACTED>' if api_key else False}")
    print(f"BHASHINI OCR Service ID: {ocr_service_id}")
    
    if not api_key or not ocr_service_id:
        print("STOPPING: Config missing.")
        return
        
    bhashini = BhashiniLanguageProvider()
    
    await run_test(bhashini, "test_hi.png", "hi")
    await run_test(bhashini, "test_en.png", "en")

if __name__ == "__main__":
    asyncio.run(main())
