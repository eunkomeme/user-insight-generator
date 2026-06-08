from __future__ import annotations

import io
import re
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from .models import Segment, utc_now


UNKNOWN_PARTICIPANT = "참여자 미확인"
UNKNOWN_TOPIC = "질문 미확인"


@dataclass
class ParsedUpload:
    segments: list[Segment]
    warnings: list[str]


def parse_uploaded_research_file(filename: str, content: bytes) -> ParsedUpload:
    suffix = Path(filename).suffix.lower()
    if suffix in {".txt", ".md", ".markdown"}:
        text = content.decode("utf-8-sig", errors="replace")
        return ParsedUpload(_parse_text_segments(filename, suffix, text), [])
    if suffix == ".xlsx":
        return _parse_xlsx_segments(filename, content)
    return ParsedUpload([], [".md, .txt, .xlsx 파일만 지원합니다."])


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

    column_map = _detect_columns(list(frame.columns))
    segments: list[Segment] = []
    for row_index, row in frame.fillna("").iterrows():
        content_value = _join_content(row, column_map)
        if not content_value.strip():
            continue
        segments.append(
            Segment(
                id=f"seg_{len(segments) + 1:04d}",
                participant=str(row.get(column_map.get("participant", ""), "")).strip() or UNKNOWN_PARTICIPANT,
                question_or_topic=str(row.get(column_map.get("topic", ""), "")).strip() or UNKNOWN_TOPIC,
                content=content_value.strip(),
                source_file=filename,
                source_type="엑셀",
                source_location=f"row {row_index + 2}",
                include_in_analysis=str(row.get(column_map.get("participant", ""), "")).strip() != "진행자",
                created_at=utc_now(),
            )
        )

    warnings = []
    if not column_map.get("participant"):
        warnings.append("참여자 컬럼을 찾지 못해 '참여자 미확인'으로 표시했습니다.")
    if not column_map.get("topic"):
        warnings.append("질문/주제 컬럼을 찾지 못해 '질문 미확인'으로 표시했습니다.")
    if not segments:
        warnings.append("분석할 수 있는 응답/메모 컬럼을 찾지 못했습니다.")

    return ParsedUpload(segments, warnings)


def _detect_columns(columns: list[str]) -> dict[str, str]:
    normalized = {str(column).strip().lower(): str(column) for column in columns}

    def find(candidates: set[str]) -> str:
        for normalized_name, original_name in normalized.items():
            compact = normalized_name.replace(" ", "").replace("_", "")
            if normalized_name in candidates or compact in candidates:
                return original_name
        return ""

    return {
        "participant": find({"participant", "participants", "p", "참여자", "인터뷰이", "사용자", "대상자"}),
        "topic": find({"question", "questions", "topic", "task", "질문", "주제", "태스크", "과업"}),
        "answer": find({"answer", "answers", "response", "responses", "답변", "응답", "발화"}),
        "memo": find({"memo", "note", "notes", "observation", "메모", "관찰", "관찰메모", "비고"}),
    }


def _join_content(row: pd.Series, column_map: dict[str, str]) -> str:
    values: list[str] = []
    for key in ("answer", "memo"):
        column = column_map.get(key)
        if column and str(row.get(column, "")).strip():
            values.append(str(row.get(column, "")).strip())
    if values:
        return "\n".join(values)

    ignored = {column for column in column_map.values() if column}
    fallback_values = [str(value).strip() for column, value in row.items() if column not in ignored and str(value).strip()]
    return "\n".join(fallback_values)
