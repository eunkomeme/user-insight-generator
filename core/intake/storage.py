from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from core.storage import PROJECTS_DIR

from .models import Segment


def project_dir(project_slug: str) -> Path:
    return PROJECTS_DIR / project_slug


def inputs_dir(project_slug: str) -> Path:
    path = project_dir(project_slug) / "inputs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def raw_dir(project_slug: str) -> Path:
    path = inputs_dir(project_slug) / "raw"
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_raw_upload(project_slug: str, filename: str, content: bytes) -> Path:
    safe_name = Path(filename).name
    target = raw_dir(project_slug) / safe_name
    target.write_bytes(content)
    return target


def segments_path(project_slug: str) -> Path:
    return inputs_dir(project_slug) / "segments.json"


def save_segments(project_slug: str, segments: list[Segment]) -> Path:
    path = segments_path(project_slug)
    path.write_text(
        json.dumps([segment.to_dict() for segment in segments], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


def load_segments(project_slug: str) -> list[Segment]:
    path = segments_path(project_slug)
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return [Segment.from_dict(item) for item in data]


def review_status_path(project_slug: str) -> Path:
    return inputs_dir(project_slug) / "structure_review.json"


def save_structure_review_status(project_slug: str, is_complete: bool) -> Path:
    path = review_status_path(project_slug)
    path.write_text(
        json.dumps({"is_complete": is_complete}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


def load_structure_review_status(project_slug: str) -> bool:
    path = review_status_path(project_slug)
    if not path.exists():
        return False
    try:
        data: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return False
    return bool(data.get("is_complete", False))
