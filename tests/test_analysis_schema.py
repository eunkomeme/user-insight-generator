from __future__ import annotations

import unittest

from core.analysis.groq import _normalize_result
from core.analysis.qualitative import AnalysisResult, run_mock_qualitative_analysis
from core.intake import Segment


def make_segment(
    segment_id: str,
    participant: str,
    content: str,
    question_or_topic: str = "태스크 1",
) -> Segment:
    return Segment(
        id=segment_id,
        participant=participant,
        question_or_topic=question_or_topic,
        content=content,
        source_file="test.md",
        source_type="text",
        source_location=segment_id,
    )


class AnalysisSchemaTest(unittest.TestCase):
    def test_analysis_result_round_trips_new_insight_schema(self) -> None:
        raw = {
            "insights": [
                {
                    "id": "insight_001",
                    "type": "usability_issue",
                    "title": "완료 후 다음 행동이 드러나지 않는다",
                    "summary": "참여자가 제출 이후 다음 위치를 찾지 못했다.",
                    "severity": "높음",
                    "frequency": "보통",
                    "confidence": "높음",
                    "related_tasks": ["태스크 1"],
                    "related_participants": ["P1"],
                    "supporting_quotes": [
                        {
                            "quote": "다음에 뭘 해야 하는지 모르겠어요.",
                            "participant": "P1",
                            "source_id": "seg_001",
                        }
                    ],
                    "recommendation": "제출 완료 상태와 다음 CTA를 같은 화면에서 명확히 분리해 보여준다.",
                    "status": "draft",
                }
            ],
            "participant_mentions": {"P1": 1},
        }

        result = AnalysisResult.from_dict(raw)
        serialized = result.to_dict()

        self.assertEqual(serialized["insights"][0]["type"], "usability_issue")
        self.assertEqual(serialized["insights"][0]["severity"], "높음")
        self.assertEqual(serialized["insights"][0]["supporting_quotes"][0]["source_id"], "seg_001")
        self.assertNotIn("keywords", serialized)
        self.assertNotIn("topics", serialized)

    def test_mock_analysis_uses_new_schema(self) -> None:
        segments = [
            make_segment("seg_001", "P1", "제출하고 나서 어디를 눌러야 하는지 모르겠어요."),
            make_segment("seg_002", "P2", "다음 화면으로 가는 버튼 위치를 찾기 어려웠어요."),
        ]

        result = run_mock_qualitative_analysis(segments).to_dict()
        insight = result["insights"][0]

        self.assertIn(insight["type"], {"usability_issue", "positive_signal"})
        self.assertIn(insight["severity"], {"높음", "보통", "낮음"})
        self.assertIn(insight["frequency"], {"높음", "보통", "낮음"})
        self.assertEqual(insight["status"], "draft")
        self.assertGreaterEqual(len(insight["supporting_quotes"]), 1)
        self.assertEqual(insight["supporting_quotes"][0]["source_id"], "seg_001")

    def test_normalize_result_filters_and_backfills_supporting_quotes(self) -> None:
        segments = [
            make_segment("seg_001", "P1", "완료 후 다음 행동을 찾지 못했어요.", "태스크 2"),
            make_segment("seg_002", "P2", "버튼 문구가 헷갈렸어요.", "태스크 2"),
        ]
        raw = {
            "insights": [
                {
                    "id": "insight_001",
                    "type": "unknown",
                    "title": "다음 행동의 단서가 부족하다",
                    "summary": "참여자가 완료 이후 경로를 찾지 못했다.",
                    "severity": "매우 높음",
                    "frequency": "보통",
                    "confidence": "높음",
                    "evidence_segment_ids": ["seg_001", "missing"],
                    "recommendation": "완료 상태와 다음 행동 CTA를 함께 제공한다.",
                    "status": "초안",
                }
            ],
            "participant_mentions": {"P1": 1, "P2": 1},
        }

        normalized = _normalize_result(raw, segments)
        insight = normalized["insights"][0]

        self.assertEqual(insight["type"], "usability_issue")
        self.assertEqual(insight["severity"], "보통")
        self.assertEqual(insight["status"], "draft")
        self.assertEqual(insight["related_tasks"], ["태스크 2"])
        self.assertEqual(insight["related_participants"], ["P1"])
        self.assertEqual(insight["supporting_quotes"], [
            {
                "quote": "완료 후 다음 행동을 찾지 못했어요.",
                "participant": "P1",
                "source_id": "seg_001",
            }
        ])


if __name__ == "__main__":
    unittest.main()
