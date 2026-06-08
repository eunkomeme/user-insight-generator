from __future__ import annotations

import json
from pathlib import Path

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
