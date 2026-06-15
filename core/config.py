from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env once at module import time. Subsequent calls to load_local_env()
# are no-ops unless override=True is explicitly requested.
load_dotenv(Path(".env"), override=True)


def load_local_env(path: Path = Path(".env")) -> None:
    """Reload environment from a custom .env path (e.g. for tests)."""
    load_dotenv(path, override=True)


def get_groq_api_key() -> str:
    return os.environ.get("GROQ_API_KEY", "").strip()


def get_groq_model() -> str:
    return os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile"


def get_openrouter_api_key() -> str:
    return os.environ.get("OPENROUTER_API_KEY", "").strip()


def get_openrouter_model() -> str:
    return os.environ.get("OPENROUTER_MODEL", "openrouter/free").strip() or "openrouter/free"


def get_openrouter_models() -> list[str]:
    raw_models = os.environ.get("OPENROUTER_MODELS", "").strip()
    if raw_models:
        return [model.strip() for model in raw_models.split(",") if model.strip()]
    return [get_openrouter_model()]


def get_analysis_chunk_size() -> int:
    load_local_env()
    return _positive_int("ANALYSIS_CHUNK_SIZE", 10)


def get_analysis_chunk_max_tokens() -> int:
    load_local_env()
    return _positive_int("ANALYSIS_CHUNK_MAX_TOKENS", 1500)


def get_analysis_synthesis_max_tokens() -> int:
    load_local_env()
    return _positive_int("ANALYSIS_SYNTHESIS_MAX_TOKENS", 6000)


def get_analysis_prompt_max_segments() -> int:
    load_local_env()
    return _positive_int("ANALYSIS_PROMPT_MAX_SEGMENTS", 45)


def get_analysis_prompt_segment_chars() -> int:
    load_local_env()
    return _positive_int("ANALYSIS_PROMPT_SEGMENT_CHARS", 420)


def get_analysis_chunk_segment_chars() -> int:
    load_local_env()
    return _positive_int("ANALYSIS_CHUNK_SEGMENT_CHARS", 260)


def get_gauss_endpoint() -> str:
    return os.environ.get("GAUSS_ENDPOINT_URL", "").strip()


def get_gauss_client_key() -> str:
    return os.environ.get("GAUSS_CLIENT_KEY", "").strip()


def get_gauss_api_token() -> str:
    return os.environ.get("GAUSS_API_TOKEN", "").strip()


def _positive_int(key: str, default: int) -> int:
    try:
        value = int(os.environ.get(key, str(default)))
    except ValueError:
        return default
    return value if value > 0 else default
