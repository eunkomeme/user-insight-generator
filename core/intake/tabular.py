from __future__ import annotations

import io
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import pandas as pd


STANDARD_FIELDS = [
    "participant_id",
    "task",
    "task_success",
    "score",
    "error_count",
    "observation_note",
    "quote",
    "ignore",
]

FIELD_LABELS = {
    "participant_id": "참여자 ID",
    "task": "태스크",
    "task_success": "태스크 성공 여부",
    "score": "점수/척도",
    "error_count": "오류 수",
    "observation_note": "관찰 메모",
    "quote": "발화/인용",
    "ignore": "분석 제외",
}

REQUIRED_FIELDS = {"participant_id", "task"}
EVIDENCE_FIELDS = {"task_success", "score", "error_count", "observation_note", "quote"}


@dataclass
class ColumnMappingSuggestion:
    source_column: str
    suggested_field: str
    label: str
    confidence: str
    sample_values: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class TabularPreview:
    source_name: str
    source_type: str
    row_count: int
    columns: list[ColumnMappingSuggestion]
    sample_rows: list[dict[str, str]]
    standard_fields: list[dict[str, str]]
    required_fields: list[str]
    required_mapped_count: int
    evidence_mapped_count: int
    warnings: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_name": self.source_name,
            "source_type": self.source_type,
            "row_count": self.row_count,
            "columns": [column.to_dict() for column in self.columns],
            "sample_rows": self.sample_rows,
            "standard_fields": self.standard_fields,
            "required_fields": self.required_fields,
            "required_mapped_count": self.required_mapped_count,
            "evidence_mapped_count": self.evidence_mapped_count,
            "warnings": self.warnings,
        }


def preview_tabular_file(filename: str, content: bytes, max_rows: int = 5) -> TabularPreview:
    suffix = Path(filename).suffix.lower()
    warnings: list[str] = []
    frame = _read_tabular_frame(filename, content)

    if frame.empty:
        warnings.append("표 데이터에 읽을 수 있는 행이 없습니다.")

    frame = frame.fillna("")
    sample_frame = frame.head(max_rows)
    columns = [_suggest_column_mapping(str(column), sample_frame[column].tolist()) for column in frame.columns]
    mapped_fields = {column.suggested_field for column in columns if column.suggested_field != "ignore"}
    sample_rows = [
        {str(column): _stringify_value(row.get(column, "")) for column in frame.columns}
        for row in sample_frame.to_dict(orient="records")
    ]

    return TabularPreview(
        source_name=filename,
        source_type="CSV" if suffix == ".csv" else "엑셀",
        row_count=len(frame),
        columns=columns,
        sample_rows=sample_rows,
        standard_fields=[{"value": field, "label": FIELD_LABELS[field]} for field in STANDARD_FIELDS],
        required_fields=sorted(REQUIRED_FIELDS),
        required_mapped_count=len(REQUIRED_FIELDS.intersection(mapped_fields)),
        evidence_mapped_count=len(EVIDENCE_FIELDS.intersection(mapped_fields)),
        warnings=warnings,
    )


def _read_tabular_frame(filename: str, content: bytes) -> pd.DataFrame:
    suffix = Path(filename).suffix.lower()
    if suffix == ".csv":
        try:
            return pd.read_csv(io.BytesIO(content), encoding="utf-8-sig")
        except UnicodeDecodeError:
            return pd.read_csv(io.BytesIO(content), encoding="cp949")
    if suffix == ".xlsx":
        return pd.read_excel(io.BytesIO(content))
    raise ValueError("CSV 또는 XLSX 파일만 미리볼 수 있습니다.")


def _suggest_column_mapping(column_name: str, values: list[Any]) -> ColumnMappingSuggestion:
    normalized = _normalize_name(column_name)
    samples = [_stringify_value(value) for value in values if _stringify_value(value)][:3]
    numeric_ratio = _numeric_ratio(samples)
    boolean_ratio = _boolean_ratio(samples)

    field = "ignore"
    confidence = "낮음"

    if _contains_any(normalized, {"participant", "userid", "user", "uid", "pid", "pno", "참여자", "사용자", "대상자"}):
        field = "participant_id"
        confidence = "높음"
    elif _contains_any(normalized, {"task", "scenario", "mission", "flow", "태스크", "과업", "시나리오"}):
        field = "task"
        confidence = "높음"
    elif _contains_any(normalized, {"success", "complete", "completion", "status", "pass", "성공", "완료", "상태"}):
        field = "task_success"
        confidence = "높음" if boolean_ratio >= 0.5 else "보통"
    elif _contains_any(normalized, {"score", "rating", "sus", "seq", "ces", "nps", "점수", "평점", "척도", "만족도"}):
        field = "score"
        confidence = "높음" if numeric_ratio >= 0.5 else "보통"
    elif _contains_any(normalized, {"error", "fail", "mistake", "오류", "실패", "에러"}):
        field = "error_count"
        confidence = "높음" if numeric_ratio >= 0.5 else "보통"
    elif _contains_any(normalized, {"note", "memo", "observation", "comment", "remark", "메모", "관찰", "비고", "코멘트"}):
        field = "observation_note"
        confidence = "높음"
    elif _contains_any(normalized, {"quote", "utterance", "transcript", "answer", "response", "발화", "인용", "답변", "응답"}):
        field = "quote"
        confidence = "높음"

    return ColumnMappingSuggestion(
        source_column=column_name,
        suggested_field=field,
        label=FIELD_LABELS[field],
        confidence=confidence,
        sample_values=samples,
    )


def _normalize_name(value: str) -> str:
    return value.strip().lower().replace(" ", "").replace("_", "").replace("-", "")


def _contains_any(value: str, candidates: set[str]) -> bool:
    return any(candidate in value for candidate in candidates)


def _stringify_value(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.lower() == "nan":
        return ""
    return text


def _numeric_ratio(values: list[str]) -> float:
    if not values:
        return 0
    count = 0
    for value in values:
        try:
            float(value)
        except ValueError:
            continue
        count += 1
    return count / len(values)


def _boolean_ratio(values: list[str]) -> float:
    if not values:
        return 0
    truthy_falsey = {"1", "0", "true", "false", "y", "n", "yes", "no", "성공", "실패", "완료", "미완료"}
    count = sum(1 for value in values if value.lower() in truthy_falsey)
    return count / len(values)
