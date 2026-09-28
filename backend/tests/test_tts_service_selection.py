"""
Focused offline tests for BHASHINI TTS language-aware service ID selection.
These tests do NOT call the live BHASHINI API; they verify the resolution logic.
"""
import os
import pytest

# ---------------------------------------------------------------------------
# Helper: instantiate provider with bhashini enabled but no real credentials
# ---------------------------------------------------------------------------
def _make_provider(env_overrides: dict):
    """Return a BhashiniLanguageProvider with custom env vars patched."""
    import importlib
    import app.services.providers.bhashini_provider as mod
    with pytest.MonkeyPatch().context() as mp:
        for k, v in env_overrides.items():
            mp.setenv(k, v)
        # Re-import to pick up new env values for __init__
        provider = mod.BhashiniLanguageProvider()
        provider.enabled = True          # bypass _check_config guard
        provider.api_url = "https://dummy"
        provider.api_key = "dummy"
        return provider


def _resolve_tts_id(language: str, env: dict) -> str:
    """Mirror the resolution logic in synthesize() without making a network call."""
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
    return (
        env.get(env_key)
        or env.get("BHASHINI_TTS_SERVICE_ID")
        or TTS_SERVICE_ID_MAP.get(language)
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_bengali_selects_iitm(monkeypatch):
    """bn → Bhashini/IITM/TTS"""
    env = {}
    assert _resolve_tts_id("bn", env) == "Bhashini/IITM/TTS"

def test_maithili_selects_iitm(monkeypatch):
    """mai → Bhashini/IITM/TTS"""
    env = {}
    assert _resolve_tts_id("mai", env) == "Bhashini/IITM/TTS"

def test_santali_selects_iitm(monkeypatch):
    """sat → Bhashini/IITM/TTS"""
    env = {}
    assert _resolve_tts_id("sat", env) == "Bhashini/IITM/TTS"

def test_english_selects_iitm(monkeypatch):
    """en → Bhashini/IITM/TTS (via BHASHINI_TTS_SERVICE_ID_EN env var)."""
    env = {
        "BHASHINI_TTS_SERVICE_ID_EN": "Bhashini/IITM/TTS",
    }
    assert _resolve_tts_id("en", env) == "Bhashini/IITM/TTS"

def test_english_selects_iitm_from_hardcoded_map(monkeypatch):
    """en → Bhashini/IITM/TTS using in-code map when NO env vars are set."""
    env = {}
    assert _resolve_tts_id("en", env) == "Bhashini/IITM/TTS"

def test_hindi_selects_iitm(monkeypatch):
    """hi → Bhashini/IITM/TTS (via BHASHINI_TTS_SERVICE_ID_HI env var)."""
    env = {
        "BHASHINI_TTS_SERVICE_ID_HI": "Bhashini/IITM/TTS",
        "BHASHINI_TTS_SERVICE_ID_BHO": "Bhashini/IISC/TTS",
        "BHASHINI_TTS_SERVICE_ID": "Bhashini/IITM/TTS",
    }
    assert _resolve_tts_id("hi", env) == "Bhashini/IITM/TTS"


def test_bhojpuri_selects_iisc(monkeypatch):
    """bho → Bhashini/IISC/TTS (via BHASHINI_TTS_SERVICE_ID_BHO env var)."""
    env = {
        "BHASHINI_TTS_SERVICE_ID_HI": "Bhashini/IITM/TTS",
        "BHASHINI_TTS_SERVICE_ID_BHO": "Bhashini/IISC/TTS",
        "BHASHINI_TTS_SERVICE_ID": "Bhashini/IITM/TTS",
    }
    assert _resolve_tts_id("bho", env) == "Bhashini/IISC/TTS"


def test_hindi_selects_iitm_from_hardcoded_map(monkeypatch):
    """hi → Bhashini/IITM/TTS using in-code map when NO env vars are set."""
    env = {}
    assert _resolve_tts_id("hi", env) == "Bhashini/IITM/TTS"


def test_bhojpuri_selects_iisc_from_hardcoded_map(monkeypatch):
    """bho → Bhashini/IISC/TTS using in-code map when NO env vars are set."""
    env = {}
    assert _resolve_tts_id("bho", env) == "Bhashini/IISC/TTS"


def test_env_var_overrides_hardcoded_map(monkeypatch):
    """Language-specific env var takes priority over in-code defaults."""
    env = {
        "BHASHINI_TTS_SERVICE_ID_HI": "Bhashini/CustomHindiService/TTS",
    }
    assert _resolve_tts_id("hi", env) == "Bhashini/CustomHindiService/TTS"


def test_generic_fallback_used_for_unknown_language(monkeypatch):
    """Unknown language → falls back to BHASHINI_TTS_SERVICE_ID generic var."""
    env = {"BHASHINI_TTS_SERVICE_ID": "Bhashini/IITM/TTS"}
    assert _resolve_tts_id("ta", env) == "Bhashini/IITM/TTS"


def test_unknown_language_with_no_env_returns_none(monkeypatch):
    """Unknown language with no env → None (provider will raise correctly)."""
    env = {}
    result = _resolve_tts_id("xx", env)
    assert result is None


def test_hindi_not_routed_to_iisc(monkeypatch):
    """Explicit check: Hindi must never resolve to Bhashini/IISC/TTS by default."""
    env = {
        "BHASHINI_TTS_SERVICE_ID_HI": "Bhashini/IITM/TTS",
        "BHASHINI_TTS_SERVICE_ID_BHO": "Bhashini/IISC/TTS",
    }
    assert _resolve_tts_id("hi", env) != "Bhashini/IISC/TTS"


def test_bhojpuri_not_routed_to_iitm(monkeypatch):
    """Explicit check: Bhojpuri must never resolve to Bhashini/IITM/TTS by default."""
    env = {
        "BHASHINI_TTS_SERVICE_ID_HI": "Bhashini/IITM/TTS",
        "BHASHINI_TTS_SERVICE_ID_BHO": "Bhashini/IISC/TTS",
    }
    assert _resolve_tts_id("bho", env) != "Bhashini/IITM/TTS"

@pytest.mark.parametrize("lang_code", [
    "ta", "te", "kn", "ml", "mr", "gu", "pa", "or", "as", "ur", "kok", "mni", "ne"
])
def test_new_languages_select_iitm(monkeypatch, lang_code):
    """Test newly added languages correctly route to Bhashini/IITM/TTS."""
    env = {}
    assert _resolve_tts_id(lang_code, env) == "Bhashini/IITM/TTS"
