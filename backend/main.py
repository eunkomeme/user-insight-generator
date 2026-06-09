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

from core.analysis import run_groq_chunked_qualitative_analysis
from core.config import get_groq_api_key, get_groq_model, get_openrouter_api_key, get_openrouter_model, get_openrouter_models
from core.intake import parse_uploaded_research_file


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

    try:
        result = run_groq_chunked_qualitative_analysis(
            parsed.segments,
            api_key=api_key,
            model=get_groq_model(),
            timeout_seconds=120,
            fallback_api_key=get_openrouter_api_key(),
            fallback_model=",".join(get_openrouter_models()),
            project_context=project_context,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "project_name": project_name,
        "source_name": source_name,
        "segment_count": len(parsed.segments),
        "segments": [segment.to_dict() for segment in parsed.segments],
        "analysis": result.to_dict(),
        "warnings": parsed.warnings,
    }


def _split_lines(value: str) -> list[str]:
    return [line.strip() for line in value.splitlines() if line.strip()]


def _recognize_content(source_name: str, content: bytes) -> dict[str, Any]:
    parsed = parse_uploaded_research_file(source_name, content)
    if not parsed.segments:
        raise HTTPException(status_code=400, detail="인식할 수 있는 리서치 원문을 찾지 못했습니다.")

    participants = sorted(
        {
            segment.participant
            for segment in parsed.segments
            if segment.participant and segment.participant not in {"진행자", "참여자 미확인"}
        }
    )
    moderator_count = sum(1 for segment in parsed.segments if segment.participant == "진행자")
    participant_utterance_count = sum(1 for segment in parsed.segments if segment.include_in_analysis)
    topics = sorted(
        {
            segment.question_or_topic
            for segment in parsed.segments
            if segment.question_or_topic and segment.question_or_topic != "질문 미확인"
        }
    )
    short_count = sum(1 for segment in parsed.segments if len(segment.content.strip()) < 18)

    return {
        "source_name": source_name,
        "source_type": parsed.segments[0].source_type,
        "segment_count": len(parsed.segments),
        "participant_count": len(participants),
        "participants": participants,
        "moderator_count": moderator_count,
        "participant_utterance_count": participant_utterance_count,
        "topic_count": len(topics),
        "topics": topics[:12],
        "short_utterance_count": short_count,
        "warnings": parsed.warnings,
        "preview_segments": [segment.to_dict() for segment in parsed.segments[:8]],
        "analysis_policy": {
            "moderator_excluded_from_evidence": True,
            "evidence_required": True,
            "pain_point_and_insight_separated": True,
            "participant_comparison": True,
            "system_prompt_version": "ux-research-strict-v1",
        },
    }
