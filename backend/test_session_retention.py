import asyncio
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_session():
    import uuid
    session_id = str(uuid.uuid4())
    
    # We will use mock LLM to avoid real API calls
    import os
    os.environ["LLM_PROVIDER"] = "mock"
    
    for i in range(3):
        resp = client.post(
            "/api/voice/agent",
            data={
                "spoken_language": "hi",
                "assistant_language": "bho",
                "session_id": session_id,
                "user_text_override": "Main kisan hoon."
            },
            files={"audio": ("test.wav", b"dummy", "audio/wav")}
        )
        assert resp.status_code == 200
        data = resp.json()
        print(f"Turn {i+1} Session ID:", data["session_id"])
        print(f"Turn {i+1} Status:", data["status"])
        
test_session()
