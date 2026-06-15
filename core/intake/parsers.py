from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

from .models import Segment, utc_now


UNKNOWN_PARTICIPANT = "참여자 미확인"
UNKNOWN_TOPIC = "질문 미확인"


@dataclass
class ParsedUpload:
    segments: list[Segment]
    warnings: list[str]
    quantitative_summary: dict[str, Any] | None = field(default=None)


def parse_uploaded_research_file(filename: str, content: bytes) -> ParsedUpload:
    suffix = Path(filename).suffix.lower()
    if suffix in {".txt", ".md", ".markdown"}:
        text = content.decode("utf-8-sig", errors="replace")
        return ParsedUpload(_parse_text_segments(filename, suffix, text), [])
    if suffix == ".csv":
        return _parse_csv_segments(filename, content)
    if suffix == ".xlsx":
        return _parse_xlsx_segments(filename, content)
    # 확장자가 없거나 미지원인 경우 텍스트로 시도
    try:
        text = content.decode("utf-8-sig", errors="replace")
        return ParsedUpload(_parse_text_segments(filename, ".txt", text), [])
    except Exception:
        return ParsedUpload([], [".md, .txt, .csv, .xlsx 파일만 지원합니다."])


def _parse_text_segments(filename: str, suffix: str, text: str) -> list[Segment]:
    lines = text.splitlines()
    segments: list[Segment] = []
    participant = UNKNOWN_PARTICIPANT
    topic = UNKNOWN_TOPIC
    buffer: list[str] = []
    start_line = 1

    def flush(end_line: int) -> None:
        nonlocal buffer, start_line
        content = "\n".join(line.strip() for line in buffer).strip()
        if not content:
            buffer = []
            start_line = end_line + 1
            return
        segments.append(
            Segment(
                id=f"seg_{len(segments) + 1:04d}",
                participant=participant,
                question_or_topic=topic,
                content=content,
                source_file=filename,
                source_type="마크다운" if suffix in {".md", ".markdown"} else "텍스트",
                source_location=f"{start_line}-{end_line}",
                include_in_analysis=participant != "진행자",
                created_at=utc_now(),
            )
        )
        buffer = []
        start_line = end_line + 1

    for index, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line:
            continue

        normalized_line = _strip_markdown_emphasis(line)
        heading_match = re.match(r"^#{1,6}\s+(.+)$", line)
        topic_label_match = re.match(r"^(?:주제|Topic)\s*[:.]?\s*(.+)$", normalized_line, re.IGNORECASE)
        question_match = re.match(r"^(?:Q\d*\.?|질문\s*\d*[:.]?)\s*(.+)$", normalized_line, re.IGNORECASE)
        participant_match = re.match(
            r"^(?P<participant>Moderator|모더레이터|진행자|P\d+|참여자\s*\d+|인터뷰이\s*\d*|사용자\s*\d*)\s*[:).\-]?\s*(?P<rest>.*)$",
            normalized_line,
            re.IGNORECASE,
        )
        answer_match = re.match(r"^(?:A\d*\.?|답변\s*\d*[:.]?)\s*(.+)$", normalized_line, re.IGNORECASE)

        if heading_match:
            flush(index - 1)
            heading = heading_match.group(1).strip()
            topic = _clean_heading_topic(heading) or UNKNOWN_TOPIC
            start_line = index + 1
            continue

        if topic_label_match:
            flush(index - 1)
            topic = topic_label_match.group(1).strip() or UNKNOWN_TOPIC
            start_line = index + 1
            continue

        if question_match:
            flush(index - 1)
            topic = question_match.group(1).strip() or UNKNOWN_TOPIC
            start_line = index + 1
            continue

        if participant_match:
            flush(index - 1)
            participant = _normalize_participant(participant_match.group("participant").strip())
            rest = participant_match.group("rest").strip()
            start_line = index
            if rest:
                buffer.append(rest)
            continue

        if answer_match:
            buffer.append(answer_match.group(1).strip())
            continue

        if not buffer:
            start_line = index
        buffer.append(normalized_line)

    flush(len(lines))

    if segments:
        return segments

    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    return [
        Segment(
            id=f"seg_{index:04d}",
            participant=UNKNOWN_PARTICIPANT,
            question_or_topic=UNKNOWN_TOPIC,
            content=paragraph,
                source_file=filename,
                source_type="마크다운" if suffix in {".md", ".markdown"} else "텍스트",
                source_location=f"paragraph {index}",
                include_in_analysis=True,
                created_at=utc_now(),
            )
        for index, paragraph in enumerate(paragraphs, start=1)
    ]


def _strip_markdown_emphasis(line: str) -> str:
    line = re.sub(r"^\s*[-*]\s+", "", line)
    line = re.sub(r"^\*\*(.+?)\*\*$", r"\1", line)
    line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
    return line.strip()


def _clean_heading_topic(heading: str) -> str:
    cleaned = re.sub(r"^\d+\.\s*", "", heading).strip()
    if cleaned in {"FGI 속기록", "참석자 정보"}:
        return UNKNOWN_TOPIC
    return cleaned


def _normalize_participant(participant: str) -> str:
    if participant.lower() == "moderator" or participant in {"모더레이터", "진행자"}:
        return "진행자"
    return participant


def _parse_xlsx_segments(filename: str, content: bytes) -> ParsedUpload:
    try:
        frame = pd.read_excel(io.BytesIO(content))
    except ImportError:
        return ParsedUpload([], ["엑셀 파일을 읽으려면 openpyxl 설치가 필요합니다. requirements.txt 설치 후 다시 실행하세요."])
    except Exception as exc:
        return ParsedUpload([], [f"엑셀 파일을 읽는 중 오류가 발생했습니다: {exc}"])

    if frame.empty:
        return ParsedUpload([], ["엑셀 파일에 읽을 수 있는 행이 없습니다."])

    return _parse_table_segments(filename, frame, "엑셀")


def _parse_csv_segments(filename: str, content: bytes) -> ParsedUpload:
    try:
        try:
            frame = pd.read_csv(io.BytesIO(content), encoding="utf-8-sig")
        except UnicodeDecodeError:
            frame = pd.read_csv(io.BytesIO(content), encoding="cp949")
    except Exception as exc:
        return ParsedUpload([], [f"CSV 파일을 읽는 중 오류가 발생했습니다: {exc}"])

    return _parse_table_segments(filename, frame, "CSV")


def _parse_table_segments(filename: str, frame: pd.DataFrame, source_type: str) -> ParsedUpload:
    if frame.empty:
        return ParsedUpload([], [f"{source_type} 파일에 읽을 수 있는 행이 없습니다."])

    column_map = _detect_columns(list(frame.columns))
    segments: list[Segment] = []
    for row_index, row in frame.fillna("").iterrows():
        if not _row_has_value(row):
            continue
        content_value = _table_row_to_markdown(row, column_map, row_index + 2)
        participant = _cell_value(row, column_map.get("participant", ""))
        topic = _cell_value(row, column_map.get("topic", ""))
        segments.append(
            Segment(
                id=f"seg_{len(segments) + 1:04d}",
                participant=participant or UNKNOWN_PARTICIPANT,
                question_or_topic=topic or UNKNOWN_TOPIC,
                content=content_value.strip(),
                source_file=filename,
                source_type=source_type,
                source_location=f"row {row_index + 2}",
                include_in_analysis=participant != "진행자",
                created_at=utc_now(),
            )
        )

    warnings = []
    if not column_map.get("participant"):
        warnings.append("참여자 컬럼을 찾지 못해 '참여자 미확인'으로 표시했습니다.")
    if not column_map.get("topic"):
        warnings.append("질문/주제 컬럼을 찾지 못해 '질문 미확인'으로 표시했습니다.")
    if not segments:
        warnings.append("분석할 수 있는 표 행을 찾지 못했습니다.")

    return ParsedUpload(segments, warnings, _compute_quantitative_summary(frame, column_map))


def _compute_quantitative_summary(frame: pd.DataFrame, column_map: dict[str, str]) -> dict[str, Any] | None:
    excluded = {
        column
        for key, column in column_map.items()
        if key in {"participant", "topic", "answer", "memo"} and column
    }

    col_stats: dict[str, Any] = {}
    for col in frame.columns:
        if col in excluded:
            continue
        series = pd.to_numeric(frame[col], errors="coerce").dropna()
        if len(series) == 0:
            continue
        unique_vals = set(series.unique())
        stats: dict[str, Any] = {
            "count": int(series.count()),
            "mean": round(float(series.mean()), 2),
            "min": float(series.min()),
            "max": float(series.max()),
        }
        if unique_vals.issubset({0, 1, 0.0, 1.0}):
            stats["type"] = "binary"
            stats["success_rate"] = f"{series.mean() * 100:.1f}%"
        elif 1 <= series.min() and series.max() <= 10:
            stats["type"] = "scale"
        else:
            stats["type"] = "numeric"
        col_stats[str(col)] = stats

    if not col_stats:
        return None
    return {"total_rows": int(len(frame)), "columns": col_stats}


def _detect_columns(columns: list[str]) -> dict[str, str]:
    normalized = [(_normalize_column_name(str(column)), str(column)) for column in columns]

    def find(candidates: set[str]) -> str:
        for compact, original_name in normalized:
            if compact in candidates or any(candidate in compact for candidate in candidates):
                return original_name
        return ""

    return {
        "participant": find({"participant", "participants", "participantid", "userid", "user", "uid", "pid", "respondent", "respondentid", "참여자", "인터뷰이", "사용자", "대상자"}),
        "topic": find({"question", "questions", "topic", "task", "taskname", "scenario", "mission", "flow", "질문", "주제", "태스크", "과업", "시나리오"}),
        "error_count": find({"errorcount", "errors", "error", "failcount", "mistake", "오류수", "오류", "에러", "실패수"}),
        "task_success": find({"success", "complete", "completion", "status", "pass", "result", "성공", "완료", "상태", "결과"}),
        "score": find({"score", "rating", "sus", "seq", "ces", "nps", "difficulty", "satisfaction", "점수", "평점", "척도", "난이도", "만족도"}),
        "answer": find({"answer", "answers", "response", "responses", "quote", "utterance", "transcript", "발화", "인용", "답변", "응답"}),
        "memo": find({"memo", "note", "notes", "observation", "comment", "remark", "feedback", "reason", "메모", "관찰", "관찰메모", "비고", "코멘트", "피드백", "사유"}),
    }


def _table_row_to_markdown(row: pd.Series, column_map: dict[str, str], source_row_number: int) -> str:
    label_by_key = {
        "participant": "참여자",
        "topic": "태스크/주제",
        "task_success": "성공 여부",
        "score": "점수/척도",
        "error_count": "오류 수",
        "memo": "관찰 메모",
        "answer": "발화/응답",
    }
    lines = [f"### 표 행 {source_row_number}"]
    used_columns: set[str] = set()

    for key in ("participant", "topic", "task_success", "score", "error_count", "memo", "answer"):
        column = column_map.get(key, "")
        value = _cell_value(row, column)
        if not column or not value:
            continue
        used_columns.add(column)
        lines.append(f"- {label_by_key[key]}: {value}")

    extra_values = [
        (str(column), _cell_value(row, str(column)))
        for column in row.index
        if str(column) not in used_columns and _cell_value(row, str(column))
    ]
    if extra_values:
        lines.append("")
        lines.append("#### 추가 데이터")
        lines.extend(f"- {column}: {value}" for column, value in extra_values)

    return "\n".join(lines)


def _normalize_column_name(value: str) -> str:
    return re.sub(r"[\s_\-./()]+", "", value.strip().lower())


def _cell_value(row: pd.Series, column: str) -> str:
    if not column:
        return ""
    value = row.get(column, "")
    if value is None:
        return ""
    text = str(value).strip()
    if text.lower() == "nan":
        return ""
    return text


def _row_has_value(row: pd.Series) -> bool:
    return any(_cell_value(row, str(column)) for column in row.index)
