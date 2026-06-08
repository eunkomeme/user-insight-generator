from __future__ import annotations

import html
from datetime import datetime

import pandas as pd
import streamlit as st

from core.analysis import load_analysis_result, run_groq_chunked_qualitative_analysis, save_analysis_result
from core.config import get_groq_api_key, get_groq_model
from core.intake import (
    Segment,
    load_segments,
    load_structure_review_status,
    parse_uploaded_research_file,
    save_raw_upload,
    save_segments,
    save_structure_review_status,
)
from core.storage import ProjectMetadata, create_project, list_projects, load_project_metadata


st.set_page_config(
    page_title="리서치 인사이트 엔진",
    page_icon="",
    layout="wide",
)


PAGES = {
    "시작하기": "project_setup",
    "인터뷰 정리": "data_intake",
    "AI 분석": "analysis_workspace",
    "인사이트 검수": "insight_review",
    "보고서 작성": "report_builder",
    "내보내기": "export",
    "설정": "settings",
}


def apply_app_style() -> None:
    st.markdown(
        """
        <style>
        :root {
          --app-bg: #f8f9ff;
          --app-card: #ffffff;
          --app-border: #d8deee;
          --app-text: #0b1c30;
          --app-muted: #586174;
          --app-primary: #003ec7;
          --app-primary-soft: #e7edff;
          --app-green: #0f9f6e;
          --app-yellow: #b7791f;
        }

        .stApp {
          background: var(--app-bg);
          color: var(--app-text);
        }

        [data-testid="stSidebar"] {
          background: #ffffff;
          border-right: 1px solid var(--app-border);
        }

        [data-testid="stSidebar"] h1,
        [data-testid="stSidebar"] h2,
        [data-testid="stSidebar"] h3 {
          color: var(--app-primary);
        }

        .main .block-container {
          padding-top: 2rem;
          max-width: 1320px;
        }

        h1, h2, h3 {
          letter-spacing: 0;
        }

        .hero-row {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-end;
          margin-bottom: 24px;
        }

        .eyebrow {
          color: var(--app-muted);
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .page-title {
          color: var(--app-text);
          font-size: 32px;
          line-height: 40px;
          font-weight: 750;
          margin: 0 0 6px;
        }

        .page-subtitle {
          color: var(--app-muted);
          font-size: 15px;
          line-height: 24px;
          margin: 0;
        }

        .toolbar-card,
        .metric-card,
        .notice-card,
        .table-shell {
          background: var(--app-card);
          border: 1px solid var(--app-border);
          border-radius: 6px;
          box-shadow: 0 1px 2px rgba(11, 28, 48, 0.04);
        }

        .toolbar-card {
          padding: 18px 20px;
          margin-bottom: 18px;
        }

        .metric-card {
          padding: 18px 20px;
          min-height: 132px;
        }

        .metric-label {
          color: var(--app-muted);
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 18px;
        }

        .metric-value {
          color: var(--app-text);
          font-size: 38px;
          line-height: 44px;
          font-weight: 780;
        }

        .metric-help {
          color: var(--app-muted);
          font-size: 13px;
          margin-top: 4px;
        }

        .notice-card {
          background: var(--app-primary);
          color: #ffffff;
          padding: 20px 22px;
          min-height: 132px;
        }

        .notice-card h3 {
          color: #ffffff;
          margin: 0 0 8px;
          font-size: 20px;
        }

        .notice-card p {
          color: rgba(255, 255, 255, 0.86);
          margin: 0;
          font-size: 14px;
          line-height: 22px;
        }

        .table-shell {
          margin-top: 18px;
          overflow: hidden;
        }

        .section-header {
          padding: 16px 18px;
          border-bottom: 1px solid var(--app-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 720;
          margin: 0;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 3px 9px;
          font-size: 12px;
          font-weight: 700;
          background: var(--app-primary-soft);
          color: var(--app-primary);
        }

        .empty-line {
          color: var(--app-muted);
          padding: 22px 18px;
          font-size: 14px;
        }

        .stButton > button,
        .stFormSubmitButton > button {
          border-radius: 4px;
          font-weight: 700;
        }

        [data-testid="stBaseButton-primary"] {
          background: var(--app-primary);
          border-color: var(--app-primary);
          color: #ffffff;
        }

        [data-testid="stBaseButton-primary"]:hover {
          background: #0034a8;
          border-color: #0034a8;
          color: #ffffff;
        }

        .helper-card {
          background: #eef4ff;
          border: 1px solid #cbdcff;
          border-radius: 6px;
          padding: 16px 18px;
          margin: 12px 0 18px;
          color: var(--app-text);
        }

        .helper-card strong {
          color: var(--app-primary);
        }

        .helper-card p {
          margin: 4px 0 0;
          color: var(--app-muted);
          font-size: 14px;
          line-height: 22px;
        }

        .workflow-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin: 18px 0 22px;
        }

        .workflow-card {
          background: var(--app-card);
          border: 1px solid var(--app-border);
          border-radius: 8px;
          padding: 18px;
          min-height: 150px;
        }

        .workflow-step {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--app-primary-soft);
          color: var(--app-primary);
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 14px;
        }

        .workflow-card h3 {
          margin: 0 0 8px;
          color: var(--app-text);
          font-size: 18px;
        }

        .workflow-card p {
          margin: 0;
          color: var(--app-muted);
          font-size: 14px;
          line-height: 22px;
        }

        .primary-panel {
          background: #ffffff;
          border: 1px solid var(--app-border);
          border-radius: 8px;
          padding: 22px;
          margin: 18px 0;
          box-shadow: 0 1px 2px rgba(11, 28, 48, 0.04);
        }

        .next-action {
          background: #003ec7;
          color: #ffffff;
          border-radius: 8px;
          padding: 20px 22px;
          margin: 20px 0;
        }

        .next-action h3 {
          color: #ffffff;
          margin: 0 0 6px;
          font-size: 20px;
        }

        .next-action p {
          color: rgba(255, 255, 255, 0.86);
          margin: 0;
          font-size: 14px;
          line-height: 22px;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
          gap: 24px;
          align-items: start;
          margin-top: 18px;
        }

        .insight-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .insight-card {
          background: #ffffff;
          border: 1px solid var(--app-border);
          border-radius: 8px;
          padding: 18px 18px 18px 20px;
          box-shadow: 0 1px 2px rgba(11, 28, 48, 0.04);
          position: relative;
          overflow: hidden;
          min-height: 190px;
        }

        .insight-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--app-primary);
        }

        .insight-card.secondary::before {
          background: var(--app-green);
        }

        .insight-card.warning::before {
          background: var(--app-yellow);
        }

        .insight-tag {
          display: inline-flex;
          border-radius: 4px;
          padding: 3px 8px;
          font-size: 12px;
          font-weight: 800;
          color: var(--app-primary);
          background: var(--app-primary-soft);
          margin-bottom: 12px;
        }

        .insight-card.secondary .insight-tag {
          color: var(--app-green);
          background: #e8f8f1;
        }

        .insight-card.warning .insight-tag {
          color: var(--app-yellow);
          background: #fff4df;
        }

        .insight-card h3 {
          margin: 0 0 8px;
          font-size: 18px;
          line-height: 25px;
          color: var(--app-text);
        }

        .insight-card p {
          margin: 0;
          color: var(--app-muted);
          font-size: 14px;
          line-height: 22px;
        }

        .quote-card {
          background: #fbfcf4;
          border: 1px solid var(--app-border);
          border-radius: 8px;
          padding: 18px;
          margin-bottom: 14px;
        }

        .quote-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          color: var(--app-muted);
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .quote-avatar {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--app-primary-soft);
          color: var(--app-primary);
          font-size: 11px;
          font-weight: 900;
        }

        .quote-text {
          border-left: 2px solid rgba(0, 62, 199, 0.28);
          padding-left: 14px;
          color: var(--app-text);
          font-size: 16px;
          line-height: 26px;
          margin-bottom: 12px;
        }

        .ai-note {
          color: var(--app-primary);
          font-size: 13px;
          font-weight: 700;
        }

        .side-panel {
          background: #ffffff;
          border: 1px solid var(--app-border);
          border-radius: 8px;
          padding: 18px;
          box-shadow: 0 1px 2px rgba(11, 28, 48, 0.04);
          margin-bottom: 16px;
        }

        .side-panel h3 {
          margin: 0 0 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--app-border);
          font-size: 18px;
        }

        .keyword-pill {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 999px;
          background: var(--app-primary-soft);
          color: var(--app-primary);
          font-size: 12px;
          font-weight: 800;
          margin: 0 6px 8px 0;
        }

        .topic-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #eef1f7;
          font-size: 14px;
        }

        .topic-row:last-child {
          border-bottom: 0;
        }

        .affinity-board {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 14px;
        }

        .affinity-cluster {
          background: #ffffff;
          border: 1px solid var(--app-border);
          border-radius: 8px;
          padding: 16px;
          min-height: 220px;
          box-shadow: 0 1px 2px rgba(11, 28, 48, 0.04);
        }

        .affinity-cluster h3 {
          margin: 0 0 6px;
          font-size: 17px;
          line-height: 24px;
          color: var(--app-text);
        }

        .affinity-cluster p {
          margin: 0 0 12px;
          color: var(--app-muted);
          font-size: 13px;
          line-height: 20px;
        }

        .affinity-note {
          background: #f7faef;
          border: 1px solid #dce8c7;
          border-radius: 6px;
          padding: 12px;
          margin-top: 10px;
          color: var(--app-text);
          font-size: 13px;
          line-height: 20px;
        }

        .affinity-note strong {
          display: block;
          color: var(--app-primary);
          font-size: 12px;
          margin-bottom: 5px;
        }

        @media (max-width: 900px) {
          .workflow-grid {
            grid-template-columns: 1fr;
          }

          .analysis-grid,
          .insight-grid,
          .affinity-board {
            grid-template-columns: 1fr;
          }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def parse_lines(value: str) -> list[str]:
    return [line.strip() for line in value.splitlines() if line.strip()]


def init_session_state() -> None:
    st.session_state.setdefault("current_project_slug", None)
    st.session_state.setdefault("project_metadata", None)
    st.session_state.setdefault("segment_editor_version", 0)


def render_sidebar(progress: dict[str, bool]) -> str:
    st.sidebar.title("인사이트 엔진")
    st.sidebar.caption("사내용 UX 리서치 워크벤치")

    projects = list_projects()
    if projects:
        project_labels = ["프로젝트 선택 안 함"] + [
            f"{project['name']} ({project['slug']})" for project in projects
        ]
        selected_label = st.sidebar.selectbox("현재 프로젝트", project_labels)
        if selected_label != "프로젝트 선택 안 함":
            selected_index = project_labels.index(selected_label) - 1
            selected_project = projects[selected_index]
            if st.session_state.current_project_slug != selected_project["slug"]:
                st.session_state.current_project_slug = selected_project["slug"]
                st.session_state.project_metadata = load_project_metadata(selected_project["slug"])
        else:
            st.session_state.current_project_slug = None
            st.session_state.project_metadata = None
    else:
        st.sidebar.info("시작하려면 프로젝트를 먼저 만드세요.")

    page_label = st.sidebar.radio("작업 메뉴", list(PAGES.keys()))
    st.sidebar.divider()
    steps = [
        ("프로젝트 설정", progress.get("project", False)),
        ("자료 입력", progress.get("segments", False)),
        ("AI 분석", progress.get("analysis", False)),
    ]
    lines = "".join(
        f'<span style="color:{"#0f9f6e" if done else "#586174"};font-size:12px;display:block;line-height:22px">'
        f'{"✓" if done else "○"}&nbsp;{i}단계: {label}</span>'
        for i, (label, done) in enumerate(steps, start=1)
    )
    st.sidebar.markdown(lines, unsafe_allow_html=True)
    st.sidebar.caption("v1은 텍스트/CSV 자료, 사람 검수, 보고서 초안 작성에 집중합니다.")
    return PAGES[page_label]


def render_page_header(title: str, subtitle: str, eyebrow: str = "리서치 작업공간") -> None:
    st.markdown(
        f"""
        <div class="hero-row">
          <div>
            <div class="eyebrow">{eyebrow}</div>
            <h1 class="page-title">{title}</h1>
            <p class="page-subtitle">{subtitle}</p>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_project_context() -> None:
    metadata = st.session_state.project_metadata
    if not metadata:
        st.info("아직 선택된 프로젝트가 없습니다. 프로젝트 화면에서 새 프로젝트를 만들거나 기존 프로젝트를 불러오세요.")
        return

    st.subheader(metadata.project_name)
    col1, col2, col3 = st.columns(3)
    col1.metric("참여자", metadata.participant_count)
    col2.metric("태스크", len(metadata.tasks))
    col3.metric("평가 기준", len(metadata.evaluation_criteria))

    with st.expander("프로젝트 정보", expanded=False):
        st.write("리서치 목적")
        st.write(metadata.research_goal or "-")
        st.write("제품/기능")
        st.write(metadata.product_or_feature or "-")
        st.write("태스크")
        st.write(metadata.tasks or [])
        st.write("평가 기준")
        st.write(metadata.evaluation_criteria or [])


def require_project() -> str | None:
    project_slug = st.session_state.current_project_slug
    if not project_slug:
        st.warning("이 기능을 사용하려면 먼저 프로젝트를 만들거나 선택해야 합니다.")
        return None
    return project_slug


def segments_to_frame(segments: list[Segment]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "id": segment.id,
                "원문 단위": index,
                "참여자": segment.participant,
                "질문/주제": segment.question_or_topic,
                "원문 내용": segment.content,
                "출처 파일": segment.source_file,
                "원문 위치": segment.source_location,
                "분석 포함": segment.include_in_analysis,
            }
            for index, segment in enumerate(segments, start=1)
        ]
    )


def frame_to_segments(frame: pd.DataFrame, existing_segments: list[Segment]) -> list[Segment]:
    existing_by_id = {segment.id: segment for segment in existing_segments}
    segments: list[Segment] = []
    for _, row in frame.iterrows():
        segment_id = str(row.get("id") or "").strip()
        existing = existing_by_id.get(segment_id)
        segments.append(
            Segment(
                id=segment_id or f"seg_{len(segments) + 1:04d}",
                participant=str(row.get("참여자") or "참여자 미확인").strip() or "참여자 미확인",
                question_or_topic=str(row.get("질문/주제") or "질문 미확인").strip() or "질문 미확인",
                content=str(row.get("원문 내용") or "").strip(),
                source_file=str(row.get("출처 파일") or (existing.source_file if existing else "")),
                source_type=existing.source_type if existing else "",
                source_location=str(row.get("원문 위치") or (existing.source_location if existing else "")),
                include_in_analysis=bool(row.get("분석 포함", True)),
                created_at=existing.created_at if existing else "",
            )
        )
    return segments


def truncate_text(value: str, limit: int = 180) -> str:
    cleaned = " ".join(str(value).split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 1].rstrip() + "..."


def _insight_confidence_tag(confidence: str) -> tuple[str, str]:
    if confidence == "높음":
        return "근거 확실", "secondary"
    if confidence == "낮음":
        return "가설 수준", "warning"
    return "추가 확인 필요", ""


def render_insight_card(title: str, summary: str, tag: str, variant: str = "") -> None:
    st.markdown(
        f"""
        <div class="insight-card {variant}">
          <span class="insight-tag">{html.escape(tag)}</span>
          <h3>{html.escape(title)}</h3>
          <p>{html.escape(summary)}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_recommendation_card(title: str, recommendation: str) -> None:
    st.markdown(
        f"""
        <div class="helper-card">
          <strong>{html.escape(title)}</strong>
          <p>{html.escape(recommendation)}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_insight_detail_card(insight) -> None:
    interpretation = insight.interpretation or insight.summary
    why_it_matters = insight.why_it_matters or "제품 의사결정에 연결되는 중요도를 추가 검토하세요."
    product_implication = insight.product_implication or insight.recommendation
    st.markdown(
        f"""
        <div class="side-panel">
          <h3>{html.escape(insight.title)}</h3>
          <div class="topic-row"><span>해석</span></div>
          <p>{html.escape(interpretation)}</p>
          <div class="topic-row"><span>왜 중요한가</span></div>
          <p>{html.escape(why_it_matters)}</p>
          <div class="topic-row"><span>제품 함의</span></div>
          <p>{html.escape(product_implication)}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_quote_card(participant: str, topic: str, quote: str, note: str) -> None:
    avatar = participant.replace("참여자 ", "P")
    st.markdown(
        f"""
        <div class="quote-card">
          <div class="quote-meta">
            <span class="quote-avatar">{html.escape(truncate_text(avatar, 4))}</span>
            <span>{html.escape(participant)}</span>
            <span>·</span>
            <span>{html.escape(topic)}</span>
          </div>
          <div class="quote-text">{html.escape(quote)}</div>
          <div class="ai-note">AI 해석: {html.escape(note)}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_affinity_diagram(result, segment_by_id: dict[str, Segment]) -> None:
    if not result.topics:
        return

    st.subheader("어피니티 다이어그램")
    st.caption("AI가 반복 주제별로 원문 메모를 묶은 초안입니다. 리서처가 이후 주제명을 바꾸거나 묶음을 조정하는 기준으로 사용할 수 있습니다.")

    cluster_html_parts: list[str] = [
        """
        <style>
        .affinity-board {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 14px;
        }
        .affinity-cluster {
          background: #ffffff;
          border: 1px solid #d8deee;
          border-radius: 8px;
          padding: 16px;
          min-height: 220px;
          box-shadow: 0 1px 2px rgba(11, 28, 48, 0.04);
          font-family: sans-serif;
        }
        .affinity-cluster h3 {
          margin: 0 0 6px;
          font-size: 17px;
          line-height: 24px;
          color: #0b1c30;
        }
        .affinity-cluster p {
          margin: 0 0 12px;
          color: #586174;
          font-size: 13px;
          line-height: 20px;
        }
        .affinity-note {
          background: #f7faef;
          border: 1px solid #dce8c7;
          border-radius: 6px;
          padding: 12px;
          margin-top: 10px;
          color: #0b1c30;
          font-size: 13px;
          line-height: 20px;
        }
        .affinity-note strong {
          display: block;
          color: #003ec7;
          font-size: 12px;
          margin-bottom: 5px;
        }
        @media (max-width: 900px) {
          .affinity-board { grid-template-columns: 1fr; }
        }
        </style>
        <div class="affinity-board">
        """
    ]
    for topic in result.topics[:6]:
        notes: list[str] = []
        for segment_id in topic.segment_ids[:4]:
            segment = segment_by_id.get(segment_id)
            if not segment:
                continue
            notes.append(
                "<div class=\"affinity-note\">"
                f"<strong>{html.escape(segment.participant)} · {html.escape(segment.question_or_topic)}</strong>"
                f"{html.escape(truncate_text(segment.content, 150))}"
                "</div>"
            )
        note_html = "".join(notes) or '<div class="affinity-note">연결된 원문 메모가 없습니다.</div>'
        cluster_html_parts.append(
            "<div class=\"affinity-cluster\">"
            f"<h3>{html.escape(topic.topic_name)}</h3>"
            f"<p>{html.escape(topic.summary)}</p>"
            f"{note_html}"
            "</div>"
        )
    cluster_html_parts.append("</div>")
    board_html = "".join(cluster_html_parts)
    if hasattr(st, "html"):
        st.html(board_html)
    else:
        st.markdown(board_html, unsafe_allow_html=True)


def analyze_with_groq_or_show_error(segments: list[Segment]) -> bool:
    api_key = get_groq_api_key()
    model = get_groq_model()
    if not api_key:
        st.error("Groq API 키가 없습니다. 프로젝트 루트의 `.env` 파일에 `GROQ_API_KEY=...` 값을 넣고 다시 실행하세요.")
        return False

    metadata = st.session_state.get("project_metadata")
    project_context = None
    if metadata:
        project_context = {
            "research_goal": metadata.research_goal,
            "tasks": metadata.tasks,
            "evaluation_criteria": metadata.evaluation_criteria,
        }
    with st.spinner(f"Groq로 긴 인터뷰를 나눠 분석 중입니다. 무료 한도에서는 1-3분 걸릴 수 있습니다. 사용 모델: {model}"):
        try:
            result = run_groq_chunked_qualitative_analysis(segments, api_key=api_key, model=model, project_context=project_context)
        except Exception as exc:
            st.error(str(exc))
            st.info("Groq 무료 한도 때문에 잠시 막힌 경우 1분 정도 기다린 뒤 다시 실행해보세요.")
            return False
    project_slug = st.session_state.current_project_slug
    if not project_slug:
        st.error("선택된 프로젝트가 없습니다.")
        return False
    save_analysis_result(project_slug, result)
    return True


def render_project_setup() -> None:
    render_page_header(
        "인터뷰 넣고 인사이트 받기",
        "프로젝트 이름만 잡고 바로 인터뷰 속기나 관찰 메모를 넣으세요. 앱이 주제, 키워드, 인사이트 초안을 먼저 정리해줍니다.",
        "시작하기",
    )

    current = st.session_state.project_metadata

    st.markdown(
        """
        <div class="workflow-grid">
          <div class="workflow-card">
            <div class="workflow-step">1</div>
            <h3>자료 넣기</h3>
            <p>인터뷰 속기, 관찰 메모, 엑셀 자료를 붙여넣거나 업로드합니다.</p>
          </div>
          <div class="workflow-card">
            <div class="workflow-step">2</div>
            <h3>AI가 정리</h3>
            <p>반복 키워드, 주제 묶음, 근거 발화를 자동으로 정리합니다.</p>
          </div>
          <div class="workflow-card">
            <div class="workflow-step">3</div>
            <h3>인사이트 검수</h3>
            <p>리서처가 초안을 고르고 다듬어 보고서로 이어갑니다.</p>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <div class="primary-panel">
        """,
        unsafe_allow_html=True,
    )
    st.subheader("새 리서치 분석 시작")
    st.caption("처음에는 최소 정보만 입력해도 됩니다. 태스크와 평가 기준은 필요할 때 추가하세요.")
    with st.form("project_setup_form"):
        project_name = st.text_input(
            "프로젝트명",
            value=current.project_name if current else "",
            placeholder="예: SmartThings 요리 경험 인터뷰",
        )
        research_goal = st.text_area(
            "리서치 목적",
            value=current.research_goal if current else "",
            placeholder="예: 사용자가 스마트 가전으로 요리할 때 어떤 불편과 기대를 느끼는지 파악한다.",
            height=100,
        )
        product_or_feature = st.text_input(
            "대상 제품/기능",
            value=current.product_or_feature if current else "",
            placeholder="예: 장바구니, 결제, 온보딩, 검색 결과",
        )

        with st.expander("선택 사항: 참여자 수, 태스크, 평가 기준"):
            participant_count = st.number_input(
                "참여자 수",
                min_value=0,
                step=1,
                value=current.participant_count if current else 0,
            )
            tasks = st.text_area(
                "태스크, 한 줄에 하나씩",
                value="\n".join(current.tasks) if current else "",
                placeholder="태스크 1: 원하는 상품 찾기\n태스크 2: 결제 완료하기",
                height=120,
            )
            evaluation_criteria = st.text_area(
                "평가 기준, 한 줄에 하나씩",
                value="\n".join(current.evaluation_criteria) if current else "",
                placeholder="성공 여부\n난이도\n만족도\n오류 수",
                height=100,
            )

        submitted = st.form_submit_button("시작하기")
    st.markdown("</div>", unsafe_allow_html=True)

    if submitted:
        if not project_name.strip():
            st.error("프로젝트명은 필수입니다.")
            return

        metadata = ProjectMetadata(
            project_name=project_name.strip(),
            research_goal=research_goal.strip(),
            product_or_feature=product_or_feature.strip(),
            participant_count=int(participant_count),
            tasks=parse_lines(tasks),
            evaluation_criteria=parse_lines(evaluation_criteria),
            project_slug=current.project_slug if current else "",
            created_at=current.created_at if current else "",
        )
        saved = create_project(metadata)
        st.session_state.current_project_slug = saved.project_slug
        st.session_state.project_metadata = saved
        st.success(f"시작 준비가 끝났습니다: {saved.project_name}")

    if st.session_state.project_metadata:
        st.markdown(
            """
            <div class="next-action">
              <h3>다음 단계: 인터뷰 속기를 넣으세요</h3>
              <p>왼쪽 메뉴에서 '인터뷰 정리'를 선택한 뒤, 속기 텍스트를 붙여넣으면 키워드와 인사이트 초안이 바로 생성됩니다.</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.divider()
    render_project_context()


def render_data_intake() -> None:
    render_page_header(
        "인터뷰 정리",
        "인터뷰 속기나 관찰 메모를 넣으면 주요 키워드와 인사이트를 뽑기 좋은 형태로 자동 정리합니다.",
        "자료 입력",
    )

    project_slug = require_project()
    if not project_slug:
        return

    segments = load_segments(project_slug)
    review_complete = load_structure_review_status(project_slug)
    included_count = sum(1 for segment in segments if segment.include_in_analysis)
    participant_count = len({segment.participant for segment in segments if segment.participant != "참여자 미확인"})

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(
            f"""
            <div class="metric-card">
              <div class="metric-label">정리된 발화/메모</div>
              <div class="metric-value">{len(segments)}</div>
              <div class="metric-help">AI가 읽을 수 있게 자동으로 나눈 단위</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with col2:
        st.markdown(
            f"""
            <div class="metric-card">
              <div class="metric-label">분석 대상</div>
              <div class="metric-value">{included_count}</div>
              <div class="metric-help">체크 해제된 자료는 분석에서 제외됩니다</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with col3:
        st.markdown(
            f"""
            <div class="notice-card">
              <h3>{'분석 가능' if segments else '자료 입력 필요'}</h3>
              <p>{'참여자 ' + str(participant_count) + '명 기준으로 자료가 정리되었습니다. 바로 AI 분석 화면에서 결과를 볼 수 있습니다.' if segments else '인터뷰 속기를 붙여넣거나 파일을 올리면 자동으로 정리합니다.'}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    paste_tab, upload_tab = st.tabs(["텍스트 붙여넣기", "파일 업로드"])

    with paste_tab:
        st.subheader("속기 텍스트를 그대로 붙여넣기")
        st.caption("P1:, 참여자1: 같은 발화자 표시가 있으면 분석 품질이 훨씬 좋아집니다. 표시가 없으면 '참여자 미확인'으로 처리됩니다.")
        with st.form("paste_interview_form"):
            paste_title = st.text_input("자료 이름", value="붙여넣은 인터뷰")
            pasted_text = st.text_area(
                "인터뷰 속기/관찰 메모",
                placeholder="예:\n# 결제 플로우\nP1: 다음 버튼이 어디 있는지 잘 모르겠어요.\n질문: 결제 중 불안한 점이 있었나요?\nP2: 오류가 날까봐 걱정됐어요.",
                height=300,
            )
            paste_submitted = st.form_submit_button("정리하고 인사이트 만들기")

        if paste_submitted:
            if not pasted_text.strip():
                st.error("붙여넣을 텍스트를 입력하세요.")
            else:
                timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
                safe_title = paste_title.strip() or "붙여넣은 인터뷰"
                filename = f"{safe_title}-{timestamp}.md"
                file_bytes = pasted_text.encode("utf-8")
                parsed = parse_uploaded_research_file(filename, file_bytes)
                if parsed.segments:
                    save_raw_upload(project_slug, filename, file_bytes)
                    save_segments(project_slug, parsed.segments)
                    save_structure_review_status(project_slug, True)
                    st.session_state.segment_editor_version += 1
                    analyzed = analyze_with_groq_or_show_error(parsed.segments)
                    if analyzed:
                        st.success(f"Groq 분석이 끝났습니다. {len(parsed.segments)}개의 발화/메모를 바탕으로 키워드와 인사이트 초안을 만들었습니다.")
                    else:
                        st.info(f"자료 정리는 끝났습니다. {len(parsed.segments)}개의 발화/메모를 저장했습니다. `.env`에 Groq API 키를 넣으면 AI 분석을 실행할 수 있습니다.")
                    for warning in parsed.warnings:
                        st.warning(warning)
                    segments = parsed.segments
                    review_complete = True
                else:
                    st.error("정리할 수 있는 텍스트를 찾지 못했습니다. 내용을 확인하세요.")

    with upload_tab:
        st.subheader("파일로 넣기")
        uploaded_file = st.file_uploader(
            "마크다운, 텍스트, 엑셀 파일을 올리면 같은 방식으로 정리합니다.",
            type=["md", "markdown", "txt", "xlsx"],
            accept_multiple_files=False,
        )
        if uploaded_file is not None:
            file_bytes = uploaded_file.getvalue()
            parsed = parse_uploaded_research_file(uploaded_file.name, file_bytes)
            if parsed.segments:
                save_raw_upload(project_slug, uploaded_file.name, file_bytes)
                save_segments(project_slug, parsed.segments)
                save_structure_review_status(project_slug, True)
                st.session_state.segment_editor_version += 1
                analyzed = analyze_with_groq_or_show_error(parsed.segments)
                if analyzed:
                    st.success(f"Groq 분석이 끝났습니다. {uploaded_file.name}에서 {len(parsed.segments)}개의 발화/메모를 바탕으로 키워드와 인사이트 초안을 만들었습니다.")
                else:
                    st.info(f"자료 정리는 끝났습니다. {uploaded_file.name}에서 {len(parsed.segments)}개의 발화/메모를 저장했습니다. `.env`에 Groq API 키를 넣으면 AI 분석을 실행할 수 있습니다.")
                for warning in parsed.warnings:
                    st.warning(warning)
                segments = parsed.segments
                review_complete = True
            else:
                st.error("분리된 원문 조각이 없습니다.")
                for warning in parsed.warnings:
                    st.warning(warning)

    if segments:
        st.info("자료를 넣으면 자동으로 정리와 1차 인사이트 생성을 끝냅니다. 아래 원문 단위 표는 결과가 이상할 때만 열어서 확인하세요.")

    if not segments:
        st.markdown(
            """
            <div class="table-shell">
              <div class="section-header">
                <h3 class="section-title">원천 자료</h3>
                <span class="status-pill">업로드 대기</span>
              </div>
              <div class="empty-line">아직 등록된 자료가 없습니다. 파일을 업로드하거나 텍스트를 붙여넣으면 원문을 자동으로 나눠 보여줍니다.</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    else:
        with st.expander("고급: 자동으로 나눈 원문 단위 확인/수정", expanded=False):
            st.caption("참여자나 주제가 이상하게 잡힌 경우에만 수정하세요. 보통은 열지 않아도 됩니다.")
            unknown_participants = sum(1 for segment in segments if segment.participant == "참여자 미확인")
            unknown_topics = sum(1 for segment in segments if segment.question_or_topic == "질문 미확인")
            check_col1, check_col2, check_col3 = st.columns(3)
            check_col1.metric("정리된 원문 단위", len(segments))
            check_col2.metric("참여자 미확인", unknown_participants)
            check_col3.metric("질문/주제 미확인", unknown_topics)

            show_only_needs_review = st.toggle("확인이 필요한 행만 보기", value=False)
            frame = segments_to_frame(segments)
            visible_frame = frame.copy()
            if show_only_needs_review:
                visible_frame = visible_frame[
                    (visible_frame["참여자"] == "참여자 미확인")
                    | (visible_frame["질문/주제"] == "질문 미확인")
                ]
                if visible_frame.empty:
                    st.success("참여자나 질문/주제가 비어 있는 행이 없습니다.")
                    visible_frame = frame.copy()

            edited_frame = st.data_editor(
                visible_frame,
                key=f"segment_editor_{st.session_state.segment_editor_version}",
                use_container_width=True,
                hide_index=True,
                disabled=["원문 단위"],
                column_config={
                    "id": None,
                    "출처 파일": None,
                    "원문 위치": None,
                    "원문 단위": st.column_config.NumberColumn("번호", width="small"),
                    "참여자": st.column_config.TextColumn("참여자", help="예: P1, P2, 진행자"),
                    "질문/주제": st.column_config.TextColumn("질문/주제", width="medium"),
                    "원문 내용": st.column_config.TextColumn("원문 내용", width="large"),
                    "분석 포함": st.column_config.CheckboxColumn("분석 포함", help="체크 해제하면 AI 분석에서 제외됩니다."),
                },
            )
            if show_only_needs_review:
                merged_frame = frame.copy()
                for _, edited_row in edited_frame.iterrows():
                    row_id = str(edited_row["id"])
                    target_index = merged_frame.index[merged_frame["id"].astype(str) == row_id]
                    if len(target_index):
                        merged_frame.loc[target_index[0], edited_frame.columns] = edited_row
                save_target_frame = merged_frame
            else:
                save_target_frame = edited_frame

            with st.expander("출처와 원문 위치 보기", expanded=False):
                source_frame = frame[["원문 단위", "참여자", "질문/주제", "출처 파일", "원문 위치"]]
                st.dataframe(source_frame, use_container_width=True, hide_index=True)

            if st.button("수정 내용 저장하고 다시 분석", use_container_width=True):
                updated_segments = frame_to_segments(save_target_frame, segments)
                save_segments(project_slug, updated_segments)
                save_structure_review_status(project_slug, True)
                if analyze_with_groq_or_show_error(updated_segments):
                    st.success("수정 내용을 반영해 Groq로 인사이트를 다시 만들었습니다.")

        st.info("왼쪽 메뉴에서 'AI 분석'을 선택하면 방금 만든 키워드, 반복 주제, 인사이트 초안을 볼 수 있습니다.")

    st.divider()
    render_project_context()


def render_analysis_workspace() -> None:
    render_page_header(
        "인터뷰 인사이트 요약",
        "정리된 인터뷰 자료에서 핵심 발견, 반복 주제, 근거 발화를 한 화면에서 확인합니다.",
        "AI 분석",
    )

    project_slug = require_project()
    if not project_slug:
        return

    segments = load_segments(project_slug)
    review_complete = load_structure_review_status(project_slug)
    included_segments = [segment for segment in segments if segment.include_in_analysis]

    col1, col2, col3 = st.columns(3)
    col1.metric("분석 대상 원문", len(included_segments))
    col2.metric("참여자", len({segment.participant for segment in included_segments}))
    col3.metric("자료 정리", "완료" if segments else "대기")

    if not segments:
        st.markdown(
            """
            <div class="primary-panel">
              <h3>아직 분석할 인터뷰 자료가 없습니다</h3>
              <p>왼쪽 메뉴에서 '인터뷰 정리'를 선택한 뒤 속기 텍스트를 붙여넣으면, 키워드와 인사이트 초안이 자동으로 생성됩니다.</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
        return

    if not review_complete:
        save_structure_review_status(project_slug, True)

    result = load_analysis_result(project_slug)
    if st.button("분석 다시 실행" if result else "AI 분석 시작", type="primary"):
        if analyze_with_groq_or_show_error(segments):
            st.success("Groq로 키워드/주제 요약과 인사이트 초안을 생성했습니다.")
            result = load_analysis_result(project_slug)

    if not result:
        st.info("아직 분석 결과가 없습니다. 위 버튼을 눌러 키워드와 인사이트 초안을 생성하세요.")
        return

    segment_by_id = {segment.id: segment for segment in segments}

    st.divider()
    left_col, right_col = st.columns([2, 1], gap="large")

    with left_col:
        if result.insights:
            top_insight = result.insights[0]
            st.markdown(
                f"""
                <div class="next-action">
                  <h3>가장 중요한 발견</h3>
                  <p>{top_insight.title}</p>
                  <small style="opacity:0.75;font-size:13px">AI가 신뢰도 기준으로 상위에 놓은 인사이트입니다. 아래에서 전체 목록을 확인하세요.</small>
                </div>
                """,
                unsafe_allow_html=True,
            )

        st.subheader("핵심 인사이트")
        if result.insights:
            for insight in result.insights[:5]:
                tag, variant = _insight_confidence_tag(insight.confidence)
                render_insight_card(insight.title, insight.summary, tag, variant)
                with st.expander("↳ 상세 해석 / 권장 조치"):
                    col_a, col_b = st.columns(2)
                    with col_a:
                        st.caption("해석")
                        st.write(insight.interpretation or insight.summary)
                        st.caption("왜 중요한가")
                        st.write(insight.why_it_matters or "-")
                    with col_b:
                        st.caption("제품 함의")
                        st.write(insight.product_implication or "-")
                        st.caption("권장 조치")
                        st.write(insight.recommendation)
        else:
            st.info("아직 인사이트 초안이 없습니다.")

        st.subheader("상세 근거")
        rendered_quote_ids: set[str] = set()
        for insight in result.insights[:4]:
            for segment_id in insight.evidence_segment_ids[:2]:
                if segment_id in rendered_quote_ids:
                    continue
                segment = segment_by_id.get(segment_id)
                if not segment:
                    continue
                rendered_quote_ids.add(segment_id)
                render_quote_card(
                    segment.participant,
                    segment.question_or_topic,
                    truncate_text(segment.content, 260),
                    truncate_text(insight.recommendation, 140),
                )

        with st.expander("주제별 메모 묶음 보기", expanded=False):
            for topic in result.topics:
                st.markdown(f"#### {topic.topic_name} · 원문 {len(topic.segment_ids)}개")
                st.write(topic.summary)
                for segment_id in topic.segment_ids[:4]:
                    segment = segment_by_id.get(segment_id)
                    if segment:
                        st.caption(f"{segment.participant} · {segment.question_or_topic}")
                        st.write(truncate_text(segment.content, 220))

    with right_col:
        st.markdown(
            f"""
            <div class="side-panel">
              <h3>참여자 개요</h3>
              <div class="topic-row"><span>총 원문 단위</span><strong>{len(included_segments)}</strong></div>
              <div class="topic-row"><span>식별된 참여자</span><strong>{len({segment.participant for segment in included_segments if segment.participant != '참여자 미확인'})}명</strong></div>
              <div class="topic-row"><span>반복 주제</span><strong>{len(result.topics)}개</strong></div>
              <div class="topic-row"><span>인사이트 초안</span><strong>{len(result.insights)}개</strong></div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown('<div class="side-panel"><h3>주요 키워드</h3>', unsafe_allow_html=True)
        keyword_html = "".join(
            f'<span class="keyword-pill">{item.get("keyword")} · {item.get("count")}</span>'
            for item in result.keywords[:12]
        )
        st.markdown(keyword_html or "<p>키워드가 없습니다.</p>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown('<div class="side-panel"><h3>반복 주제</h3>', unsafe_allow_html=True)
        topic_rows = "".join(
            f'<div class="topic-row"><span>{topic.topic_name}</span><strong>{len(topic.segment_ids)}건</strong></div>'
            for topic in result.topics[:8]
        )
        st.markdown(topic_rows or "<p>반복 주제가 없습니다.</p>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown(
            """
            <div class="side-panel">
              <h3>분석 정보</h3>
              <div class="topic-row"><span>분석 방식</span><strong>Groq LLM 분석</strong></div>
              <div class="topic-row"><span>검수 상태</span><strong>초안</strong></div>
              <div class="topic-row"><span>다음 단계</span><strong>인사이트 검수</strong></div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.divider()
    render_affinity_diagram(result, segment_by_id)


def render_placeholder_page(title: str, subtitle: str, description: str, eyebrow: str) -> None:
    render_page_header(title, subtitle, eyebrow)
    render_project_context()
    st.markdown(
        f"""
        <div class="table-shell">
          <div class="section-header">
            <h3 class="section-title">작업 상태</h3>
            <span class="status-pill">다음 구현 단계</span>
          </div>
          <div class="empty-line">{description}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def main() -> None:
    apply_app_style()
    init_session_state()

    _slug = st.session_state.current_project_slug
    _has_project = _slug is not None
    _has_segments = False
    _has_analysis = False
    if _has_project:
        _segs = load_segments(_slug)
        _has_segments = bool(_segs)
        if _has_segments:
            _has_analysis = load_analysis_result(_slug) is not None

    page = render_sidebar({"project": _has_project, "segments": _has_segments, "analysis": _has_analysis})

    if page == "project_setup":
        render_project_setup()
    elif page == "data_intake":
        render_data_intake()
    elif page == "analysis_workspace":
        render_analysis_workspace()
    elif page == "insight_review":
        render_placeholder_page(
            "인사이트 검수",
            "AI가 만든 초안을 리서처가 수정, 승인, 제외하는 공간입니다.",
            "다음 단계에서 승인/제외/수정 상태와 근거 확인 패널을 구현합니다.",
            "사람 검수",
        )
    elif page == "report_builder":
        render_placeholder_page(
            "보고서 작성",
            "승인된 인사이트만 사용해 실무형 UX 리서치 보고서 초안을 만듭니다.",
            "다음 단계에서 마크다운 보고서 초안 생성과 섹션별 편집을 구현합니다.",
            "보고서 작성",
        )
    elif page == "export":
        render_placeholder_page(
            "내보내기",
            "보고서와 분석 스냅샷을 사내에서 공유 가능한 파일로 저장합니다.",
            "다음 단계에서 report.md와 project_snapshot.json 다운로드를 구현합니다.",
            "내보내기",
        )
    elif page == "settings":
        render_placeholder_page(
            "설정",
            "Groq API, 회사 LLM API, 저장 위치를 관리합니다.",
            "현재 로컬 개발은 .env의 Groq API 키를 사용하고, 사내 환경에서는 회사 전용 LLM 연결로 교체합니다.",
            "설정",
        )


if __name__ == "__main__":
    main()
