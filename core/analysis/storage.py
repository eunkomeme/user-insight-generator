from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.storage import PROJECTS_DIR

from .qualitative import AnalysisResult


def analysis_dir(project_slug: str) -> Path:
    path = PROJECTS_DIR / project_slug / "analysis"
    path.mkdir(parents=True, exist_ok=True)
    return path


def analysis_result_path(project_slug: str) -> Path:
    return analysis_dir(project_slug) / "qualitative_analysis.json"


def save_analysis_result(project_slug: str, result: AnalysisResult) -> Path:
    path = analysis_result_path(project_slug)
    path.write_text(json.dumps(result.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def load_analysis_result(project_slug: str) -> AnalysisResult | None:
    path = analysis_result_path(project_slug)
    if not path.exists():
        return None
    return AnalysisResult.from_dict(json.loads(path.read_text(encoding="utf-8")))


# --- Session-based memory ---


def save_analysis_session(
    project_slug: str,
    source_name: str,
    result: AnalysisResult,
) -> Path:
    """Save an analysis result as a timestamped session file."""
    sessions_dir = analysis_dir(project_slug) / "sessions"
    sessions_dir.mkdir(exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    slug = _slugify(source_name)
    path = sessions_dir / f"{timestamp}_{slug}.json"

    payload: dict[str, Any] = {
        "source_name": source_name,
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "analysis": result.to_dict(),
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def load_recent_sessions(
    project_slug: str,
    max_sessions: int = 3,
) -> list[dict[str, Any]]:
    """Return the most recent N analysis session records (newest first)."""
    sessions_dir = analysis_dir(project_slug) / "sessions"
    if not sessions_dir.exists():
        return []

    files = sorted(sessions_dir.glob("*.json"), reverse=True)[:max_sessions]
    sessions: list[dict[str, Any]] = []
    for path in files:
        try:
            sessions.append(json.loads(path.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            continue
    return sessions


def build_memory_context(sessions: list[dict[str, Any]]) -> str:
    """Build a compact prompt block summarising previous session insights."""
    if not sessions:
        return ""

    lines: list[str] = ["=== 이전 세션 인사이트 (참고용) ==="]
    for entry in sessions:
        source = entry.get("source_name", "알 수 없음")
        saved_at = (entry.get("saved_at") or "")[:10]
        analysis = entry.get("analysis", {})
        insights = analysis.get("insights", [])

        lines.append(f"\n[{source} / {saved_at}]")
        for insight in insights[:4]:
            title = insight.get("title", "").strip()
            confidence = insight.get("confidence", "")
            if title:
                lines.append(f"- {title} (신뢰도: {confidence})")

    lines.append(
        "\n위 내용은 이전 세션의 참고 정보입니다. "
        "새 데이터를 독립적으로 분석하되, 반복 패턴이 보이면 연결하세요.\n"
    )
    return "\n".join(lines)


def _slugify(name: str) -> str:
    slug = name.strip().lower()
    slug = re.sub(r"[^a-z0-9가-힣]+", "-", slug)
    return slug.strip("-")[:50] or "analysis"
