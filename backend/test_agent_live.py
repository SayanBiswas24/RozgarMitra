import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv(".env", override=True)
if "LLM_PROVIDER" in os.environ and os.environ["LLM_PROVIDER"] == "mock":
    load_dotenv(".env", override=True)

from app.services.providers.bhashini_provider import BhashiniLanguageProvider
from app.services.agent.service import get_agent_service

async def main():
    print("Starting Live End-to-End Test")
    print(f"Agent LLM Provider: {os.getenv('LLM_PROVIDER')}")
    
    bhashini = BhashiniLanguageProvider()
    agent = get_agent_service()
    
    text = "मैं किसान हूँ और दस साल से खेती करता हूँ।"
    print(f"\n1. Synthesizing user audio: '{text}'")
    
    user_audio = await bhashini.synthesize(text, "hi")
    with open("test_user_input.wav", "wb") as f:
        f.write(user_audio)
        
    print("\n2. Sending user audio to ASR")
    trans_res = await bhashini.transcribe(user_audio, "audio/wav", language_hint="hi")
    print(f"ASR Transcript: {trans_res.original_text}")
    
    print("\n3. Generating Agent Response")
    agent_res = await agent.generate_response(
        user_text=trans_res.original_text,
        source_language="hi",
        assistant_language="hi",
        session_id="live-session-1"
    )
    print(f"Agent Response: {agent_res.response_text}")
    print(f"Intent: {agent_res.intent}")
    
    print("\n4. Synthesizing Assistant Audio")
    assistant_audio = await bhashini.synthesize(agent_res.response_text, "hi")
    
    out_file = "test_assistant_output.wav"
    with open(out_file, "wb") as f:
        f.write(assistant_audio)
        
    print(f"Saved assistant audio to {out_file} ({len(assistant_audio)} bytes)")
    print("\nTest completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
