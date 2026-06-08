from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Segment:
    id: str
    participant: str
    question_or_topic: str
    content: str
    source_file: str
    source_type: str
    source_location: str
    include_in_analysis: bool = True
    created_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["created_at"] = data["created_at"] or utc_now()
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Segment":
        return cls(
            id=str(data.get("id", "")),
            participant=str(data.get("participant") or "참여자 미확인"),
            question_or_topic=str(data.get("question_or_topic") or "질문 미확인"),
            content=str(data.get("content") or ""),
            source_file=str(data.get("source_file") or ""),
            source_type=str(data.get("source_type") or ""),
            source_location=str(data.get("source_location") or ""),
            include_in_analysis=bool(data.get("include_in_analysis", True)),
            created_at=str(data.get("created_at") or utc_now()),
        )
