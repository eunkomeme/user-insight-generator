# Screen Design

## 1. Design Direction

v1 UI는 Streamlit 기반 내부 도구로 설계한다. 시각 스타일은 아직 확정하지 않지만, 기본 방향은 조용하고 밀도 있는 사내 리서치 대시보드다.

affinitybubble.com의 bubble/cluster 표현은 보조 참고로만 사용한다. 기본 화면은 리서처가 자료, 근거, 인사이트, 보고서를 안정적으로 검수할 수 있는 table, panel, matrix, outline 중심으로 구성한다.

## 2. Information Architecture

Streamlit sidebar navigation:

- Project Setup
- Data Intake
- Analysis Workspace
- Insight Review
- Report Builder
- Export
- Settings

각 화면은 하나의 프로젝트 context를 공유한다.

## 3. Project Setup

### Goal

리서치의 기본 맥락을 입력한다.

### Layout

- Header: 프로젝트 이름과 상태
- Main form
  - Project name
  - Research goal
  - Product or feature
  - Participant count
  - Tasks
  - Evaluation criteria
- Action area
  - Create project
  - Save project metadata

### Expected States

- Empty state: 아직 프로젝트가 없음
- Editing state: 필수 정보 입력 중
- Saved state: 다음 단계로 이동 가능

## 4. Data Intake

### Goal

텍스트 자료와 CSV 점수 자료를 입력하고 분석 가능한 형태로 정리한다.

### Layout

- Tabs
  - Text Notes
  - CSV Scores
  - Data Preview

### Text Notes Tab

Controls:

- Source type selectbox
- Participant input
- Task selectbox/input
- Text area
- Text file uploader
- Add record button

Main content:

- 입력된 자료 목록
- source, participant, task, length, created time 표시

### CSV Scores Tab

Controls:

- CSV uploader
- Column mapping selectboxes
- Validate mapping button

Main content:

- CSV preview table
- numeric column summary
- mapping status

### Data Preview Tab

Main content:

- text record count
- CSV row count
- participant coverage
- task coverage
- missing metadata warning

## 5. Analysis Workspace

### Goal

AI 분석 결과 초안을 확인한다.

### Layout

- Top controls
  - Provider selector
  - Run analysis button
  - Analysis status
- Summary metrics
  - total insights
  - usability issues
  - pain points
  - positive signals
  - low confidence items
- Main tabs
  - Issues
  - Evidence Matrix
  - Task Summary
  - Score Summary

### Issues Tab

Table columns:

- title
- type
- severity
- frequency
- confidence
- related task
- evidence count
- status

Row detail panel:

- summary
- supporting quote
- source information
- AI rationale

### Evidence Matrix Tab

Rows:

- insight

Columns:

- participant
- task
- source
- quote/note

Purpose:

- 리서처가 "AI가 왜 이 결론을 냈는지" 확인한다.

### Task Summary Tab

Cards or table:

- task name
- success trend
- friction summary
- related issues
- representative quote

### Score Summary Tab

Tables:

- task-level averages
- participant-level rows
- difficulty/satisfaction/error count distribution

Charts:

- Streamlit 기본 bar chart 또는 line chart
- 과한 시각화보다 해석 가능한 요약을 우선한다.

## 6. Insight Review

### Goal

AI가 만든 인사이트를 사람이 수정하고 승인한다.

### Layout

- Filter controls
  - status
  - type
  - severity
  - confidence
- Insight list
- Insight editor panel

### Insight Editor Fields

- title
- type
- summary
- severity
- frequency
- confidence
- related tasks
- related participants
- evidence
- status

### Actions

- Approve
- Reject
- Save edits
- Merge selected

### Review Rules

- evidence가 없는 인사이트는 승인 시 경고한다.
- approved 상태만 보고서 생성에 사용한다.
- rejected 상태는 삭제하지 않고 기록으로 남긴다.

## 7. Report Builder

### Goal

승인된 인사이트 기반으로 실무형 보고서 초안을 만든다.

### Layout

- Left panel
  - report outline
  - section status
- Main editor
  - selected section content
  - evidence references
- Action area
  - Generate full report
  - Regenerate section
  - Save edits

### Sections

- Executive Summary
- Research Background
- Method
- Key Findings
- Usability Issues
- Evidence
- Recommendations
- Appendix

### States

- No approved insights: 보고서 생성 불가 안내
- Draft generated: 편집 가능
- Section edited: 저장 필요 표시
- Export ready: Markdown 내보내기 가능

## 8. Export

### Goal

보고서와 분석 결과를 사내에서 공유 가능한 형태로 내보낸다.

### Layout

- Export options
  - Markdown report
  - JSON snapshot
- Preview
  - Markdown preview
- Download buttons

### v1 Output

- report.md
- project_snapshot.json

### v2 Candidate Output

- PDF
- DOCX
- 사내 문서 시스템 업로드

## 9. Settings

### Goal

LLM provider와 저장 위치를 설정한다.

### Layout

- Provider settings
  - Company LLM
  - Mock
  - Groq, local dev only
- Endpoint status
- Storage path
- Security notices

### Rules

- API key는 UI에 원문으로 표시하지 않는다.
- 회사 환경에서는 외부 provider를 비활성화할 수 있다.
- 저장 위치가 승인된 내부 경로인지 확인하도록 안내한다.
