from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from core.intake.models import Segment
from core.intake.sources import create_source, delete_source, list_sources, load_source_analysis, load_source_segments, save_source_analysis


def make_segment(segment_id: str, participant: str = "P1") -> Segment:
    return Segment(
        id=segment_id,
        participant=participant,
        question_or_topic="가입 태스크",
        content="버튼 위치를 찾기 어려웠다.",
        source_file="interview.md",
        source_type="마크다운",
        source_location="1-2",
    )


class SourceLibraryTest(unittest.TestCase):
    def test_create_list_load_and_delete_source(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("core.intake.sources.PROJECTS_DIR", Path(tmpdir)):
                source = create_source(
                    project_slug="test-project",
                    filename="interview_A.md",
                    content=b"P1: hello",
                    source_type="마크다운",
                    detected_label="인터뷰 / FGD",
                    segments=[make_segment("seg_0001"), make_segment("seg_0002", "P2")],
                    warnings=[],
                )

                sources = list_sources("test-project")
                segments = load_source_segments("test-project", source.id)

                self.assertEqual(len(sources), 1)
                self.assertEqual(sources[0].name, "interview_A.md")
                self.assertEqual(sources[0].participant_count, 2)
                self.assertEqual(len(segments), 2)
                self.assertTrue((Path(tmpdir) / "test-project" / "inputs" / "sources" / source.id / "interview_A.md").exists())

                delete_source("test-project", source.id)

                self.assertEqual(list_sources("test-project"), [])

    def test_save_and_load_source_analysis(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("core.intake.sources.PROJECTS_DIR", Path(tmpdir)):
                source = create_source(
                    project_slug="test-project",
                    filename="interview_A.md",
                    content=b"P1: hello",
                    source_type="마크다운",
                    detected_label="인터뷰 / FGD",
                    segments=[make_segment("seg_0001")],
                    warnings=[],
                )
                analysis = {
                    "insights": [
                        {
                            "id": "insight_001",
                            "title": "버튼 위치가 과업 흐름을 끊는다",
                        }
                    ],
                    "participant_mentions": {"P1": 1},
                }

                save_source_analysis("test-project", source.id, analysis)
                loaded = load_source_analysis("test-project", source.id)
                updated = list_sources("test-project")[0]

                self.assertEqual(loaded["insights"][0]["id"], "insight_001")
                self.assertEqual(updated.status, "분석완료")
                self.assertEqual(updated.insight_count, 1)


if __name__ == "__main__":
    unittest.main()
