from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.storage import PROJECTS_DIR

from .models import Segment


@dataclass
class SourceRecord:
    id: str
    name: str
    source_type: str
    status: str
    detected_label: str
    raw_path: str
    segment_count: int = 0
    participant_count: int = 0
    insight_count: int = 0
    warnings: list[str] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SourceRecord":
        return cls(
            id=str(data.get("id") or ""),
            name=str(data.get("name") or ""),
            source_type=str(data.get("source_type") or ""),
            status=str(data.get("status") or "대기중"),
            detected_label=str(data.get("detected_label") or ""),
            raw_path=str(data.get("raw_path") or ""),
            segment_count=int(data.get("segment_count") or 0),
            participant_count=int(data.get("participant_count") or 0),
            insight_count=int(data.get("insight_count") or 0),
            warnings=[str(item) for item in data.get("warnings", [])],
            created_at=str(data.get("created_at") or ""),
            updated_at=str(data.get("updated_at") or ""),
        )


def list_sources(project_slug: str) -> list[SourceRecord]:
    base = sources_dir(project_slug)
    records: list[SourceRecord] = []
    for metadata_path in sorted(base.glob("*/metadata.json")):
        try:
            records.append(SourceRecord.from_dict(json.loads(metadata_path.read_text(encoding="utf-8"))))
        except (json.JSONDecodeError, OSError, ValueError):
            continue
    return sorted(records, key=lambda record: record.updated_at, reverse=True)


def load_source(project_slug: str, source_id: str) -> SourceRecord:
    path = source_dir(project_slug, source_id) / "metadata.json"
    if not path.exists():
        raise FileNotFoundError(source_id)
    return SourceRecord.from_dict(json.loads(path.read_text(encoding="utf-8")))


def create_source(
    project_slug: str,
    filename: str,
    content: bytes,
    source_type: str,
    detected_label: str,
    segments: list[Segment],
    warnings: list[str],
) -> SourceRecord:
    now = _now()
    source_id = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{_slugify(filename)}"
    directory = source_dir(project_slug, source_id)
    directory.mkdir(parents=True, exist_ok=True)

    raw_name = Path(filename).name or "source.txt"
    raw_path = directory / raw_name
    raw_path.write_bytes(content)
    _write_segments(directory, segments)

    participants = {
        segment.participant
        for segment in segments
        if segment.participant and segment.participant not in {"진행자", "참여자 미확인"}
    }
    record = SourceRecord(
        id=source_id,
        name=raw_name,
        source_type=source_type,
        status="대기중",
        detected_label=detected_label,
        raw_path=str(raw_path),
        segment_count=len(segments),
        participant_count=len(participants),
        warnings=warnings,
        created_at=now,
        updated_at=now,
    )
    save_source(project_slug, record)
    return record


def save_source(project_slug: str, record: SourceRecord) -> SourceRecord:
    record.updated_at = _now()
    directory = source_dir(project_slug, record.id)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "metadata.json").write_text(
        json.dumps(record.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return record


def delete_source(project_slug: str, source_id: str) -> None:
    directory = source_dir(project_slug, source_id)
    if not (directory / "metadata.json").exists():
        raise FileNotFoundError(source_id)
    for path in sorted(directory.rglob("*"), reverse=True):
        if path.is_file():
            path.unlink()
        elif path.is_dir():
            path.rmdir()
    directory.rmdir()


def load_source_segments(project_slug: str, source_id: str) -> list[Segment]:
    path = source_dir(project_slug, source_id) / "segments.json"
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return [Segment.from_dict(item) for item in data]


def save_source_analysis(project_slug: str, source_id: str, analysis: dict[str, Any]) -> Path:
    directory = source_dir(project_slug, source_id)
    path = directory / "analysis.json"
    path.write_text(json.dumps(analysis, ensure_ascii=False, indent=2), encoding="utf-8")
    record = load_source(project_slug, source_id)
    record.status = "분석완료"
    record.insight_count = len(analysis.get("insights", []))
    save_source(project_slug, record)
    return path


def load_source_analysis(project_slug: str, source_id: str) -> dict[str, Any]:
    path = source_dir(project_slug, source_id) / "analysis.json"
    if not path.exists():
        raise FileNotFoundError(source_id)
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def save_affinity(project_slug: str, source_id: str, overrides: dict[str, str]) -> None:
    directory = source_dir(project_slug, source_id)
    (directory / "affinity.json").write_text(
        json.dumps(overrides, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_affinity(project_slug: str, source_id: str) -> dict[str, str]:
    path = source_dir(project_slug, source_id) / "affinity.json"
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return {str(k): str(v) for k, v in data.items()} if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def source_dir(project_slug: str, source_id: str) -> Path:
    if not source_id or source_id != _slugify(source_id):
        raise ValueError("유효하지 않은 소스 식별자입니다.")
    return sources_dir(project_slug) / source_id


def sources_dir(project_slug: str) -> Path:
    if not project_slug or project_slug != _slugify(project_slug):
        raise ValueError("유효하지 않은 프로젝트 식별자입니다.")
    path = PROJECTS_DIR / project_slug / "inputs" / "sources"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _write_segments(directory: Path, segments: list[Segment]) -> None:
    (directory / "segments.json").write_text(
        json.dumps([segment.to_dict() for segment in segments], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _slugify(value: str) -> str:
    slug = value.strip().lower()
    slug = re.sub(r"[^a-z0-9가-힣]+", "-", slug)
    return slug.strip("-")[:80] or "source"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
