from __future__ import annotations

import json
import re
import time
from collections import Counter
from typing import Any, Literal

import requests

from core.config import (
    get_analysis_chunk_max_tokens,
    get_analysis_chunk_segment_chars,
    get_analysis_chunk_size,
    get_analysis_prompt_max_segments,
    get_analysis_prompt_segment_chars,
    get_analysis_synthesis_max_tokens,
)
from core.intake import Segment

from .qualitative import AnalysisResult


GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"


ProviderName = Literal["Groq", "OpenRouter"]


class ProviderRateLimitError(RuntimeError):
    pass


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
    fallback_api_key: str = "",
    fallback_model: str = "",
    memory_context: str = "",
    source_type: str = "텍스트",
    quantitative_summary: dict[str, Any] | None = None,
) -> AnalysisResult:
    included = [segment for segment in segments if segment.include_in_analysis and segment.content.strip()]
    if not included:
        raise ValueError("분석할 원자료가 없습니다.")

    try:
        return _run_chunked_with_provider(
            included=included,
            api_key=api_key,
            model=model,
            endpoint=GROQ_CHAT_COMPLETIONS_URL,
            provider_name="Groq",
            timeout_seconds=timeout_seconds,
            project_context=project_context,
            memory_context=memory_context,
            source_type=source_type,
            quantitative_summary=quantitative_summary,
            max_retries=0,
        )
    except ProviderRateLimitError:
        if not fallback_api_key:
            raise
        return _run_chunked_with_provider(
            included=included,
            api_key=fallback_api_key,
            model=fallback_model or "google/gemini-2.5-flash",
            endpoint=OPENROUTER_CHAT_COMPLETIONS_URL,
            provider_name="OpenRouter",
            timeout_seconds=timeout_seconds,
            project_context=project_context,
            memory_context=memory_context,
            source_type=source_type,
            quantitative_summary=quantitative_summary,
            max_retries=1,
        )


def _run_chunked_with_provider(
    included: list[Segment],
    api_key: str,
    model: str,
    endpoint: str,
    provider_name: ProviderName,
    timeout_seconds: int,
    project_context: dict[str, Any] | None,
    memory_context: str = "",
    source_type: str = "텍스트",
    quantitative_summary: dict[str, Any] | None = None,
    max_retries: int = 0,
) -> AnalysisResult:
    chunks = _chunk_segments(included, chunk_size=get_analysis_chunk_size())
    chunk_results: list[dict[str, Any]] = []
    for index, chunk in enumerate(chunks, start=1):
        chunk_kwargs = dict(
            api_key=api_key,
            model=model,
            endpoint=endpoint,
            provider_name=provider_name,
            system_prompt=_system_prompt(),
            user_prompt=_chunk_prompt(chunk, index, len(chunks), source_type),
            timeout_seconds=timeout_seconds,
            max_tokens=get_analysis_chunk_max_tokens(),
            max_retries=max_retries,
        )
        try:
            chunk_result = _chat_json(**chunk_kwargs)
        except RuntimeError:
            chunk_result = _chat_json(**chunk_kwargs)
        chunk_results.append(chunk_result)

    synthesis_kwargs = dict(
        api_key=api_key,
        model=model,
        endpoint=endpoint,
        provider_name=provider_name,
        system_prompt=_system_prompt(),
        user_prompt=_synthesis_prompt(chunk_results, included, project_context, memory_context, source_type, quantitative_summary),
        timeout_seconds=timeout_seconds,
        max_tokens=get_analysis_synthesis_max_tokens(),
        max_retries=max_retries,
    )
    try:
        synthesis = _chat_json(**synthesis_kwargs)
    except RuntimeError:
        synthesis = _chat_json(**synthesis_kwargs)
    normalized = _normalize_result(synthesis, included)
    if not normalized["participant_mentions"]:
        normalized["participant_mentions"] = dict(Counter(segment.participant for segment in included))
    return AnalysisResult.from_dict(normalized)


def _chat_json(
    api_key: str,
    model: str,
    endpoint: str,
    provider_name: ProviderName,
    system_prompt: str,
    user_prompt: str,
    timeout_seconds: int,
    max_tokens: int,
    max_retries: int = 0,
) -> dict[str, Any]:
    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }
    payload.update(_provider_model_payload(model, provider_name))
    headers = _provider_headers(api_key, provider_name)

    for attempt in range(max_retries + 1):
        response = requests.post(endpoint, headers=headers, json=payload, timeout=timeout_seconds)
        if response.status_code == 429:
            if attempt < max_retries:
                retry_after = response.headers.get("retry-after")
                wait = min(float(retry_after) if retry_after else 15.0, 30.0)
                time.sleep(wait)
                continue
            raise ProviderRateLimitError(f"{provider_name} API 한도 초과: {response.text[:500]}")
        if response.status_code >= 400:
            raise RuntimeError(f"{provider_name} API 오류: {response.status_code} {response.text[:500]}")
        body = response.json()
        choices = body.get("choices") or [{}]
        content = choices[0].get("message", {}).get("content")
        if not isinstance(content, str):
            raise RuntimeError(
                f"{provider_name}가 텍스트 응답 대신 null 또는 다른 형식을 반환했습니다 "
                f"(content 타입: {type(content).__name__}). "
                "응답 구조: " + str(body)[:300]
            )
        return _parse_json_response(content, provider_name)

    raise ProviderRateLimitError(f"{provider_name} API 한도 초과: 재시도 횟수를 초과했습니다.")


def _provider_headers(api_key: str, provider_name: ProviderName) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if provider_name == "OpenRouter":
        headers["HTTP-Referer"] = "http://localhost:3000"
        headers["X-Title"] = "UX Research Insight Engine"
    return headers


def _provider_model_payload(model: str, provider_name: ProviderName) -> dict[str, Any]:
    models = [item.strip() for item in model.split(",") if item.strip()]
    if provider_name == "OpenRouter" and len(models) > 1:
        return {"models": models}
    return {"model": models[0] if models else model}


def _system_prompt() -> str:
    return """
You are an expert at synthesizing user research — turning raw qualitative and quantitative data into structured insights that drive product decisions. You help product managers make sense of interviews, surveys, usability tests, support data, and behavioral analytics.

## Research Synthesis Methodology

### Thematic Analysis
1. Familiarization: Read through all the data before coding anything.
2. Initial coding: Tag each observation, quote, or data point with descriptive codes. Be generous with codes.
3. Theme development: Group related codes into candidate themes that capture something important about the data.
4. Theme review: Check themes against the data. Are themes distinct? Do they tell a coherent story?
5. Theme refinement: Define and name each theme clearly with a 1-2 sentence description.
6. Report: Write up themes as findings with supporting evidence.

### Affinity Mapping
1. Capture each distinct observation or quote as a separate note.
2. Cluster related notes based on similarity — let categories emerge from the data.
3. Label clusters with a descriptive name capturing the common thread.
4. Identify themes from clusters and their relationships.

Tips: One observation per note. Move notes freely. Split overly large clusters. Outliers are interesting — do not force them into a cluster.

### Triangulation
Strengthen findings by combining multiple data sources:
- Methodological: same question, different methods (interviews + survey + analytics)
- Source: same method, different participants or segments
- Temporal: same observation at different points in time

A finding supported by multiple sources is much stronger. When sources disagree, investigate — it may reveal different user segments.

## Interview Note Analysis

### Extracting Insights
For each interview identify:
- **Observations**: What did the participant describe doing, experiencing, or feeling? Note context (when, where, how often). Flag workarounds — these are unmet needs in disguise.
- **Direct quotes**: Verbatim statements that illustrate a point. Attribute to participant type, not name. A quote is evidence, not a finding.
- **Behaviors vs stated preferences**: What people DO often differs from what they SAY they want. Behavioral observations are stronger evidence.
- **Signals of intensity**: Emotional language, frequency of encounter, effort of workaround, consequence when things go wrong.

### Cross-Interview Analysis
- Look for patterns across multiple participants.
- Note frequency: how many participants mentioned each theme?
- Identify segments: do different user types have different patterns?
- Surface contradictions: where do participants disagree?
- Find surprises: what challenged prior assumptions?

## Survey Data Interpretation

### Quantitative Analysis
- Look at distribution shape, not just averages. A bimodal distribution tells a different story than a normal one.
- Break down responses by user segment — aggregates can mask important differences.
- For small samples, be cautious about drawing conclusions from small differences.

### Open-Ended Response Analysis
- Treat responses like mini interview notes.
- Count frequency of themes across responses.
- Look for themes that appear in open-ended responses but not in structured questions — these are things you did not think to ask about.

### Common Mistakes
- Reporting averages without distributions.
- Over-interpreting small differences.
- Confusing correlation with causation.

## Combining Qualitative and Quantitative

- **Qualitative first**: Reveals WHAT is happening and WHY. Generates hypotheses.
- **Quantitative validation**: Reveals HOW MUCH and HOW MANY. Tests hypotheses at scale.
- Use quantitative data to prioritize qualitative findings.
- Present combined evidence: "47% of surveyed users report difficulty with X (survey), and interviews reveal this is because Y (qualitative finding)."
- When sources disagree, report honestly and investigate rather than choosing one source.

## Output Rules

- Insights are NOT restatements of what users said. Insights are interpretations of repeating patterns, tensions, contradictions, causes, and structural failures hidden across multiple observations.
- Do NOT produce insights like "users want A", "feature A needs improvement", or "UI is complex" — these are observations, not insights.
- Good insights include: surface utterance + specific usage context + hidden expectation/anxiety + tension between words and behavior + gap between product structure and actual task + design implication.
- Do NOT use facilitator questions, section headings, document titles, system messages, filenames, or general statements as evidence.
- Observations must be written as context-rich sentences, not keywords.
- Codes must reveal problem structure, not label categories like "convenience" or "trust".
- Before elevating to an insight, confirm: repeatability, context/behavior/emotion connection, structural cause explanation, design impact, evidence traceability.
- Uncertain interpretations must set confidence to "보통" or "낮음".
- Recommendations must include at minimum 3 of: target of improvement, usage context, specific UI/feature/guidance/automation, priority, expected effect, validation method. Never end with "needs improvement".
- supporting_quotes.source_id must only use segment ids provided in the input.
- status must be "draft".
- Never fabricate conclusions without evidence.
- Return JSON only. No markdown, no explanation, no code fences.

Always respond in Korean (한국어로 답변하세요).
""".strip()


def _build_quantitative_block(quantitative_summary: dict[str, Any] | None) -> str:
    if not quantitative_summary:
        return ""
    total = quantitative_summary.get("total_rows", 0)
    columns = quantitative_summary.get("columns", {})
    if not columns:
        return ""
    lines = [f"=== 정량 데이터 요약 ({total}개 행) ==="]
    for col_name, stats in columns.items():
        col_type = stats.get("type", "numeric")
        if col_type == "binary":
            lines.append(f"[{col_name}] 성공/실패: 성공률 {stats.get('success_rate', '?')} (n={stats.get('count', '?')})")
        elif col_type == "scale":
            lines.append(f"[{col_name}] 척도 점수: 평균 {stats.get('mean', '?')} / 최저 {stats.get('min', '?')} / 최고 {stats.get('max', '?')} (n={stats.get('count', '?')})")
        else:
            lines.append(f"[{col_name}]: 평균 {stats.get('mean', '?')} / 최저 {stats.get('min', '?')} / 최고 {stats.get('max', '?')} (n={stats.get('count', '?')})")
    lines.append("위 수치를 인사이트 도출 시 반영하세요. 낮은 성공률·낮은 만족도 항목에서 원인 분석을 강화하세요.\n")
    return "\n".join(lines) + "\n"


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
  "insights": [
    {{
      "id": "insight_001",
      "type": "pain_point|usability_issue|positive_signal|task_friction",
      "title": "리서처가 바로 이해할 수 있는 한 줄 결론",
      "summary": "이 결론이 왜 나왔는지, 어떤 행동/맥락에서 반복되는지 2-3문장",
      "severity": "높음|보통|낮음",
      "frequency": "높음|보통|낮음",
      "confidence": "높음|보통|낮음",
      "related_tasks": ["태스크명 또는 질문/주제"],
      "related_participants": ["P1"],
      "supporting_quotes": [
        {{
          "quote": "근거 발화 원문 일부",
          "participant": "P1",
          "source_id": "seg_0001"
        }}
      ],
      "recommendation": "제품/UX 관점에서 바로 검토할 제안 1-2문장",
      "status": "draft"
    }}
  ],
  "participant_mentions": {{"P1": 3}}
}}

작성 기준:
- insights는 3-6개로 제한하세요.
- type은 pain_point, usability_issue, positive_signal, task_friction 중 하나만 사용하세요.
- title은 관찰 요약이 아니라 구조적 결론이어야 합니다.
- summary에는 표면 발화와 구체적 맥락을 함께 쓰세요.
- severity는 제품/과업 영향도 기준으로, frequency는 참여자 반복 빈도 기준으로 판단하세요.
- supporting_quotes는 1-3개로 제한하고 quote, participant, source_id를 모두 채우세요.
- recommendation은 기능명 나열이 아니라 개선 대상, 사용 맥락, 구체적 조치, 예상 효과 또는 검증 방법을 포함하세요.
- supporting_quotes.source_id에는 아래 원문에 포함된 id만 넣으세요.
- status는 항상 draft로 반환하세요.

인터뷰 원문:
{json.dumps(compact_segments, ensure_ascii=False)}
""".strip()


def _select_segments_for_prompt(segments: list[Segment]) -> list[dict[str, Any]]:
    max_segments = get_analysis_prompt_max_segments()
    max_chars_per_segment = get_analysis_prompt_segment_chars()
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


def _compact_segment(segment: Segment, max_chars: int | None = None) -> dict[str, Any]:
    max_chars = max_chars or get_analysis_chunk_segment_chars()
    return {
        "id": segment.id,
        "participant": segment.participant,
        "question_or_topic": segment.question_or_topic,
        "content": segment.content[:max_chars],
    }


def _source_label(source_type: str) -> str:
    if source_type in {"CSV", "엑셀"}:
        return "설문/정량 데이터"
    if source_type == "마크다운":
        return "리서치 메모"
    return "인터뷰 원문"


def _chunk_prompt(chunk: list[Segment], chunk_index: int, total_chunks: int, source_type: str = "텍스트") -> str:
    compact_segments = [_compact_segment(segment) for segment in chunk]
    label = _source_label(source_type)
    return f"""
{label}를 여러 묶음으로 나눠 분석 중입니다.
현재 묶음: {chunk_index}/{total_chunks}

이 묶음에서만 관찰되는 UX 신호를 추출하세요.
전체 결론을 과장하지 말고, 다음 최종 통합 단계에서 쓸 수 있는 재료를 만들어주세요.

반환 JSON:
{{
  "chunk_index": {chunk_index},
  "observations": [
    {{
      "title": "관찰명",
      "summary": "무엇이 반복되거나 의미 있는지",
      "source_ids": ["seg_0001"],
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


def _synthesis_prompt(chunk_results: list[dict[str, Any]], segments: list[Segment], project_context: dict[str, Any] | None = None, memory_context: str = "", source_type: str = "텍스트", quantitative_summary: dict[str, Any] | None = None) -> str:
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
    memory_block = (memory_context.strip() + "\n\n") if memory_context.strip() else ""
    quantitative_block = _build_quantitative_block(quantitative_summary)
    label = _source_label(source_type)
    return f"""
{memory_block}{context_block}{quantitative_block}아래는 {label}를 여러 묶음으로 나눠 1차 분석한 결과입니다.
이 결과를 통합해 리서처가 바로 읽을 수 있는 최종 UX 리서치 분석 JSON을 만드세요.

반환 JSON 스키마:
{{
  "insights": [
    {{
      "id": "insight_001",
      "type": "pain_point|usability_issue|positive_signal|task_friction",
      "title": "리서처가 바로 이해할 수 있는 한 줄 결론",
      "summary": "이 결론이 왜 나왔는지, 어떤 행동/맥락에서 반복되는지 2-3문장",
      "severity": "높음|보통|낮음",
      "frequency": "높음|보통|낮음",
      "confidence": "높음|보통|낮음",
      "related_tasks": ["태스크명 또는 질문/주제"],
      "related_participants": ["P1"],
      "supporting_quotes": [
        {{
          "quote": "근거 발화 원문 일부",
          "participant": "P1",
          "source_id": "seg_0001"
        }}
      ],
      "recommendation": "제품/UX 관점에서 바로 검토할 제안 1-2문장",
      "status": "draft"
    }}
  ],
  "relationships": [
    {{
      "from_id": "insight_001",
      "to_id": "insight_002",
      "label": "공통 원인|심화 관계|상충|선행 조건 중 하나"
    }}
  ],
  "participant_mentions": {{"P1": 3}}
}}

작성 기준:
- insights는 3-6개.
- type은 pain_point, usability_issue, positive_signal, task_friction 중 하나만 사용하세요.
- 사용자의 진짜 맥락과 행동을 설명하세요.
- title은 관찰 요약이 아니라 구조적 결론이어야 합니다.
- severity는 제품/과업 영향도 기준으로, frequency는 참여자 반복 빈도 기준으로 판단하세요.
- supporting_quotes는 1-3개로 제한하고 quote, participant, source_id를 모두 채우세요.
- recommendation은 개선 대상, 사용 맥락, 구체적 조치, 예상 효과 또는 검증 방법을 포함하세요.
- supporting_quotes.source_id에는 evidence_lookup에 있는 id만 넣으세요.
- status는 항상 draft로 반환하세요.
- relationships는 인사이트 간 의미 있는 연결만 포함하세요. 없으면 빈 배열로 반환하세요.

1차 분석 결과:
{json.dumps(compact_chunk_results, ensure_ascii=False)}

근거 발화 lookup:
{json.dumps(evidence_lookup, ensure_ascii=False)}
""".strip()


def _collect_referenced_segment_ids(chunk_results: list[dict[str, Any]]) -> list[str]:
    ids: list[str] = []
    for result in chunk_results:
        for observation in result.get("observations", []):
            ids.extend(str(segment_id) for segment_id in observation.get("source_ids", []))
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
                "observations": [
                    {
                        "title": str(observation.get("title", ""))[:80],
                        "summary": str(observation.get("summary", ""))[:220],
                        "source_ids": (observation.get("source_ids") or observation.get("evidence_segment_ids") or [])[:4],
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


def _parse_json_response(content: str, provider_name: str) -> dict[str, Any]:
    cleaned = _extract_json_object(_strip_code_fence(content))
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        repaired = _escape_raw_newlines_inside_strings(cleaned)
        if repaired != cleaned:
            try:
                return json.loads(repaired)
            except json.JSONDecodeError:
                pass
        raise RuntimeError(
            f"{provider_name}가 분석 결과를 JSON 형식으로 완성하지 못했습니다. "
            f"(응답 앞부분: {cleaned[:120]!r})"
        ) from exc


def _extract_json_object(content: str) -> str:
    stripped = content.strip()
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start >= 0 and end > start:
        return stripped[start : end + 1]
    return stripped


def _escape_raw_newlines_inside_strings(content: str) -> str:
    result: list[str] = []
    in_string = False
    escaped = False
    for char in content:
        if escaped:
            result.append(char)
            escaped = False
            continue
        if char == "\\":
            result.append(char)
            escaped = True
            continue
        if char == '"':
            in_string = not in_string
            result.append(char)
            continue
        if in_string and char in {"\n", "\r"}:
            result.append("\\n")
            continue
        result.append(char)
    return "".join(result)


def _normalize_result(data: dict[str, Any], segments: list[Segment]) -> dict[str, Any]:
    segment_by_id = {segment.id: segment for segment in segments}
    allowed_types = {"pain_point", "usability_issue", "positive_signal", "task_friction"}
    allowed_levels = {"높음", "보통", "낮음"}
    allowed_statuses = {"draft"}

    insights = []
    for index, raw_insight in enumerate(data.get("insights", []), start=1):
        raw_quotes = raw_insight.get("supporting_quotes") or []
        if not raw_quotes and raw_insight.get("evidence_segment_ids"):
            raw_quotes = [{"source_id": segment_id} for segment_id in raw_insight.get("evidence_segment_ids", [])]

        supporting_quotes = []
        for raw_quote in raw_quotes:
            source_id = str(raw_quote.get("source_id") or raw_quote.get("segment_id") or "")
            source_segment = segment_by_id.get(source_id)
            if not source_segment:
                continue
            quote_text = str(raw_quote.get("quote") or source_segment.content[:220])
            participant = str(raw_quote.get("participant") or source_segment.participant)
            supporting_quotes.append(
                {
                    "quote": quote_text[:500],
                    "participant": participant,
                    "source_id": source_id,
                }
            )
            if len(supporting_quotes) >= 3:
                break

        related_participants = [
            str(participant)
            for participant in raw_insight.get("related_participants", raw_insight.get("participants", []))
            if str(participant).strip()
        ]
        if not related_participants:
            related_participants = sorted({quote["participant"] for quote in supporting_quotes if quote["participant"]})

        related_tasks = [
            str(task)
            for task in raw_insight.get("related_tasks", [])
            if str(task).strip()
        ]
        if not related_tasks:
            related_tasks = sorted(
                {
                    segment_by_id[quote["source_id"]].question_or_topic
                    for quote in supporting_quotes
                    if quote["source_id"] in segment_by_id and segment_by_id[quote["source_id"]].question_or_topic != "질문 미확인"
                }
            )

        insight_type = str(raw_insight.get("type") or "usability_issue")
        severity = str(raw_insight.get("severity") or "보통")
        frequency = str(raw_insight.get("frequency") or "보통")
        confidence = str(raw_insight.get("confidence") or "보통")
        status = str(raw_insight.get("status") or "draft")
        insights.append(
            {
                "id": str(raw_insight.get("id") or f"insight_{index:03d}"),
                "type": insight_type if insight_type in allowed_types else "usability_issue",
                "title": str(raw_insight.get("title") or "추가 검토가 필요한 인사이트"),
                "summary": str(raw_insight.get("summary") or ""),
                "severity": severity if severity in allowed_levels else "보통",
                "frequency": frequency if frequency in allowed_levels else "보통",
                "confidence": confidence if confidence in allowed_levels else "보통",
                "related_tasks": related_tasks,
                "related_participants": related_participants,
                "supporting_quotes": supporting_quotes,
                "recommendation": str(raw_insight.get("recommendation") or "후속 검토가 필요합니다."),
                "status": status if status in allowed_statuses else "draft",
            }
        )

    relationships = [
        {
            "from_id": str(r.get("from_id", "")),
            "to_id": str(r.get("to_id", "")),
            "label": str(r.get("label", "")),
        }
        for r in data.get("relationships", [])
        if r.get("from_id") and r.get("to_id")
    ]

    return {
        "insights": insights,
        "participant_mentions": data.get("participant_mentions", {}),
        "relationships": relationships,
    }
