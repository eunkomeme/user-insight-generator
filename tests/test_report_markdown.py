from __future__ import annotations

import unittest

from backend.main import ReportMarkdownRequest, _build_report_markdown


class ReportMarkdownTest(unittest.TestCase):
    def test_build_report_markdown_uses_insights_and_segments(self) -> None:
        markdown = _build_report_markdown(
            ReportMarkdownRequest(
                project_name="가입 UX 테스트",
                source_name="observations.csv",
                source_type="CSV",
                segment_count=2,
                participant_utterance_count=2,
                participants=["P1", "P2"],
                segments=[
                    {
                        "id": "seg_0001",
                        "participant": "P1",
                        "question_or_topic": "가입 태스크",
                        "content": "### 표 행 2\n- 관찰 메모: 버튼 위치를 찾지 못했다",
                    }
                ],
                insights=[
                    {
                        "id": "insight_001",
                        "type": "usability_issue",
                        "title": "가입 완료 전 주요 CTA가 시야에서 벗어난다",
                        "summary": "참여자가 가입 태스크에서 버튼 위치를 찾지 못했다.",
                        "severity": "높음",
                        "frequency": "보통",
                        "confidence": "높음",
                        "recommendation": "가입 화면의 기본 CTA 위치와 라벨을 재검토한다.",
                        "supporting_quotes": [{"source_id": "seg_0001", "participant": "P1"}],
                    }
                ],
            )
        )

        self.assertIn("# 가입 UX 테스트 UX 리서치 보고서 초안", markdown)
        self.assertIn("- 자료 유형: CSV", markdown)
        self.assertIn("### 1. 가입 완료 전 주요 CTA가 시야에서 벗어난다", markdown)
        self.assertIn("P1 · 가입 태스크", markdown)
        self.assertIn("가입 화면의 기본 CTA", markdown)

    def test_build_report_markdown_returns_empty_without_insights(self) -> None:
        markdown = _build_report_markdown(ReportMarkdownRequest(insights=[]))

        self.assertEqual(markdown, "")


if __name__ == "__main__":
    unittest.main()
