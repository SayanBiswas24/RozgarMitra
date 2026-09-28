from typing import Optional
import os
import base64
import httpx
import logging
from .base import BaseLanguageProvider, LanguageDetectionResult, TranscriptionResult, ProviderNotConfiguredError, ProviderTimeoutError, ProviderAuthenticationError, ProviderMalformedResponseError

logger = logging.getLogger(__name__)

class BhashiniLanguageProvider(BaseLanguageProvider):
    PROVIDER_NAME = "bhashini"
    
    def __init__(self):
        self.enabled = os.getenv("BHASHINI_ENABLED", "false").lower() == "true"
        self.api_url = os.getenv("BHASHINI_API_URL")
        self.api_key = os.getenv("BHASHINI_API_KEY")
        self.ald_service_id = os.getenv("BHASHINI_ALD_SERVICE_ID", "bhashini/iitmandi/ald")
        self.asr_service_id = os.getenv("BHASHINI_ASR_SERVICE_ID", "bhashini/bodhan/asr-transcribe-flex")
        self.tts_service_id = os.getenv("BHASHINI_TTS_SERVICE_ID")
        
    def _check_config(self):
        if not self.enabled:
            raise ProviderNotConfiguredError("BHASHINI provider is disabled via configuration.")
        if not self.api_url or not self.api_key:
            raise ProviderNotConfiguredError("BHASHINI provider is missing API URL or API Key.")

    async def _make_api_call(self, payload: dict) -> dict:
        self._check_config()
        headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(self.api_url, headers=headers, json=payload)
                if resp.status_code in (401, 403):
                    raise ProviderAuthenticationError("BHASHINI Authentication failed.")
                resp.raise_for_status()
                return resp.json()
        except httpx.TimeoutException:
            logger.error("BHASHINI API timeout")
            raise ProviderTimeoutError("BHASHINI API timed out.")
        except httpx.HTTPStatusError as e:
            logger.error(f"BHASHINI HTTP Error: {e.response.status_code} - {e.response.text}")
            print(f"DEBUG: 500 Response text: {e.response.text}")
            raise ProviderMalformedResponseError(f"BHASHINI returned HTTP {e.response.status_code}")
        except ProviderAuthenticationError:
            raise
        except Exception as e:
            logger.error(f"BHASHINI Connection Error: {e}")
            raise ProviderMalformedResponseError("Failed to connect to BHASHINI API.")

    async def detect_language(self, audio_bytes: bytes, mime_type: str) -> LanguageDetectionResult:
        self._check_config()
        if not self.ald_service_id:
            raise ProviderNotConfiguredError("BHASHINI ALD service ID is not configured.")
            
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # Hypothetical pipeline payload based on standard ULCA Udyat spec
        # (Pending verification of exact actual endpoint spec)
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "audio-lang-detection",
                    "config": {
                        "serviceId": self.ald_service_id
                    }
                }
            ],
            "inputData": {
                "audio": [
                    {
                        "audioContent": audio_b64
                    }
                ]
            }
        }
        
        # This will either hit the mock in tests or raise error if not fully valid

        import copy
        debug_payload = copy.deepcopy(payload)
        try:
            debug_payload["inputData"]["image"][0]["imageContent"] = "<REDACTED_BASE64>"
        except Exception:
            pass
            
        print(f"\nDEBUG PAYLOAD (redacted): {debug_payload}\n")
        
        data = await self._make_api_call(payload)

        
        try:
            # Expected parsed response structure pending Udyat actual mapping
            result = data["pipelineResponse"][0]["output"][0]
            detected_code = result.get("sourceLanguage", "en")
            confidence = result.get("confidence", None)
            
            # Map code to name if possible, fallback to Unknown
            # We don't force a strict dictionary here since BHASHINI supports many.
            return LanguageDetectionResult(
                language_code=detected_code,
                language_name=detected_code.upper(), 
                confidence=confidence,
                alternatives=[]
            )
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"BHASHINI ALD malformed response: {e}")
            raise ProviderMalformedResponseError("BHASHINI ALD response was malformed.")
        
    async def transcribe(self, audio_bytes: bytes, mime_type: str, language_hint: Optional[str] = None) -> TranscriptionResult:
        self._check_config()
        if not self.asr_service_id:
            raise ProviderNotConfiguredError("BHASHINI ASR service ID is not configured.")
            
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        target_lang = language_hint or "hi"
        
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {
                            "sourceLanguage": target_lang
                        },
                        "serviceId": self.asr_service_id,
                        "audioFormat": "wav",
                        "samplingRate": 16000
                    }
                }
            ],
            "inputData": {
                "audio": [
                    {
                        "audioContent": audio_b64
                    }
                ]
            }
        }
        

        import copy
        debug_payload = copy.deepcopy(payload)
        try:
            debug_payload["inputData"]["image"][0]["imageContent"] = "<REDACTED_BASE64>"
        except Exception:
            pass
            
        print(f"\nDEBUG PAYLOAD (redacted): {debug_payload}\n")
        
        data = await self._make_api_call(payload)

        
        try:
            result = data["pipelineResponse"][0]["output"][0]
            transcript = result.get("source", "")
            
            return TranscriptionResult(
                original_text=transcript,
                language_code=target_lang,
                language_name=target_lang.upper(),
                confidence=None,
                provider=self.PROVIDER_NAME,
                language_mode="monolingual" # Pending code-switched exact spec from Bhashini
            )
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"BHASHINI ASR malformed response: {e}")
            raise ProviderMalformedResponseError("BHASHINI ASR response was malformed.")
            
    async def synthesize(self, text: str, language: str) -> bytes:
        self._check_config()
        # Canonical mapping for verified BHASHINI TTS services.
        # Env vars take priority; this map is the last-resort fallback.
        TTS_SERVICE_ID_MAP = {
            "hi":  "Bhashini/IITM/TTS",
            "bho": "Bhashini/IISC/TTS",
            "en":  "Bhashini/IITM/TTS",
            "bn":  "Bhashini/IITM/TTS",
            "mai": "Bhashini/IITM/TTS",
            "sat": "Bhashini/IITM/TTS",
            "ta":  "Bhashini/IITM/TTS",
            "te":  "Bhashini/IITM/TTS",
            "kn":  "Bhashini/IITM/TTS",
            "ml":  "Bhashini/IITM/TTS",
            "mr":  "Bhashini/IITM/TTS",
            "gu":  "Bhashini/IITM/TTS",
            "pa":  "Bhashini/IITM/TTS",
            "or":  "Bhashini/IITM/TTS",
            "as":  "Bhashini/IITM/TTS",
            "ur":  "Bhashini/IITM/TTS",
            "kok": "Bhashini/IITM/TTS",
            "mni": "Bhashini/IITM/TTS",
            "ne":  "Bhashini/IITM/TTS",
        }
        env_key = f"BHASHINI_TTS_SERVICE_ID_{language.upper()}"
        tts_service_id = (
            os.getenv(env_key)
            or os.getenv("BHASHINI_TTS_SERVICE_ID")
            or TTS_SERVICE_ID_MAP.get(language)
        )
        if not tts_service_id:
            raise ProviderNotConfiguredError(
                f"BHASHINI TTS service ID ({env_key} or BHASHINI_TTS_SERVICE_ID) "
                f"is not configured and language '{language}' has no built-in default. "
                "A valid TTS service ID must be provided."
            )
            
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {
                            "sourceLanguage": language
                        },
                        "serviceId": tts_service_id,
                        "gender": "female",
                        "samplingRate": 16000
                    }
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": text
                    }
                ]
            }
        }
        

        import copy
        debug_payload = copy.deepcopy(payload)
        try:
            debug_payload["inputData"]["image"][0]["imageContent"] = "<REDACTED_BASE64>"
        except Exception:
            pass
            
        print(f"\nDEBUG PAYLOAD (redacted): {debug_payload}\n")
        
        data = await self._make_api_call(payload)

        
        try:
            audio_b64 = data["pipelineResponse"][0]["audio"][0]["audioContent"]
            audio_bytes = base64.b64decode(audio_b64)
            if language == "bho":
                audio_bytes = self._convert_float32_wav_to_pcm16(audio_bytes)
            return audio_bytes
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"BHASHINI TTS malformed response: {e}")
            raise ProviderMalformedResponseError("BHASHINI TTS response was malformed.")

    def _convert_float32_wav_to_pcm16(self, audio_bytes: bytes) -> bytes:
        import struct
        import io
        if not audio_bytes.startswith(b'RIFF'):
            return audio_bytes
            
        reader = io.BytesIO(audio_bytes)
        reader.read(12)
        
        fmt_chunk = None
        data_chunk_pos = -1
        data_chunk_size = 0
        
        while True:
            chunk_header = reader.read(8)
            if len(chunk_header) < 8:
                break
            chunk_id, chunk_size = struct.unpack('<4sI', chunk_header)
            
            if chunk_id == b'fmt ':
                fmt_chunk = reader.read(chunk_size)
            elif chunk_id == b'data':
                data_chunk_pos = reader.tell()
                data_chunk_size = chunk_size
                reader.seek(chunk_size, 1)
            else:
                reader.seek(chunk_size, 1)
                
        if not fmt_chunk or data_chunk_pos == -1:
            return audio_bytes
            
        audio_format, num_channels, sample_rate, byte_rate, block_align, bits_per_sample = struct.unpack('<HHIIHH', fmt_chunk[:16])
        
        if audio_format != 3 or bits_per_sample != 32:
            return audio_bytes
            
        reader.seek(data_chunk_pos)
        float_data = reader.read(data_chunk_size)
        num_samples = data_chunk_size // 4
        
        floats = struct.unpack(f'<{num_samples}f', float_data)
        
        pcm16_samples = []
        for f in floats:
            f = max(-1.0, min(1.0, f))
            pcm = int(f * 32767.0) if f > 0 else int(f * 32768.0)
            pcm16_samples.append(pcm)
            
        pcm16_data = struct.pack(f'<{num_samples}h', *pcm16_samples)
        
        out = io.BytesIO()
        out.write(b'RIFF')
        total_size = 36 + len(pcm16_data)
        out.write(struct.pack('<I', total_size))
        out.write(b'WAVE')
        
        out.write(b'fmt ')
        out.write(struct.pack('<I', 16))
        out.write(struct.pack('<H', 1))
        out.write(struct.pack('<H', num_channels))
        out.write(struct.pack('<I', sample_rate))
        
        new_byte_rate = sample_rate * num_channels * 2
        new_block_align = num_channels * 2
        out.write(struct.pack('<I', new_byte_rate))
        out.write(struct.pack('<H', new_block_align))
        out.write(struct.pack('<H', 16))
        
        out.write(b'data')
        out.write(struct.pack('<I', len(pcm16_data)))
        out.write(pcm16_data)
        
        return out.getvalue()

    async def translate(self, text: str, source_language: str, target_language: str) -> str:
        self._check_config()
        nmt_service_id = os.getenv("BHASHINI_NMT_SERVICE_ID")
        if not nmt_service_id:
            raise ProviderNotConfiguredError("BHASHINI NMT service ID (BHASHINI_NMT_SERVICE_ID) is not configured.")
            
        if not text.strip():
            return ""
            
        if source_language == target_language:
            return text
            
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source_language,
                            "targetLanguage": target_language
                        },
                        "serviceId": nmt_service_id
                    }
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": text
                    }
                ]
            }
        }
        

        import copy
        debug_payload = copy.deepcopy(payload)
        try:
            debug_payload["inputData"]["image"][0]["imageContent"] = "<REDACTED_BASE64>"
        except Exception:
            pass
            
        print(f"\nDEBUG PAYLOAD (redacted): {debug_payload}\n")
        
        data = await self._make_api_call(payload)

        
        try:
            target = data["pipelineResponse"][0]["output"][0]["target"]
            if isinstance(target, list) and len(target) > 0:
                return target[0]
            return str(target)
        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"BHASHINI NMT malformed response: {e}")
            raise ProviderMalformedResponseError("BHASHINI NMT response was malformed.")

    async def transliterate(self, text: str, source_language: str, target_language: str) -> str:
        self._check_config()
        transliteration_service_id = os.getenv("BHASHINI_TRANSLITERATION_SERVICE_ID")
        if not transliteration_service_id:
            raise ProviderNotConfiguredError("BHASHINI Transliteration service ID (BHASHINI_TRANSLITERATION_SERVICE_ID) is not configured.")
            
        if not text.strip():
            return ""
            
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "transliteration",
                    "config": {
                        "language": {
                            "sourceLanguage": source_language,
                            "targetLanguage": target_language
                        },
                        "serviceId": transliteration_service_id
                    }
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": text
                    }
                ]
            }
        }
        

        import copy
        debug_payload = copy.deepcopy(payload)
        try:
            debug_payload["inputData"]["image"][0]["imageContent"] = "<REDACTED_BASE64>"
        except Exception:
            pass
            
        print(f"\nDEBUG PAYLOAD (redacted): {debug_payload}\n")
        
        data = await self._make_api_call(payload)

        
        try:
            target = data["pipelineResponse"][0]["output"][0]["target"]
            if isinstance(target, list) and len(target) > 0:
                return target[0]
            return str(target)
        except (KeyError, IndexError, TypeError) as e:
            import logging
            logging.getLogger(__name__).error(f"BHASHINI Transliteration malformed response: {e}")
            raise ProviderMalformedResponseError("BHASHINI Transliteration response was malformed.")

    async def ocr(self, image_bytes: bytes, source_language: str, request_id: Optional[str] = None) -> str:
        self._check_config()
        ocr_service_id = os.getenv("BHASHINI_OCR_SERVICE_ID")
        if not ocr_service_id:
            raise ProviderNotConfiguredError("BHASHINI OCR service ID (BHASHINI_OCR_SERVICE_ID) is not configured.")
            
        if not image_bytes:
            return ""
            
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
            
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "ocr",
                    "config": {
                        "language": {
                            "sourceLanguage": source_language
                        },
                        "serviceId": ocr_service_id
                    }
                }
            ],
            "inputData": {
                "image": [
                    {
                        "imageContent": image_b64
                    }
                ]
            }
        }
        

        import copy
        debug_payload = copy.deepcopy(payload)
        try:
            debug_payload["inputData"]["image"][0]["imageContent"] = "<REDACTED_BASE64>"
        except Exception:
            pass
            
        print(f"\nDEBUG PAYLOAD (redacted): {debug_payload}\n")
        
        data = await self._make_api_call(payload)

        
        try:
            # OCR response typically returns the recognized text in the 'source' key 
            # of the output element.
            output_item = data["pipelineResponse"][0]["output"][0]
            if "source" in output_item:
                return output_item["source"]
            elif "target" in output_item:
                return output_item["target"]
            elif "text" in output_item:
                return output_item["text"]
            else:
                raise KeyError(f"Expected keys not found in output_item: {list(output_item.keys())}")
        except (KeyError, IndexError, TypeError) as e:
            import logging
            logging.getLogger(__name__).error(f"BHASHINI OCR malformed response: {e}, payload: {data}")
            raise ProviderMalformedResponseError(f"BHASHINI OCR response was malformed: {e}")
