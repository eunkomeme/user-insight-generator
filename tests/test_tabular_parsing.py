from __future__ import annotations

import unittest

from core.intake.parsers import parse_uploaded_research_file


class TabularParsingTest(unittest.TestCase):
    def test_parse_csv_creates_markdown_segments_from_known_columns(self) -> None:
        content = "\n".join(
            [
                "uid_string,task_name,t1_status,sus_score,error_count,notes_raw,quote_raw",
                "P-001,가입하기,1,85.5,0,버튼 위치를 잠시 찾지 못했다,어디를 눌러야 하죠?",
                "P-002,가입하기,0,62.0,2,오류 메시지를 이해하지 못했다,이게 무슨 뜻이에요?",
            ]
        ).encode("utf-8")

        parsed = parse_uploaded_research_file("UT_Metrics_Raw.csv", content)

        self.assertEqual(len(parsed.segments), 2)
        self.assertEqual(parsed.segments[0].participant, "P-001")
        self.assertEqual(parsed.segments[0].question_or_topic, "가입하기")
        self.assertEqual(parsed.segments[0].source_type, "CSV")
        self.assertIn("### 표 행 2", parsed.segments[0].content)
        self.assertIn("- 성공 여부: 1", parsed.segments[0].content)
        self.assertIn("- 점수/척도: 85.5", parsed.segments[0].content)
        self.assertIn("- 오류 수: 0", parsed.segments[0].content)
        self.assertIn("- 관찰 메모: 버튼 위치", parsed.segments[0].content)
        self.assertIn("- 발화/응답: 어디를 눌러야 하죠?", parsed.segments[0].content)

        self.assertIsNotNone(parsed.quantitative_summary)
        columns = parsed.quantitative_summary["columns"] if parsed.quantitative_summary else {}
        self.assertIn("t1_status", columns)
        self.assertEqual(columns["t1_status"]["type"], "binary")
        self.assertIn("sus_score", columns)

    def test_parse_csv_preserves_extra_columns_when_note_columns_are_missing(self) -> None:
        content = "\n".join(
            [
                "participant,task,screen,clicks,device",
                "P1,검색 태스크,필터 화면,5,iPhone",
            ]
        ).encode("utf-8")

        parsed = parse_uploaded_research_file("observations.csv", content)

        self.assertEqual(len(parsed.segments), 1)
        self.assertIn("#### 추가 데이터", parsed.segments[0].content)
        self.assertIn("- screen: 필터 화면", parsed.segments[0].content)
        self.assertIn("- clicks: 5", parsed.segments[0].content)
        self.assertIn("- device: iPhone", parsed.segments[0].content)
        self.assertIsNotNone(parsed.quantitative_summary)
        columns = parsed.quantitative_summary["columns"] if parsed.quantitative_summary else {}
        self.assertIn("clicks", columns)

    def test_empty_csv_returns_warning_without_segments(self) -> None:
        parsed = parse_uploaded_research_file("empty.csv", "participant,task,note\n".encode("utf-8"))

        self.assertEqual(parsed.segments, [])
        self.assertTrue(any("읽을 수 있는 행" in warning for warning in parsed.warnings))

    def test_broken_csv_returns_korean_warning(self) -> None:
        parsed = parse_uploaded_research_file("broken.csv", b'\xff\xfe"\x00')

        self.assertEqual(parsed.segments, [])
        self.assertTrue(any("CSV 파일을 읽는 중 오류" in warning for warning in parsed.warnings))


if __name__ == "__main__":
    unittest.main()
