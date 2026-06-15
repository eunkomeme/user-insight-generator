from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from core.analysis import build_memory_context, load_recent_sessions, run_chat, run_groq_chunked_qualitative_analysis, save_analysis_session
from core.config import get_groq_api_key, get_groq_model, get_openrouter_api_key, get_openrouter_model, get_openrouter_models
from core.intake import (
    create_source,
    delete_source,
    list_sources,
    load_affinity,
    load_source,
    load_source_analysis,
    load_source_segments,
    parse_uploaded_research_file,
    save_affinity,
    save_source,
    save_source_analysis,
)
from core.storage import ProjectMetadata, create_project, delete_project, list_projects, load_project_metadata, slugify_project_name


app = FastAPI(title="UX Research Insight Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    source_ids: list[str] = Field(default_factory=list)
    history: list[dict[str, str]] = Field(default_factory=list)


class ProjectRequest(BaseModel):
    project_name: str = Field(min_length=1)
    research_goal: str = Field(default="")
    product_or_feature: str = Field(default="")
    participant_count: int = Field(default=0, ge=0)
    tasks: list[str] = Field(default_factory=list)
    evaluation_criteria: list[str] = Field(default_factory=list)


class ReportMarkdownRequest(BaseModel):
    project_name: str = Field(default="UX 리서치 프로젝트")
    source_name: str = Field(default="리서치 자료")
    source_type: str = Field(default="")
    segment_count: int = Field(default=0, ge=0)
    participant_utterance_count: Optional[int] = Field(default=None, ge=0)
    participants: list[str] = Field(default_factory=list)
    insights: list[dict[str, Any]] = Field(default_factory=list)
    segments: list[dict[str, Any]] = Field(default_factory=list)


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


@app.get("/api/projects/{project_slug}/sources/{source_id}/analysis")
def get_project_source_analysis(project_slug: str, source_id: str) -> dict[str, Any]:
    try:
        source = load_source(project_slug, source_id)
        segments = load_source_segments(project_slug, source_id)
        analysis = load_source_analysis(project_slug, source_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="저장된 분석 결과를 찾을 수 없습니다.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    recognition = _recognition_from_segments(source.name, segments, source.warnings) if segments else None
    return {
        "project_name": project_slug,
        "source": source.to_dict(),
        "source_name": source.name,
        "segment_count": len(segments),
        "segments": [segment.to_dict() for segment in segments],
        "analysis": analysis,
        "warnings": source.warnings,
        "recognition": recognition,
    }


@app.get("/api/projects/{project_slug}/sources/{source_id}/affinity")
def get_source_affinity(project_slug: str, source_id: str) -> dict[str, Any]:
    try:
        return {"overrides": load_affinity(project_slug, source_id)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


class AffinityRequest(BaseModel):
    overrides: dict[str, str] = Field(default_factory=dict)


@app.post("/api/projects/{project_slug}/sources/{source_id}/affinity")
def save_source_affinity(project_slug: str, source_id: str, request: AffinityRequest) -> dict[str, Any]:
    try:
        save_affinity(project_slug, source_id, request.overrides)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True}


@app.post("/api/projects/{project_slug}/chat")
def chat_with_sources(project_slug: str, request: ChatRequest) -> dict[str, Any]:
    api_key = get_groq_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail=".env에 GROQ_API_KEY를 먼저 설정하세요.")

    try:
        records = list_sources(project_slug)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    wanted = set(request.source_ids)
    selected = [r for r in records if not wanted or r.id in wanted]
    if not selected:
        raise HTTPException(status_code=400, detail="대화할 소스를 선택하세요.")

    tagged: list[dict[str, Any]] = []
    for record in selected:
        for segment in load_source_segments(project_slug, record.id):
            if not segment.content.strip():
                continue
            tagged.append(
                {
                    "id": segment.id,
                    "participant": segment.participant,
                    "question_or_topic": segment.question_or_topic,
                    "content": segment.content,
                    "source_id": record.id,
                    "source_name": record.name,
                }
            )

    if not tagged:
        raise HTTPException(status_code=400, detail="선택한 소스에 대화할 발화가 없습니다.")

    try:
        return run_chat(
            request.question,
            tagged,
            request.history,
            api_key=api_key,
            model=get_groq_model(),
            fallback_api_key=get_openrouter_api_key(),
            fallback_model=",".join(get_openrouter_models()),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


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

    source_type = segments[0].source_type if segments else "텍스트"
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
            source_type=source_type,
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

    source_type = parsed.segments[0].source_type if parsed.segments else "텍스트"
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
            source_type=source_type,
            quantitative_summary=parsed.quantitative_summary,
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
        "quantitative_summary": parsed.quantitative_summary,
    }


@app.post("/api/report/markdown")
def build_report_markdown(request: ReportMarkdownRequest) -> dict[str, Any]:
    markdown = _build_report_markdown(request)
    if not markdown:
        raise HTTPException(status_code=400, detail="보고서에 포함할 인사이트가 없습니다.")
    return {"markdown": markdown}


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


def _build_report_markdown(request: ReportMarkdownRequest) -> str:
    insights = [insight for insight in request.insights if str(insight.get("title", "")).strip()]
    if not insights:
        return ""

    segment_by_id = {str(segment.get("id", "")): segment for segment in request.segments if segment.get("id")}
    source_type = request.source_type or "미확인"
    participants = ", ".join(request.participants) if request.participants else "미확인"
    participant_utterances = (
        str(request.participant_utterance_count)
        if request.participant_utterance_count is not None
        else "미확인"
    )
    type_summary = _format_insight_type_summary(insights)
    finding_sections = "\n\n".join(
        _format_insight_section(index, insight, segment_by_id)
        for index, insight in enumerate(insights, start=1)
    )
    recommendations = "\n".join(
        f"{index}. {str(insight.get('recommendation') or '후속 검토가 필요합니다.').strip()}"
        for index, insight in enumerate(insights, start=1)
    )
    appendix = _format_appendix(insights, segment_by_id)

    return f"""# {request.project_name} UX 리서치 보고서 초안

## Executive Summary
이번 분석에서는 {len(insights)}개의 핵심 인사이트가 보고서 초안에 반영되었습니다.

## 리서치 개요
- 프로젝트명: {request.project_name}
- 자료명: {request.source_name}
- 자료 유형: {source_type}

## 방법
- 원자료 세그먼트: {request.segment_count}개
- 분석 대상 참가자 발화: {participant_utterances}개
- 인식된 참가자: {participants}

## 주요 발견
{finding_sections}

## 인사이트 유형
{type_summary}

## 개선 제안
{recommendations}

## Appendix
{appendix}
""".strip() + "\n"


def _format_insight_section(index: int, insight: dict[str, Any], segment_by_id: dict[str, dict[str, Any]]) -> str:
    title = str(insight.get("title") or "제목 없는 인사이트").strip()
    summary = str(insight.get("summary") or "").strip()
    severity = str(insight.get("severity") or "보통").strip()
    frequency = str(insight.get("frequency") or "보통").strip()
    confidence = str(insight.get("confidence") or "보통").strip()
    recommendation = str(insight.get("recommendation") or "후속 검토가 필요합니다.").strip()
    evidence = _format_evidence(insight, segment_by_id, max_items=3)
    return f"""### {index}. {title}

{summary}

**영향도 / 빈도 / 신뢰도**
{severity} / {frequency} / {confidence}

**개선 제안**
{recommendation}

**근거**
{evidence}"""


def _format_evidence(insight: dict[str, Any], segment_by_id: dict[str, dict[str, Any]], max_items: int | None = None) -> str:
    ids = _evidence_segment_ids(insight)
    if max_items is not None:
        ids = ids[:max_items]
    lines: list[str] = []
    for segment_id in ids:
        segment = segment_by_id.get(segment_id)
        if segment:
            participant = str(segment.get("participant") or "참여자 미확인")
            topic = str(segment.get("question_or_topic") or "질문 미확인")
            content = str(segment.get("content") or "").strip()
            lines.append(f"- {participant} · {topic}: {content}")
            continue
        quote = _quote_for_segment_id(insight, segment_id)
        if quote:
            lines.append(f"- {quote}")
    return "\n".join(lines) if lines else "- 연결된 근거가 없습니다."


def _format_appendix(insights: list[dict[str, Any]], segment_by_id: dict[str, dict[str, Any]]) -> str:
    seen: set[str] = set()
    lines: list[str] = []
    for insight in insights:
        for segment_id in _evidence_segment_ids(insight):
            if segment_id in seen:
                continue
            seen.add(segment_id)
            segment = segment_by_id.get(segment_id)
            if segment:
                lines.append(
                    f"- {segment.get('participant', '참여자 미확인')} · "
                    f"{segment.get('question_or_topic', '질문 미확인')}: "
                    f"{str(segment.get('content') or '').strip()}"
                )
                continue
            quote = _quote_for_segment_id(insight, segment_id)
            if quote:
                lines.append(f"- {quote}")
    return "\n".join(lines) if lines else "- 반영된 인사이트에 연결된 근거가 없습니다."


def _format_insight_type_summary(insights: list[dict[str, Any]]) -> str:
    labels = {
        "pain_point": "페인포인트",
        "usability_issue": "사용성 이슈",
        "positive_signal": "긍정 신호",
        "task_friction": "태스크 마찰",
    }
    counts: dict[str, int] = {}
    for insight in insights:
        insight_type = str(insight.get("type") or "usability_issue")
        counts[insight_type] = counts.get(insight_type, 0) + 1
    return "\n".join(f"- {labels.get(key, key)}: {value}개" for key, value in counts.items())


def _evidence_segment_ids(insight: dict[str, Any]) -> list[str]:
    ids: list[str] = []
    for quote in insight.get("supporting_quotes", []) or []:
        segment_id = str(quote.get("source_id") or quote.get("segment_id") or "").strip()
        if segment_id:
            ids.append(segment_id)
    for segment_id in insight.get("evidence_segment_ids", []) or []:
        if str(segment_id).strip():
            ids.append(str(segment_id).strip())
    deduped: list[str] = []
    for segment_id in ids:
        if segment_id not in deduped:
            deduped.append(segment_id)
    return deduped


def _quote_for_segment_id(insight: dict[str, Any], segment_id: str) -> str:
    for quote in insight.get("supporting_quotes", []) or []:
        quote_segment_id = str(quote.get("source_id") or quote.get("segment_id") or "").strip()
        if quote_segment_id == segment_id:
            participant = str(quote.get("participant") or "참여자 미확인").strip()
            text = str(quote.get("quote") or "").strip()
            return f"{participant}: {text}" if text else ""
    return ""
