from __future__ import annotations

import os
from pathlib import Path


def load_local_env(path: Path = Path(".env")) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ[key] = value


def get_groq_api_key() -> str:
    load_local_env()
    return os.environ.get("GROQ_API_KEY", "").strip()


def get_groq_model() -> str:
    load_local_env()
    return os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile"
