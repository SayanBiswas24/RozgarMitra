"""
app/config.py
─────────────
Central configuration for the Voice Processing module.
All secrets are loaded from environment variables — never hard-coded.

Required environment variables (see .env.example):
  BHASHINI_USER_ID        – ULCA-registered user ID
  BHASHINI_ULCA_API_KEY   – Primary ULCA API key (used for Pipeline Config calls)
  BHASHINI_PIPELINE_ID    – Pipeline ID obtained from the BHASHINI portal

Optional:
  BHASHINI_CONFIG_URL     – Pipeline Config endpoint (defaults to production ULCA)
  BHASHINI_TIMEOUT        – HTTP timeout in seconds (default: 30)
  MAX_AUDIO_SIZE_MB       – Maximum accepted upload size in MB (default: 25)
  ALLOWED_AUDIO_MIME_TYPES – Comma-separated MIME types (default: common browser types)
  LOG_LEVEL               – Python logging level string (default: INFO)
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import FrozenSet

from dotenv import load_dotenv

load_dotenv()


def _csv_to_frozenset(value: str) -> FrozenSet[str]:
    """Split a comma-separated env-var into a frozenset of stripped strings."""
    return frozenset(v.strip() for v in value.split(",") if v.strip())


class Settings:
    """Application settings derived entirely from environment variables."""

    bhashini_api_url: str = os.getenv("BHASHINI_API_URL", "https://dhruva-api.bhashini.gov.in/services/inference/pipeline")
    bhashini_api_key: str = os.getenv("BHASHINI_API_KEY", "")
    bhashini_timeout: float = float(os.getenv("BHASHINI_TIMEOUT", "30"))

    # ── Audio Validation ────────────────────────────────────────────────────────
    max_audio_size_bytes: int = int(os.getenv("MAX_AUDIO_SIZE_MB", "25")) * 1024 * 1024

    allowed_audio_mime_types: FrozenSet[str] = _csv_to_frozenset(
        os.getenv(
            "ALLOWED_AUDIO_MIME_TYPES",
            "audio/wav,audio/x-wav,audio/wave,"
            "audio/webm,audio/ogg,audio/mpeg,audio/mp4,"
            "audio/flac,audio/aac,audio/opus,audio/3gpp",
        )
    )

    # ── Logging ─────────────────────────────────────────────────────────────────
    log_level: str = os.getenv("LOG_LEVEL", "INFO").upper()

    # ── Application Meta ────────────────────────────────────────────────────────
    app_title: str = "PS-97 Voice Processing API"
    app_version: str = "0.1.0"
    app_description: str = "Multilingual Voice Processing"

    def is_bhashini_configured(self) -> bool:
        return bool(self.bhashini_api_url and self.bhashini_api_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    settings = Settings()
    logging.basicConfig(level=getattr(logging, settings.log_level, logging.INFO))
    return settings
