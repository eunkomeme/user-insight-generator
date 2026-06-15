from __future__ import annotations

import json
from typing import Any

import requests

from core.config import get_analysis_chunk_size
from core.intake import Segment

from .groq import (
    _chunk_prompt,
    _chunk_segments,
    _normalize_result,
    _parse_json_response,
    _source_label,
    _synthesis_prompt,
    _system_prompt,
)
from .qualitative import AnalysisResult


def run_gauss_analysis(
    segments: list[Segment],
    endpoint: str,
    client_key: str,
    token: str,
    timeout_seconds: int = 120,
    project_context: dict[str, Any] | None = None,
    memory_context: str = "",
    source_type: str = "텍스트",
    quantitative_summary: dict[str, Any] | None = None,
) -> AnalysisResult:
    included = [s for s in segments if s.include_in_analysis and s.content.strip()]
    if not included:
        raise ValueError("분석할 내용이 없습니다.")

    model_id = _get_model_id(endpoint, client_key, token, timeout_seconds)
    headers = {
        "x-generative-ai-client": client_key,
        "x-openapi-token": token,
    }

    chunks = _chunk_segments(included, get_analysis_chunk_size())
    chunk_results: list[dict[str, Any]] = []
    for i, chunk in enumerate(chunks):
        chunk_results.append(
            _call_gauss(endpoint, headers, model_id, _chunk_prompt(chunk, i, len(chunks), source_type), timeout_seconds)
        )

    synthesis = _synthesis_prompt(
        chunk_results, included,
        project_context=project_context,
        memory_context=memory_context,
        source_type=source_type,
        quantitative_summary=quantitative_summary,
    )
    final = _call_gauss(endpoint, headers, model_id, synthesis, timeout_seconds)
    return AnalysisResult.from_dict(_normalize_result(final, included))


def _get_model_id(endpoint: str, client_key: str, token: str, timeout: int) -> str:
    response = requests.get(
        f"{endpoint}/openapi/chat/v1/models",
        headers={
            "x-generative-ai-client": client_key,
            "x-openapi-token": token,
        },
        timeout=timeout,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Gauss 모델 조회 실패: {response.status_code} {response.text[:200]}")
    models = response.json()
    if not models:
        raise RuntimeError("Gauss에서 사용 가능한 모델을 찾을 수 없습니다.")
    return str(models[0]["modelId"])


def _call_gauss(
    endpoint: str,
    headers: dict[str, str],
    model_id: str,
    user_content: str,
    timeout: int,
) -> dict[str, Any]:
    response = requests.post(
        f"{endpoint}/openapi/chat/v1/messages",
        headers=headers,
        json={
            "modelIds": [model_id],
            "systemPrompt": _system_prompt(),
            "contents": [user_content],
            "isStream": False,
        },
        timeout=timeout,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Gauss API 오류: {response.status_code} {response.text[:300]}")

    result = response.json()
    if result.get("status") != "SUCCESS":
        raise RuntimeError(f"Gauss 응답 오류: {json.dumps(result, ensure_ascii=False)[:300]}")

    return _parse_json_response(result["content"], "Gauss")
