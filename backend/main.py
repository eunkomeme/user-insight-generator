from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from core.analysis import build_memory_context, load_recent_sessions, run_groq_chunked_qualitative_analysis, save_analysis_session
from core.config import get_groq_api_key, get_groq_model, get_openrouter_api_key, get_openrouter_model, get_openrouter_models
from core.intake import (
    create_source,
    delete_source,
    list_sources,
    load_source,
    load_source_segments,
    parse_uploaded_research_file,
    preview_tabular_file,
    save_source,
    save_source_analysis,
)
from core.storage import ProjectMetadata, create_project, delete_project, list_projects, load_project_metadata, slugify_project_name


app = FastAPI(title="UX Research Insight Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    project_name: str = Field(default="새 리서치 분석")
    source_name: str = Field(default="붙여넣은 인터뷰.md")
    text: str = Field(min_length=1)
    research_goal: str = Field(default="")
    tasks: list[str] = Field(default_factory=list)
    evaluation_criteria: list[str] = Field(default_factory=list)


class ParseRequest(BaseModel):
    source_name: str = Field(default="붙여넣은 인터뷰.md")
    text: str = Field(min_length=1)


class ProjectRequest(BaseModel):
    project_name: str = Field(min_length=1)
    research_goal: str = Field(default="")
    product_or_feature: str = Field(default="")
    participant_count: int = Field(default=0, ge=0)
    tasks: list[str] = Field(default_factory=list)
    evaluation_criteria: list[str] = Field(default_factory=list)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "groq_key_configured": bool(get_groq_api_key()),
        "groq_model": get_groq_model(),
        "openrouter_key_configured": bool(get_openrouter_api_key()),
        "openrouter_model": get_openrouter_model(),
        "openrouter_models": get_openrouter_models(),
    }


@app.get("/api/projects")
def get_projects() -> dict[str, Any]:
    return {"projects": list_projects()}


@app.post("/api/projects")
def post_project(request: ProjectRequest) -> dict[str, Any]:
    metadata = ProjectMetadata(
        project_name=request.project_name.strip(),
        research_goal=request.research_goal.strip(),
        product_or_feature=request.product_or_feature.strip(),
        participant_count=request.participant_count,
        tasks=[task.strip() for task in request.tasks if task.strip()],
        evaluation_criteria=[criterion.strip() for criterion in request.evaluation_criteria if criterion.strip()],
    )
    try:
        created = create_project(metadata)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"project": created.__dict__}


@app.get("/api/projects/{project_slug}")
def get_project(project_slug: str) -> dict[str, Any]:
    try:
        metadata = load_project_metadata(project_slug)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"project": metadata.__dict__}


@app.delete("/api/projects/{project_slug}")
def remove_project(project_slug: str) -> dict[str, Any]:
    try:
        delete_project(project_slug)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True}


@app.get("/api/projects/{project_slug}/sources")
def get_project_sources(project_slug: str) -> dict[str, Any]:
    try:
        return {"sources": [source.to_dict() for source in list_sources(project_slug)]}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/projects/{project_slug}/sources")
async def upload_project_source(project_slug: str, file: UploadFile = File(...)) -> dict[str, Any]:
    filename = file.filename or "업로드한 리서치 자료.txt"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="파일에 저장할 내용이 없습니다.")

    parsed = parse_uploaded_research_file(filename, content)
    if not parsed.segments:
        raise HTTPException(status_code=400, detail="인식할 수 있는 리서치 원문을 찾지 못했습니다.")

    try:
        source = create_source(
            project_slug=project_slug,
            filename=filename,
            content=content,
            source_type=parsed.segments[0].source_type,
            detected_label=_detect_source_label(parsed.segments),
            segments=parsed.segments,
            warnings=parsed.warnings,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "source": source.to_dict(),
        "recognition": _recognition_from_segments(filename, parsed.segments, parsed.warnings),
    }


@app.delete("/api/projects/{project_slug}/sources/{source_id}")
def remove_project_source(project_slug: str, source_id: str) -> dict[str, Any]:
    try:
        delete_source(project_slug, source_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="소스를 찾을 수 없습니다.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True}


@app.post("/api/projects/{project_slug}/sources/{source_id}/analyze")
def analyze_project_source(
    project_slug: str,
    source_id: str,
    research_goal: str = Form(default=""),
    tasks: str = Form(default=""),
    evaluation_criteria: str = Form(default=""),
) -> dict[str, Any]:
    api_key = get_groq_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail=".env에 GROQ_API_KEY를 먼저 설정하세요.")

    try:
        source = load_source(project_slug, source_id)
        segments = load_source_segments(project_slug, source_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="소스를 찾을 수 없습니다.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not segments:
        raise HTTPException(status_code=400, detail="분석할 수 있는 세그먼트가 없습니다.")

    source.status = "분석중"
    save_source(project_slug, source)
    previous_sessions = load_recent_sessions(project_slug, max_sessions=3)
    memory_context = build_memory_context(previous_sessions)

    try:
        result = run_groq_chunked_qualitative_analysis(
            segments,
            api_key=api_key,
            model=get_groq_model(),
            timeout_seconds=120,
            fallback_api_key=get_openrouter_api_key(),
            fallback_model=",".join(get_openrouter_models()),
            project_context={
                "research_goal": research_goal,
                "tasks": _split_lines(tasks),
                "evaluation_criteria": _split_lines(evaluation_criteria),
            },
            memory_context=memory_context,
        )
    except Exception as exc:
        source.status = "오류"
        save_source(project_slug, source)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    save_source_analysis(project_slug, source_id, result.to_dict())
    save_analysis_session(project_slug, source.name, result)
    updated_source = load_source(project_slug, source_id)

    return {
        "project_name": project_slug,
        "source": updated_source.to_dict(),
        "source_name": source.name,
        "segment_count": len(segments),
        "segments": [segment.to_dict() for segment in segments],
        "analysis": result.to_dict(),
        "warnings": source.warnings,
        "memory_sessions_used": len(previous_sessions),
    }


@app.post("/api/parse")
def parse_text(request: ParseRequest) -> dict[str, Any]:
    return _recognize_content(
        source_name=request.source_name or "붙여넣은 인터뷰.md",
        content=request.text.encode("utf-8"),
    )


@app.post("/api/parse-upload")
async def parse_uploaded_file(file: UploadFile = File(...)) -> dict[str, Any]:
    filename = file.filename or "업로드한 인터뷰 자료.txt"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="파일에 인식할 내용이 없습니다.")
    return _recognize_content(source_name=filename, content=content)


@app.post("/api/preview-tabular")
async def preview_tabular_upload(file: UploadFile = File(...)) -> dict[str, Any]:
    filename = file.filename or "업로드한 정량 데이터.csv"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="미리볼 표 데이터가 없습니다.")
    try:
        return preview_tabular_file(filename, content).to_dict()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"표 데이터를 읽는 중 오류가 발생했습니다: {exc}") from exc


@app.post("/api/analyze")
def analyze_interview(request: AnalyzeRequest) -> dict[str, Any]:
    return _analyze_content(
        project_name=request.project_name,
        source_name=request.source_name or "붙여넣은 인터뷰.md",
        content=request.text.encode("utf-8"),
        project_context={
            "research_goal": request.research_goal,
            "tasks": request.tasks,
            "evaluation_criteria": request.evaluation_criteria,
        },
    )


@app.post("/api/analyze-upload")
async def analyze_uploaded_file(
    project_name: str = Form(default="새 리서치 분석"),
    research_goal: str = Form(default=""),
    tasks: str = Form(default=""),
    evaluation_criteria: str = Form(default=""),
    file: UploadFile = File(...),
) -> dict[str, Any]:
    filename = file.filename or "업로드한 인터뷰 자료.txt"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="파일에 분석할 내용이 없습니다.")
    return _analyze_content(
        project_name=project_name,
        source_name=filename,
        content=content,
        project_context={
            "research_goal": research_goal,
            "tasks": _split_lines(tasks),
            "evaluation_criteria": _split_lines(evaluation_criteria),
        },
    )


def _analyze_content(project_name: str, source_name: str, content: bytes, project_context: dict[str, Any] | None = None) -> dict[str, Any]:
    api_key = get_groq_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail=".env에 GROQ_API_KEY를 먼저 설정하세요.")

    parsed = parse_uploaded_research_file(
        source_name,
        content,
    )
    if not parsed.segments:
        raise HTTPException(status_code=400, detail="분석할 수 있는 인터뷰 원문을 찾지 못했습니다.")

    project_slug = slugify_project_name(project_name)
    previous_sessions = load_recent_sessions(project_slug, max_sessions=3)
    memory_context = build_memory_context(previous_sessions)

    try:
        result = run_groq_chunked_qualitative_analysis(
            parsed.segments,
            api_key=api_key,
            model=get_groq_model(),
            timeout_seconds=120,
            fallback_api_key=get_openrouter_api_key(),
            fallback_model=",".join(get_openrouter_models()),
            project_context=project_context,
            memory_context=memory_context,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    save_analysis_session(project_slug, source_name, result)

    return {
        "project_name": project_name,
        "source_name": source_name,
        "segment_count": len(parsed.segments),
        "segments": [segment.to_dict() for segment in parsed.segments],
        "analysis": result.to_dict(),
        "warnings": parsed.warnings,
        "memory_sessions_used": len(previous_sessions),
    }


def _split_lines(value: str) -> list[str]:
    return [line.strip() for line in value.splitlines() if line.strip()]


def _recognize_content(source_name: str, content: bytes) -> dict[str, Any]:
    parsed = parse_uploaded_research_file(source_name, content)
    if not parsed.segments:
        raise HTTPException(status_code=400, detail="인식할 수 있는 리서치 원문을 찾지 못했습니다.")

    return _recognition_from_segments(source_name, parsed.segments, parsed.warnings)


def _recognition_from_segments(source_name: str, segments: list[Any], warnings: list[str]) -> dict[str, Any]:
    participants = sorted(
        {
            segment.participant
            for segment in segments
            if segment.participant and segment.participant not in {"진행자", "참여자 미확인"}
        }
    )
    moderator_count = sum(1 for segment in segments if segment.participant == "진행자")
    participant_utterance_count = sum(1 for segment in segments if segment.include_in_analysis)
    topics = sorted(
        {
            segment.question_or_topic
            for segment in segments
            if segment.question_or_topic and segment.question_or_topic != "질문 미확인"
        }
    )
    short_count = sum(1 for segment in segments if len(segment.content.strip()) < 18)

    return {
        "source_name": source_name,
        "source_type": segments[0].source_type,
        "detected_label": _detect_source_label(segments),
        "segment_count": len(segments),
        "participant_count": len(participants),
        "participants": participants,
        "moderator_count": moderator_count,
        "participant_utterance_count": participant_utterance_count,
        "topic_count": len(topics),
        "topics": topics[:12],
        "short_utterance_count": short_count,
        "warnings": warnings,
        "preview_segments": [segment.to_dict() for segment in segments[:8]],
        "analysis_policy": {
            "moderator_excluded_from_evidence": True,
            "evidence_required": True,
            "pain_point_and_insight_separated": True,
            "participant_comparison": True,
            "system_prompt_version": "ux-research-strict-v1",
        },
    }


def _detect_source_label(segments: list[Any]) -> str:
    if not segments:
        return "자료"
    source_type = segments[0].source_type
    participants = {
        segment.participant
        for segment in segments
        if segment.participant and segment.participant not in {"진행자", "참여자 미확인"}
    }
    topic_count = len({segment.question_or_topic for segment in segments if segment.question_or_topic != "질문 미확인"})
    has_turns = len(participants) >= 2 and any(segment.participant == "진행자" for segment in segments)

    if source_type == "CSV":
        return "설문/정량 데이터"
    if source_type == "엑셀":
        return "표 기반 리서치 자료"
    if has_turns:
        return "인터뷰 / FGD"
    if topic_count >= 2:
        return "질문-응답 자료"
    if source_type in {"텍스트", "마크다운"}:
        return "관찰/메모 텍스트"
    return "혼합 문서"
