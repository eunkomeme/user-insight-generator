from __future__ import annotations

import json
import re
import time
from collections import Counter
from typing import Any

import requests

from core.intake import Segment

from .qualitative import AnalysisResult


GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"


def run_groq_qualitative_analysis(
    segments: list[Segment],
    api_key: str,
    model: str,
    timeout_seconds: int = 90,
    project_context: dict[str, Any] | None = None,
) -> AnalysisResult:
    included = [segment for segment in segments if segment.include_in_analysis and segment.content.strip()]
    if not included:
        raise ValueError("분석할 인터뷰 원문이 없습니다.")

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": _system_prompt(),
            },
            {
                "role": "user",
                "content": _user_prompt(included, project_context),
            },
        ],
        "temperature": 0.2,
        "max_tokens": 6000,
        "response_format": {"type": "json_object"},
    }

    response = requests.post(
        GROQ_CHAT_COMPLETIONS_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=timeout_seconds,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Groq API 오류: {response.status_code} {response.text[:500]}")

    content = response.json()["choices"][0]["message"]["content"]
    parsed = json.loads(_strip_code_fence(content))
    return AnalysisResult.from_dict(_normalize_result(parsed, included))


def run_groq_chunked_qualitative_analysis(
    segments: list[Segment],
    api_key: str,
    model: str,
    timeout_seconds: int = 90,
    project_context: dict[str, Any] | None = None,
) -> AnalysisResult:
    included = [segment for segment in segments if segment.include_in_analysis and segment.content.strip()]
    if not included:
        raise ValueError("분석할 인터뷰 원문이 없습니다.")

    chunks = _chunk_segments(included, chunk_size=10)
    chunk_results: list[dict[str, Any]] = []
    for index, chunk in enumerate(chunks, start=1):
        chunk_results.append(
            _chat_json(
                api_key=api_key,
                model=model,
                system_prompt=_system_prompt(),
                user_prompt=_chunk_prompt(chunk, index, len(chunks)),
                timeout_seconds=timeout_seconds,
                max_tokens=1000,
            )
        )

    synthesis = _chat_json(
        api_key=api_key,
        model=model,
        system_prompt=_system_prompt(),
        user_prompt=_synthesis_prompt(chunk_results, included, project_context),
        timeout_seconds=timeout_seconds,
        max_tokens=2800,
    )
    normalized = _normalize_result(synthesis, included)
    if not normalized["participant_mentions"]:
        normalized["participant_mentions"] = dict(Counter(segment.participant for segment in included))
    return AnalysisResult.from_dict(normalized)


def _chat_json(
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    timeout_seconds: int,
    max_tokens: int,
) -> dict[str, Any]:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }

    for attempt in range(3):
        response = requests.post(
            GROQ_CHAT_COMPLETIONS_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=timeout_seconds,
        )
        if response.status_code == 429 and attempt < 2:
            retry_after = response.headers.get("retry-after")
            wait_seconds = float(retry_after) if retry_after else 55.0
            time.sleep(min(wait_seconds, 65.0))
            continue
        if response.status_code >= 400:
            raise RuntimeError(f"Groq API 오류: {response.status_code} {response.text[:500]}")

        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(_strip_code_fence(content))

    raise RuntimeError("Groq API 호출을 완료하지 못했습니다.")


def _system_prompt() -> str:
    return """
당신은 사용자 리서치, 사용성 테스트, 고객 피드백 데이터를 분석하는 시니어 UX 리서처이자 제품 전략 분석가입니다.
인터뷰 원문, FGI 속기록, UT 관찰 기록, 설문 주관식 응답, VOC, 고객상담 로그 등 비정형 사용자 데이터를 분석해 제품·서비스 의사결정에 활용 가능한 인사이트를 도출하세요.

중요 원칙:
- 인사이트는 사용자가 말한 내용을 다시 표현한 문장이 아닙니다.
- 인사이트는 여러 발화, 행동, 관찰 사이에 숨어 있는 반복 패턴, 긴장, 모순, 원인, 맥락, 기대, 불안, 사용 조건, 실패 구조를 해석한 문장입니다.
- "사용자는 A를 원한다", "A 기능 개선이 필요하다", "사용성이 중요하다", "UI가 복잡하다" 같은 문장은 최종 인사이트로 쓰지 마세요. 이는 관찰/요약일 뿐입니다.
- 좋은 인사이트는 표면 발화, 구체적 사용 맥락, 숨은 기대/불안/판단 기준, 말과 행동의 긴장, 제품 구조와 실제 과업 사이의 간극, 설계 함의를 포함해야 합니다.
- 분석 근거로 진행자 질문, 섹션 제목, 문서 제목, 시스템 메시지, 파일명, 일반론을 사용하지 마세요.
- 관찰은 단순 키워드가 아니라 맥락이 포함된 문장으로 쓰세요.
- 코드는 "편의성", "알림", "신뢰" 같은 단어가 아니라 문제 구조를 드러내야 합니다.
- 인사이트로 승격하려면 반복성, 맥락/행동/감정 연결, 구조적 원인 설명, 설계 영향, 근거 추적 가능성을 확인하세요.
- 확실하지 않은 해석은 confidence를 보통 또는 낮음으로 표시하세요.
- 권장 조치는 "개선해야 한다"로 끝내지 말고 개선 대상, 사용 맥락, 구체적 UI/기능/안내/자동화, 우선순위, 예상 효과, 검증 방법 중 최소 3개 이상을 포함하세요.
- evidence_segment_ids에는 반드시 제공된 segment id만 넣으세요.
- 근거 없는 결론은 만들지 마세요.
- 출력은 JSON만 반환하세요. 마크다운, 설명문, 코드블록은 금지입니다.
""".strip()


def _build_context_block(project_context: dict[str, Any] | None) -> str:
    if not project_context:
        return ""
    parts: list[str] = []
    goal = (project_context.get("research_goal") or "").strip()
    tasks = [t for t in (project_context.get("tasks") or []) if t]
    criteria = [c for c in (project_context.get("evaluation_criteria") or []) if c]
    if goal:
        parts.append(f"리서치 목적: {goal}")
    if tasks:
        parts.append("평가 태스크:\n" + "\n".join(f"- {t}" for t in tasks))
    if criteria:
        parts.append("평가 기준:\n" + "\n".join(f"- {c}" for c in criteria))
    if not parts:
        return ""
    return "\n".join(parts) + "\n\n위 리서치 맥락을 인사이트 도출 시 반드시 반영하세요.\n\n"


def _user_prompt(segments: list[Segment], project_context: dict[str, Any] | None = None) -> str:
    compact_segments = _select_segments_for_prompt(segments)
    context_block = _build_context_block(project_context)
    return f"""
{context_block}아래 인터뷰 원문 일부를 분석해서 JSON으로만 반환하세요.
긴 인터뷰 전체에서 대표성이 높은 발화 샘플입니다. 제공된 원문만 근거로 분석하세요.

반환 JSON 스키마:
{{
  "keywords": [
    {{"keyword": "string", "count": 1}}
  ],
  "topics": [
    {{
      "id": "topic_001",
      "topic_name": "string",
      "keywords": ["string"],
      "summary": "이 주제가 무엇을 의미하는지 1-2문장",
      "segment_ids": ["seg_0001"],
      "participant_count": 1
    }}
  ],
  "insights": [
    {{
      "id": "insight_001",
      "title": "리서처가 바로 이해할 수 있는 한 줄 결론",
      "summary": "이 결론이 왜 나왔는지, 어떤 행동/맥락에서 반복되는지 2-3문장",
      "interpretation": "표면 발화 너머의 구조적 해석",
      "why_it_matters": "이 인사이트가 제품/서비스 의사결정에 중요한 이유",
      "product_implication": "제품 구조, 정보구조, 기능, 정책, 운영에 주는 함의",
      "recommendation": "제품/UX 관점에서 바로 검토할 제안 1-2문장",
      "topic_ids": ["topic_001"],
      "evidence_segment_ids": ["seg_0001"],
      "participants": ["P1"],
      "confidence": "높음|보통|낮음",
      "status": "초안"
    }}
  ],
  "participant_mentions": {{"P1": 3}}
}}

작성 기준:
- insights는 3-6개로 제한하세요.
- title은 관찰 요약이 아니라 구조적 결론이어야 합니다.
- summary에는 표면 발화와 구체적 맥락을 함께 쓰세요.
- interpretation에는 사용자가 직접 말하지 않은 기대, 불안, 판단 기준, 긴장 구조를 설명하세요.
- why_it_matters에는 이 문제가 의사결정에 왜 중요한지 쓰세요.
- product_implication에는 제품/서비스 구조에 주는 함의를 쓰세요.
- recommendation은 기능명 나열이 아니라 개선 대상, 사용 맥락, 구체적 조치, 예상 효과 또는 검증 방법을 포함하세요.
- topics는 insights보다 더 넓은 주제 묶음입니다.
- keywords는 명사/구 중심으로 10-20개 뽑으세요.
- evidence_segment_ids에는 아래 원문에 포함된 id만 넣으세요.

인터뷰 원문:
{json.dumps(compact_segments, ensure_ascii=False)}
""".strip()


def _select_segments_for_prompt(segments: list[Segment]) -> list[dict[str, Any]]:
    max_segments = 45
    max_chars_per_segment = 420
    selected: list[Segment] = []
    seen_participants: set[str] = set()

    for segment in segments:
        if segment.participant not in seen_participants:
            selected.append(segment)
            seen_participants.add(segment.participant)
        if len(selected) >= max_segments:
            break

    for segment in segments:
        if segment not in selected:
            selected.append(segment)
        if len(selected) >= max_segments:
            break

    return [
        {
            "id": segment.id,
            "participant": segment.participant,
            "question_or_topic": segment.question_or_topic,
            "content": segment.content[:max_chars_per_segment],
        }
        for segment in selected
    ]


def _chunk_segments(segments: list[Segment], chunk_size: int) -> list[list[Segment]]:
    return [segments[index : index + chunk_size] for index in range(0, len(segments), chunk_size)]


def _compact_segment(segment: Segment, max_chars: int = 260) -> dict[str, Any]:
    return {
        "id": segment.id,
        "participant": segment.participant,
        "question_or_topic": segment.question_or_topic,
        "content": segment.content[:max_chars],
    }


def _chunk_prompt(chunk: list[Segment], chunk_index: int, total_chunks: int) -> str:
    compact_segments = [_compact_segment(segment) for segment in chunk]
    return f"""
긴 인터뷰를 여러 묶음으로 나눠 분석 중입니다.
현재 묶음: {chunk_index}/{total_chunks}

이 묶음에서만 관찰되는 UX 신호를 추출하세요.
전체 결론을 과장하지 말고, 다음 최종 통합 단계에서 쓸 수 있는 재료를 만들어주세요.

반환 JSON:
{{
  "chunk_index": {chunk_index},
  "keywords": [{{"keyword": "string", "count": 1}}],
  "observations": [
    {{
      "title": "관찰명",
      "summary": "무엇이 반복되거나 의미 있는지",
      "evidence_segment_ids": ["seg_0001"],
      "participants": ["P1"]
    }}
  ],
  "notable_quotes": [
    {{
      "segment_id": "seg_0001",
      "why_it_matters": "이 발화가 중요한 이유"
    }}
  ]
}}

원문:
{json.dumps(compact_segments, ensure_ascii=False)}
""".strip()


def _synthesis_prompt(chunk_results: list[dict[str, Any]], segments: list[Segment], project_context: dict[str, Any] | None = None) -> str:
    referenced_ids = _collect_referenced_segment_ids(chunk_results)
    if not referenced_ids:
        referenced_ids = [segment.id for segment in segments[:30]]

    evidence_lookup = {
        segment.id: {
            "participant": segment.participant,
            "question_or_topic": segment.question_or_topic,
            "content": segment.content[:220],
        }
        for segment in segments
        if segment.id in referenced_ids
    }
    compact_chunk_results = _compact_chunk_results(chunk_results)
    context_block = _build_context_block(project_context)
    return f"""
{context_block}아래는 긴 인터뷰를 여러 묶음으로 나눠 1차 분석한 결과입니다.
이 결과를 통합해 리서처가 바로 읽을 수 있는 최종 UX 리서치 분석 JSON을 만드세요.

반환 JSON 스키마:
{{
  "keywords": [
    {{"keyword": "string", "count": 1}}
  ],
  "topics": [
    {{
      "id": "topic_001",
      "topic_name": "string",
      "keywords": ["string"],
      "summary": "이 주제가 무엇을 의미하는지 1-2문장",
      "segment_ids": ["seg_0001"],
      "participant_count": 1
    }}
  ],
  "insights": [
    {{
      "id": "insight_001",
      "title": "리서처가 바로 이해할 수 있는 한 줄 결론",
      "summary": "이 결론이 왜 나왔는지, 어떤 행동/맥락에서 반복되는지 2-3문장",
      "interpretation": "표면 발화 너머의 구조적 해석",
      "why_it_matters": "이 인사이트가 제품/서비스 의사결정에 중요한 이유",
      "product_implication": "제품 구조, 정보구조, 기능, 정책, 운영에 주는 함의",
      "recommendation": "제품/UX 관점에서 바로 검토할 제안 1-2문장",
      "topic_ids": ["topic_001"],
      "evidence_segment_ids": ["seg_0001"],
      "participants": ["P1"],
      "confidence": "높음|보통|낮음",
      "status": "초안"
    }}
  ],
  "participant_mentions": {{"P1": 3}}
}}

작성 기준:
- insights는 3-6개.
- 사용자의 진짜 맥락과 행동을 설명하세요.
- title은 관찰 요약이 아니라 구조적 결론이어야 합니다.
- interpretation에는 숨은 기대/불안/판단 기준과 제품 구조 간극을 설명하세요.
- why_it_matters와 product_implication을 반드시 작성하세요.
- recommendation은 개선 대상, 사용 맥락, 구체적 조치, 예상 효과 또는 검증 방법을 포함하세요.
- evidence_segment_ids에는 evidence_lookup에 있는 id만 넣으세요.

1차 분석 결과:
{json.dumps(compact_chunk_results, ensure_ascii=False)}

근거 발화 lookup:
{json.dumps(evidence_lookup, ensure_ascii=False)}
""".strip()


def _collect_referenced_segment_ids(chunk_results: list[dict[str, Any]]) -> list[str]:
    ids: list[str] = []
    for result in chunk_results:
        for observation in result.get("observations", []):
            ids.extend(str(segment_id) for segment_id in observation.get("evidence_segment_ids", []))
        for quote in result.get("notable_quotes", []):
            segment_id = quote.get("segment_id")
            if segment_id:
                ids.append(str(segment_id))
    deduped: list[str] = []
    for segment_id in ids:
        if segment_id not in deduped:
            deduped.append(segment_id)
    return deduped[:45]


def _compact_chunk_results(chunk_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    compact: list[dict[str, Any]] = []
    for result in chunk_results:
        compact.append(
            {
                "chunk_index": result.get("chunk_index"),
                "keywords": result.get("keywords", [])[:8],
                "observations": [
                    {
                        "title": str(observation.get("title", ""))[:80],
                        "summary": str(observation.get("summary", ""))[:220],
                        "evidence_segment_ids": observation.get("evidence_segment_ids", [])[:4],
                        "participants": observation.get("participants", [])[:8],
                    }
                    for observation in result.get("observations", [])[:4]
                ],
                "notable_quotes": [
                    {
                        "segment_id": quote.get("segment_id"),
                        "why_it_matters": str(quote.get("why_it_matters", ""))[:160],
                    }
                    for quote in result.get("notable_quotes", [])[:4]
                ],
            }
        )
    return compact


def _strip_code_fence(content: str) -> str:
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", content, flags=re.DOTALL)
    if match:
        return match.group(1)
    return content.strip()


def _normalize_result(data: dict[str, Any], segments: list[Segment]) -> dict[str, Any]:
    segment_ids = {segment.id for segment in segments}

    topics = []
    for index, raw_topic in enumerate(data.get("topics", []), start=1):
        raw_ids = [str(segment_id) for segment_id in raw_topic.get("segment_ids", [])]
        filtered_ids = [segment_id for segment_id in raw_ids if segment_id in segment_ids]
        topics.append(
            {
                "id": str(raw_topic.get("id") or f"topic_{index:03d}"),
                "topic_name": str(raw_topic.get("topic_name") or "분류되지 않은 주제"),
                "keywords": [str(keyword) for keyword in raw_topic.get("keywords", [])][:8],
                "summary": str(raw_topic.get("summary") or ""),
                "segment_ids": filtered_ids,
                "participant_count": int(raw_topic.get("participant_count") or 0),
            }
        )

    topic_ids = {topic["id"] for topic in topics}
    insights = []
    for index, raw_insight in enumerate(data.get("insights", []), start=1):
        raw_evidence_ids = [str(segment_id) for segment_id in raw_insight.get("evidence_segment_ids", [])]
        filtered_evidence_ids = [segment_id for segment_id in raw_evidence_ids if segment_id in segment_ids]
        raw_topic_ids = [str(topic_id) for topic_id in raw_insight.get("topic_ids", [])]
        filtered_topic_ids = [topic_id for topic_id in raw_topic_ids if topic_id in topic_ids]
        insights.append(
            {
                "id": str(raw_insight.get("id") or f"insight_{index:03d}"),
                "title": str(raw_insight.get("title") or "추가 검토가 필요한 인사이트"),
                "summary": str(raw_insight.get("summary") or ""),
                "recommendation": str(raw_insight.get("recommendation") or "후속 검토가 필요합니다."),
                "interpretation": str(raw_insight.get("interpretation") or ""),
                "why_it_matters": str(raw_insight.get("why_it_matters") or ""),
                "product_implication": str(raw_insight.get("product_implication") or ""),
                "topic_ids": filtered_topic_ids,
                "evidence_segment_ids": filtered_evidence_ids,
                "participants": [str(participant) for participant in raw_insight.get("participants", [])],
                "confidence": str(raw_insight.get("confidence") or "보통"),
                "status": str(raw_insight.get("status") or "초안"),
            }
        )

    return {
        "keywords": data.get("keywords", []),
        "topics": topics,
        "insights": insights,
        "participant_mentions": data.get("participant_mentions", {}),
    }
