from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECTS_DIR = Path("projects")


@dataclass
class ProjectMetadata:
    project_name: str
    research_goal: str
    product_or_feature: str
    participant_count: int
    tasks: list[str] = field(default_factory=list)
    evaluation_criteria: list[str] = field(default_factory=list)
    project_slug: str = ""
    created_at: str = ""
    updated_at: str = ""


def slugify_project_name(project_name: str) -> str:
    slug = project_name.strip().lower()
    slug = re.sub(r"[^a-z0-9가-힣]+", "-", slug)
    slug = slug.strip("-")
    return slug or "untitled-project"


def list_projects(projects_dir: Path = PROJECTS_DIR) -> list[dict[str, Any]]:
    if not projects_dir.exists():
        return []

    projects: list[dict[str, Any]] = []
    for metadata_path in sorted(projects_dir.glob("*/metadata.json")):
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue

        projects.append(
            {
                "slug": metadata_path.parent.name,
                "name": metadata.get("project_name", metadata_path.parent.name),
                "updated_at": metadata.get("updated_at", ""),
                "path": str(metadata_path.parent),
            }
        )

    return sorted(projects, key=lambda item: item["updated_at"], reverse=True)


def load_project_metadata(project_slug: str, projects_dir: Path = PROJECTS_DIR) -> ProjectMetadata:
    metadata_path = projects_dir / project_slug / "metadata.json"
    data = json.loads(metadata_path.read_text(encoding="utf-8"))
    return ProjectMetadata(**data)


def create_project(metadata: ProjectMetadata, projects_dir: Path = PROJECTS_DIR) -> ProjectMetadata:
    now = datetime.now(timezone.utc).isoformat()
    project_slug = metadata.project_slug or slugify_project_name(metadata.project_name)
    project_dir = projects_dir / project_slug

    project_dir.mkdir(parents=True, exist_ok=True)
    (project_dir / "inputs").mkdir(exist_ok=True)
    (project_dir / "analysis").mkdir(exist_ok=True)
    (project_dir / "reports").mkdir(exist_ok=True)

    existing_created_at = metadata.created_at
    metadata.project_slug = project_slug
    metadata.created_at = existing_created_at or now
    metadata.updated_at = now

    metadata_path = project_dir / "metadata.json"
    metadata_path.write_text(
        json.dumps(asdict(metadata), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return metadata
