import pytest
import json
import logging
from app.services.agent.service import RealConversationalAgentService

@pytest.mark.asyncio
async def test_llm_api_error_logging(monkeypatch, caplog):
    caplog.set_level(logging.ERROR)
    
    class MockResponse:
        @property
        def is_success(self): return False
        @property
        def status_code(self): return 400
        @property
        def text(self): return '{"error": {"message": "Invalid prompt", "type": "invalid_request_error", "code": "foo"}}'
        
        def json(self):
            return json.loads(self.text)
            
        def raise_for_status(self):
            import httpx
            raise httpx.HTTPStatusError("400 Bad Request", request=None, response=self)

    class MockAsyncClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, *args, **kwargs):
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", lambda **kwargs: MockAsyncClient())
    
    svc = RealConversationalAgentService("mock", "key", "model", "")
    
    with pytest.raises(RuntimeError, match="400 Bad Request"):
        await svc.generate_response("test", "en", "en", "session_1")
        
    # Verify our custom logging successfully captured the exact error fields
    assert "LLM API Error -> Status: 400, Message: Invalid prompt, Type: invalid_request_error, Code: foo" in caplog.text

