import asyncio
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_multiple_turns():
    session_id = "test-session-123"
    
    # Turn 1
    resp1 = client.post(
        "/api/voice/agent",
        data={
            "spoken_language": "hi",
            "assistant_language": "bho",
            "session_id": session_id,
            "user_text_override": "Main ek kisan hoon."
        },
        files={"audio": ("test.wav", b"dummy", "audio/wav")}
    )
    assert resp1.status_code == 200, resp1.text
    data1 = resp1.json()
    print("Turn 1 Profile:", data1["profile"])
    print("Turn 1 Session:", data1["session_id"])
    
    # Turn 2
    resp2 = client.post(
        "/api/voice/agent",
        data={
            "spoken_language": "hi",
            "assistant_language": "bho",
            "session_id": session_id,
            "user_text_override": "Mera aay 20000 hai."
        },
        files={"audio": ("test.wav", b"dummy", "audio/wav")}
    )
    assert resp2.status_code == 200, resp2.text
    data2 = resp2.json()
    print("Turn 2 Profile:", data2["profile"])
    print("Turn 2 Session:", data2["session_id"])

test_multiple_turns()
