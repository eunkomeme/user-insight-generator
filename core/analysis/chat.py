from __future__ import annotations

import json
from typing import Any

from core.config import get_analysis_prompt_max_segments, get_analysis_prompt_segment_chars

from .groq import (
    GROQ_CHAT_COMPLETIONS_URL,
    OPENROUTER_CHAT_COMPLETIONS_URL,
    ProviderRateLimitError,
    _chat_json,
)


def run_chat(
    question: str,
    segments: list[dict[str, Any]],
    history: list[dict[str, str]],
    api_key: str,
    model: str,
    fallback_api_key: str = "",
    fallback_model: str = "",
    timeout_seconds: int = 60,
) -> dict[str, Any]:
    """선택한 소스의 발화에만 근거해 질문에 답하는 grounded Q&A.

    segments: 각 항목에 id/participant/question_or_topic/content/source_id/source_name 포함.
    벡터 검색 없이 발화 전체(캡 적용)를 컨텍스트로 넣는 full-context 방식.
    """
    usable = [seg for seg in segments if str(seg.get("content", "")).strip()]
    if not usable:
        raise ValueError("답변에 사용할 발화가 없습니다.")

    user_prompt = _chat_user_prompt(question, history, usable)

    try:
        data = _chat_json(
            api_key=api_key,
            model=model,
            endpoint=GROQ_CHAT_COMPLETIONS_URL,
            provider_name="Groq",
            system_prompt=_chat_system_prompt(),
            user_prompt=user_prompt,
            timeout_seconds=timeout_seconds,
            max_tokens=1500,
            max_retries=0,
        )
    except ProviderRateLimitError:
        if not fallback_api_key:
            raise
        data = _chat_json(
            api_key=fallback_api_key,
            model=fallback_model or "google/gemini-2.5-flash",
            endpoint=OPENROUTER_CHAT_COMPLETIONS_URL,
            provider_name="OpenRouter",
            system_prompt=_chat_system_prompt(),
            user_prompt=user_prompt,
            timeout_seconds=timeout_seconds,
            max_tokens=1500,
            max_retries=1,
        )

    return _build_response(data, usable)


def _chat_system_prompt() -> str:
    return """
당신은 사용자 리서치 자료에 근거해 답하는 어시스턴트입니다.

규칙:
- 아래에 제공된 발화(원자료)에만 근거해 답하세요. 제공되지 않은 정보로 추측하지 마세요.
- 자료에서 답을 찾을 수 없으면 솔직하게 "제공된 자료에서는 확인할 수 없습니다"라고 답하세요.
- 답변은 한국어로, 간결하고 구체적으로 작성하세요.
- 답변의 근거가 된 발화의 id를 citations에 넣으세요. 실제로 사용한 발화만 넣고, 없으면 빈 배열로 두세요.

JSON으로만 응답하세요(설명·마크다운·코드펜스 없이):
{
  "answer": "질문에 대한 한국어 답변",
  "citations": [
    { "segment_id": "seg_0001", "quote": "근거가 된 발화 원문 일부" }
  ]
}
""".strip()


def _chat_user_prompt(question: str, history: list[dict[str, str]], segments: list[dict[str, Any]]) -> str:
    max_segments = get_analysis_prompt_max_segments()
    max_chars = get_analysis_prompt_segment_chars()
    compact = [
        {
            "id": seg.get("id"),
            "participant": seg.get("participant"),
            "question_or_topic": seg.get("question_or_topic"),
            "content": str(seg.get("content", ""))[:max_chars],
        }
        for seg in segments[:max_segments]
    ]
    history_block = _format_history(history)
    return f"""
{history_block}현재 질문:
{question}

아래는 답변 근거로 사용할 수 있는 리서치 발화입니다. 이 발화들에만 근거해 답하세요.
{json.dumps(compact, ensure_ascii=False)}
""".strip()


def _format_history(history: list[dict[str, str]]) -> str:
    recent = [h for h in history if h.get("content")][-6:]
    if not recent:
        return ""
    lines = []
    for turn in recent:
        role = "사용자" if turn.get("role") == "user" else "어시스턴트"
        lines.append(f"{role}: {str(turn.get('content', ''))[:300]}")
    return "이전 대화:\n" + "\n".join(lines) + "\n\n"


def _build_response(data: dict[str, Any], segments: list[dict[str, Any]]) -> dict[str, Any]:
    by_id = {str(seg.get("id")): seg for seg in segments}
    citations: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw in data.get("citations", []):
        segment_id = str(raw.get("segment_id") or raw.get("source_id") or "")
        if not segment_id or segment_id in seen:
            continue
        source = by_id.get(segment_id)
        if not source:
            continue
        seen.add(segment_id)
        citations.append(
            {
                "source_id": str(source.get("source_id", "")),
                "source_name": str(source.get("source_name", "")),
                "segment_id": segment_id,
                "participant": str(source.get("participant", "")),
                "quote": str(raw.get("quote") or source.get("content", ""))[:300],
            }
        )

    return {
        "answer": str(data.get("answer", "")).strip() or "제공된 자료에서는 확인할 수 없습니다.",
        "citations": citations,
    }
