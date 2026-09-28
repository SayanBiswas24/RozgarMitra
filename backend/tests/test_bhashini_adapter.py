import pytest
from unittest.mock import AsyncMock, patch
import httpx
from app.services.providers.bhashini_provider import BhashiniLanguageProvider
from app.services.providers.base import ProviderNotConfiguredError, ProviderTimeoutError, ProviderAuthenticationError, ProviderMalformedResponseError

@pytest.fixture
def valid_env(monkeypatch):
    monkeypatch.setenv("BHASHINI_ENABLED", "true")
    monkeypatch.setenv("BHASHINI_API_URL", "https://mock.bhashini/api/compute")
    monkeypatch.setenv("BHASHINI_API_KEY", "fake-key")
    monkeypatch.setenv("BHASHINI_ALD_SERVICE_ID", "ald-1")
    monkeypatch.setenv("BHASHINI_ASR_SERVICE_ID", "asr-1")

@pytest.mark.asyncio
async def test_bhashini_disabled(monkeypatch):
    monkeypatch.setenv("BHASHINI_ENABLED", "false")
    provider = BhashiniLanguageProvider()
    with pytest.raises(ProviderNotConfiguredError, match="disabled"):
        await provider.detect_language(b"audio", "audio/wav")

@pytest.mark.asyncio
async def test_missing_credentials(monkeypatch):
    monkeypatch.setenv("BHASHINI_ENABLED", "true")
    monkeypatch.setenv("BHASHINI_API_URL", "")
    provider = BhashiniLanguageProvider()
    with pytest.raises(ProviderNotConfiguredError, match="missing API URL"):
        await provider.detect_language(b"audio", "audio/wav")

@pytest.mark.asyncio
async def test_provider_timeout(valid_env):
    provider = BhashiniLanguageProvider()
    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("timeout")):
        with pytest.raises(ProviderTimeoutError):
            await provider.detect_language(b"audio", "audio/wav")

@pytest.mark.asyncio
async def test_provider_auth_error(valid_env):
    provider = BhashiniLanguageProvider()
    
    mock_post = AsyncMock()
    mock_post.return_value.status_code = 401
    
    with patch("httpx.AsyncClient.post", new=mock_post):
        with pytest.raises(ProviderAuthenticationError):
            await provider.detect_language(b"audio", "audio/wav")

@pytest.mark.asyncio
async def test_provider_http_error(valid_env):
    provider = BhashiniLanguageProvider()
    
    # 500 error
    mock_response = httpx.Response(status_code=500, request=httpx.Request("POST", "http://test"))
    
    with patch("httpx.AsyncClient.post", side_effect=httpx.HTTPStatusError("err", request=mock_response.request, response=mock_response)):
        with pytest.raises(ProviderMalformedResponseError, match="HTTP 500"):
            await provider.detect_language(b"audio", "audio/wav")

@pytest.mark.asyncio
async def test_malformed_response(valid_env):
    provider = BhashiniLanguageProvider()
    
    mock_post = AsyncMock()
    mock_post.return_value.status_code = 200
    mock_post.return_value.raise_for_status = lambda: None
    mock_post.return_value.json = lambda: {"invalid_schema": "not pipelineResponse"}
    
    with patch("httpx.AsyncClient.post", new=mock_post):
        with pytest.raises(ProviderMalformedResponseError, match="malformed"):
            await provider.detect_language(b"audio", "audio/wav")

@pytest.mark.asyncio
async def test_successful_ald(valid_env):
    provider = BhashiniLanguageProvider()
    
    mock_post = AsyncMock()
    mock_post.return_value.status_code = 200
    mock_post.return_value.raise_for_status = lambda: None
    mock_post.return_value.json = lambda: {
        "pipelineResponse": [
            {
                "output": [
                    {
                        "sourceLanguage": "hi",
                        "confidence": 0.95
                    }
                ]
            }
        ]
    }
    
    with patch("httpx.AsyncClient.post", new=mock_post):
        result = await provider.detect_language(b"audio", "audio/wav")
        assert result.language_code == "hi"
        assert result.language_name == "HI"
        assert result.confidence == 0.95

@pytest.mark.asyncio
async def test_successful_asr(valid_env):
    provider = BhashiniLanguageProvider()
    
    mock_post = AsyncMock()
    mock_post.return_value.status_code = 200
    mock_post.return_value.raise_for_status = lambda: None
    mock_post.return_value.json = lambda: {
        "pipelineResponse": [
            {
                "output": [
                    {
                        "source": "tractor repair karta hoon"
                    }
                ]
            }
        ]
    }
    
    with patch("httpx.AsyncClient.post", new=mock_post):
        result = await provider.transcribe(b"audio", "audio/wav", "hi")
        assert result.original_text == "tractor repair karta hoon"
        assert result.language_code == "hi"
        assert result.provider == "bhashini"
        assert result.language_mode == "monolingual"
