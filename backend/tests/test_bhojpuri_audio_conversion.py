import pytest
import struct
import io
import wave
from app.services.providers.bhashini_provider import BhashiniLanguageProvider

def create_mock_float_wav():
    # 32-bit Float WAV, 22050 Hz, 1 channel, 4 samples: 0.0, 0.5, -0.5, 1.0
    out = io.BytesIO()
    out.write(b'RIFF')
    out.write(struct.pack('<I', 36 + 16))
    out.write(b'WAVE')
    out.write(b'fmt ')
    out.write(struct.pack('<I', 18))
    out.write(struct.pack('<H', 3)) # IEEE float
    out.write(struct.pack('<H', 1))
    out.write(struct.pack('<I', 22050))
    out.write(struct.pack('<I', 22050 * 4))
    out.write(struct.pack('<H', 4))
    out.write(struct.pack('<H', 32))
    out.write(struct.pack('<H', 0)) # extra param size
    out.write(b'data')
    out.write(struct.pack('<I', 16))
    float_data = struct.pack('<4f', 0.0, 0.5, -0.5, 1.0)
    out.write(float_data)
    return out.getvalue()

def create_mock_pcm_wav():
    # 16-bit PCM WAV
    out = io.BytesIO()
    out.write(b'RIFF')
    out.write(struct.pack('<I', 36 + 8))
    out.write(b'WAVE')
    out.write(b'fmt ')
    out.write(struct.pack('<I', 16))
    out.write(struct.pack('<H', 1)) # PCM
    out.write(struct.pack('<H', 1))
    out.write(struct.pack('<I', 22050))
    out.write(struct.pack('<I', 22050 * 2))
    out.write(struct.pack('<H', 2))
    out.write(struct.pack('<H', 16))
    out.write(b'data')
    out.write(struct.pack('<I', 8))
    pcm_data = struct.pack('<4h', 0, 16383, -16384, 32767)
    out.write(pcm_data)
    return out.getvalue()

def test_convert_float32_to_pcm16():
    float_wav = create_mock_float_wav()
    provider = BhashiniLanguageProvider()
    
    pcm_wav = provider._convert_float32_wav_to_pcm16(float_wav)
    
    # Verify the wave module can now read it
    with wave.open(io.BytesIO(pcm_wav), "rb") as w:
        assert w.getnchannels() == 1
        assert w.getsampwidth() == 2 # 16-bit
        assert w.getframerate() == 22050
        assert w.getnframes() == 4
        assert w.getcomptype() == 'NONE'
        frames = w.readframes(4)
        
    samples = struct.unpack('<4h', frames)
    assert samples[0] == 0
    assert 16383 <= samples[1] <= 16384
    assert -16384 <= samples[2] <= -16383
    assert samples[3] == 32767

def test_already_pcm_remains_unchanged():
    pcm_wav = create_mock_pcm_wav()
    provider = BhashiniLanguageProvider()
    
    result = provider._convert_float32_wav_to_pcm16(pcm_wav)
    assert result == pcm_wav

@pytest.mark.asyncio
async def test_only_bhojpuri_invokes_conversion(monkeypatch):
    float_wav = create_mock_float_wav()
    
    class MockMakeCall:
        async def __call__(self, payload):
            import base64
            return {
                "pipelineResponse": [
                    {
                        "audio": [
                            {"audioContent": base64.b64encode(float_wav).decode("utf-8")}
                        ]
                    }
                ]
            }
            
    provider = BhashiniLanguageProvider()
    monkeypatch.setattr(provider, "_check_config", lambda: None)
    monkeypatch.setattr(provider, "_make_api_call", MockMakeCall())
    
    # 1. Bhojpuri should convert
    res_bho = await provider.synthesize("test", "bho")
    assert res_bho != float_wav # It was converted
    
    with wave.open(io.BytesIO(res_bho), "rb") as w:
        assert w.getsampwidth() == 2
        
    # 2. Hindi should NOT convert
    res_hi = await provider.synthesize("test", "hi")
    assert res_hi == float_wav # Not converted
    
    # 3. English should NOT convert
    res_en = await provider.synthesize("test", "en")
    assert res_en == float_wav # Not converted

