from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from core.storage.projects import ProjectMetadata, create_project, delete_project, list_projects, load_project_metadata


class ProjectStorageTest(unittest.TestCase):
    def test_create_list_load_and_delete_project(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            projects_dir = Path(tmpdir)
            metadata = ProjectMetadata(
                project_name="CXI 테스트 프로젝트",
                research_goal="온보딩 흐름의 불확실성을 확인한다.",
                product_or_feature="모바일 온보딩",
                participant_count=4,
                tasks=["가입하기", "첫 설정 완료"],
                evaluation_criteria=["완료율", "혼란 지점"],
            )

            created = create_project(metadata, projects_dir=projects_dir)
            loaded = load_project_metadata(created.project_slug, projects_dir=projects_dir)
            projects = list_projects(projects_dir=projects_dir)

            self.assertEqual(created.project_slug, "cxi-테스트-프로젝트")
            self.assertEqual(loaded.project_name, "CXI 테스트 프로젝트")
            self.assertEqual(loaded.tasks, ["가입하기", "첫 설정 완료"])
            self.assertEqual(projects[0]["slug"], created.project_slug)
            self.assertEqual(projects[0]["research_goal"], "온보딩 흐름의 불확실성을 확인한다.")
            self.assertTrue((projects_dir / created.project_slug / "inputs" / "raw").exists())
            self.assertTrue((projects_dir / created.project_slug / "analysis" / "sessions").exists())

            delete_project(created.project_slug, projects_dir=projects_dir)

            self.assertEqual(list_projects(projects_dir=projects_dir), [])
            self.assertFalse((projects_dir / created.project_slug).exists())

    def test_rejects_invalid_project_slug_for_load_and_delete(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            projects_dir = Path(tmpdir)

            with self.assertRaises(ValueError):
                load_project_metadata("../outside", projects_dir=projects_dir)

            with self.assertRaises(ValueError):
                delete_project("../outside", projects_dir=projects_dir)


if __name__ == "__main__":
    unittest.main()
