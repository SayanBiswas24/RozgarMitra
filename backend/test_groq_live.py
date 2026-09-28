import asyncio
import os
from dotenv import load_dotenv

# Ensure we use the real .env for this specific live test
load_dotenv(".env", override=True)

# Important: ensure tests haven't poisoned os.environ if run via pytest
if "LLM_PROVIDER" in os.environ and os.environ["LLM_PROVIDER"] == "mock":
    load_dotenv(".env", override=True) # Reload to overwrite mock

from app.services.extraction.llm_extractor import RealLLMExtractor
from app.schemas.livelihood import TranscriptInput

async def main():
    provider = os.getenv("LLM_PROVIDER")
    api_key = os.getenv("LLM_API_KEY")
    model = os.getenv("LLM_MODEL")
    base_url = os.getenv("LLM_BASE_URL")

    print(f"Provider: {provider}")
    print(f"Model: {model}")
    print(f"Base URL: {base_url}")

    if not api_key:
        print("Error: No LLM_API_KEY found in .env")
        return

    extractor = RealLLMExtractor(
        provider=provider,
        api_key=api_key,
        model=model,
        base_url=base_url
    )

    transcript = TranscriptInput(
        original_text="मैं खेती करता हूं और ट्रैक्टर की मरम्मत भी करता हूं।",
        language_code="hi",
        language_name="Hindi",
        language_mode="monolingual"
    )

    try:
        profile = await extractor.extract(transcript, "test-req-123")
        print("\n--- EXTRACTION RESULT ---")
        print(f"Request ID: {profile.source_transcript_id}")
        print(f"Source Language: {profile.source_language}")
        print(f"Occupation: {profile.occupation}")
        print(f"Skills: {profile.skills}")
        print(f"Experience: {profile.experience_years}")
        print("-------------------------")
    except Exception as e:
        print(f"Extraction failed: {type(e).__name__} - {e}")

if __name__ == "__main__":
    asyncio.run(main())
