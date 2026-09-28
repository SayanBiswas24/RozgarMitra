from abc import ABC, abstractmethod
from app.schemas.livelihood import LivelihoodProfile, TranscriptInput

class BaseLivelihoodExtractor(ABC):
    @abstractmethod
    async def extract(self, transcript: TranscriptInput, request_id: str) -> LivelihoodProfile:
        pass

class ExtractorNotConfiguredError(Exception):
    pass

class ExtractorTimeoutError(Exception):
    pass

class ExtractorMalformedResponseError(Exception):
    pass
