import pytest
from unittest.mock import AsyncMock, patch
import httpx
from app.services.extraction.llm_extractor import LLMLivelihoodExtractor, ExtractorNotConfiguredError, ExtractorTimeoutError, ExtractorMalformedResponseError
from app.schemas.livelihood import TranscriptInput

@pytest.fixture
def transcript():
    return TranscriptInput(
        original_text="I repair tractors.",
        language_code="en",
        language_name="English",
        language_mode="monolingual"
    )

@pytest.mark.asyncio
async def test_missing_api_key(monkeypatch, transcript):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "")
    
    extractor = LLMLivelihoodExtractor()
    with pytest.raises(ExtractorNotConfiguredError):
        await extractor.extract(transcript, "req-1")

@pytest.mark.asyncio
async def test_provider_timeout(monkeypatch, transcript):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "fake-key")
    
    extractor = LLMLivelihoodExtractor()
    
    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("timeout")):
        with pytest.raises(ExtractorTimeoutError):
            await extractor.extract(transcript, "req-1")

@pytest.mark.asyncio
async def test_provider_http_error(monkeypatch, transcript):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "fake-key")
    
    extractor = LLMLivelihoodExtractor()
    
    mock_response = httpx.Response(status_code=500, request=httpx.Request("POST", "http://test"))
    with patch("httpx.AsyncClient.post", side_effect=httpx.HTTPStatusError("error", request=mock_response.request, response=mock_response)):
        with pytest.raises(ExtractorMalformedResponseError):
            await extractor.extract(transcript, "req-1")

@pytest.mark.asyncio
async def test_malformed_json_output(monkeypatch, transcript):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "fake-key")
    
    extractor = LLMLivelihoodExtractor()
    
    # Mock successful HTTP request but malformed JSON body from LLM
    mock_post = AsyncMock()
    mock_post.return_value.status_code = 200
    mock_post.return_value.raise_for_status = lambda: None
    mock_post.return_value.json = lambda:  {
        "choices": [{"message": {"content": "Not JSON!"}}]
    }
    
    with patch("httpx.AsyncClient.post", new=mock_post):
        with pytest.raises(ExtractorMalformedResponseError):
            await extractor.extract(transcript, "req-1")

@pytest.mark.asyncio
async def test_successful_extraction_preserves_metadata(monkeypatch, transcript):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "fake-key")
    
    extractor = LLMLivelihoodExtractor()
    
    mock_post = AsyncMock()
    mock_post.return_value.status_code = 200
    mock_post.return_value.raise_for_status = lambda: None
    mock_post.return_value.json = lambda:  {
        "choices": [{"message": {"content": '{"skills": ["Tractor Repair"], "extraction_confidence": "High"}'}}]
    }
    
    with patch("httpx.AsyncClient.post", new=mock_post):
        profile = await extractor.extract(transcript, "req-1")
        assert profile.skills == ["Tractor Repair"]
        assert profile.source_transcript_id == "req-1"
        assert profile.source_language == "en"

@pytest.mark.asyncio
async def test_missing_fields_default_to_null(monkeypatch, transcript):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "fake-key")
    
    extractor = LLMLivelihoodExtractor()
    
    mock_post = AsyncMock()
    mock_post.return_value.status_code = 200
    mock_post.return_value.raise_for_status = lambda: None
    mock_post.return_value.json = lambda:  {
        "choices": [{"message": {"content": '{"occupation": "Farmer"}'}}]
    }
    
    with patch("httpx.AsyncClient.post", new=mock_post):
        profile = await extractor.extract(transcript, "req-1")
        assert profile.occupation == "Farmer"
        assert profile.skills == []
        assert profile.experience_years is None

@pytest.mark.asyncio
async def test_hallucinated_fields_ignored(monkeypatch, transcript):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "fake-key")
    
    extractor = LLMLivelihoodExtractor()
    
    mock_post = AsyncMock()
    mock_post.return_value.status_code = 200
    mock_post.return_value.raise_for_status = lambda: None
    mock_post.return_value.json = lambda:  {
        "choices": [{"message": {"content": '{"occupation": "Farmer", "salary": 50000, "employer": "Govt"}'}}]
    }
    
    with patch("httpx.AsyncClient.post", new=mock_post):
        profile = await extractor.extract(transcript, "req-1")
        assert profile.occupation == "Farmer"
        assert not hasattr(profile, "salary")
        assert not hasattr(profile, "employer")

@pytest.mark.asyncio
async def test_pydantic_validation_failure(monkeypatch, transcript):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_API_KEY", "fake-key")
    
    extractor = LLMLivelihoodExtractor()
    
    mock_post = AsyncMock()
    mock_post.return_value.status_code = 200
    mock_post.return_value.raise_for_status = lambda: None
    mock_post.return_value.json = lambda:  {
        "choices": [{"message": {"content": '{"occupation": ["Not a string"], "experience_years": "five"}'}}]
    }
    
    with patch("httpx.AsyncClient.post", new=mock_post):
        with pytest.raises(ValueError, match="Extracted data is invalid"):
            await extractor.extract(transcript, "req-1")
