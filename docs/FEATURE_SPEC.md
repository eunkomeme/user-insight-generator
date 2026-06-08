# Feature Specification

## 1. Project Setup

### Purpose

리서치 프로젝트의 기본 맥락을 정의한다. 이후 AI 분석과 보고서 생성은 이 정보를 기준으로 해석된다.

### User Actions

- 새 프로젝트 생성
- 프로젝트 이름 입력
- 리서치 목적 입력
- 대상 제품 또는 기능 입력
- 참여자 수 입력
- 태스크 목록 입력
- 평가 기준 입력

### Inputs

- project_name
- research_goal
- product_or_feature
- participant_count
- tasks
- evaluation_criteria

### Outputs

- 프로젝트 폴더
- 프로젝트 메타데이터 JSON
- 이후 단계에서 사용할 session state

### Failure States

- 프로젝트 이름이 비어 있으면 생성 불가
- 프로젝트 이름에 파일 경로로 사용할 수 없는 문자가 있으면 정규화
- 같은 이름의 프로젝트가 있으면 덮어쓰기 전에 확인

## 2. Data Intake

### Purpose

리서치 자료를 입력하고 분석 가능한 구조로 정리한다.

### Text Data

지원하는 자료:

- 인터뷰 속기
- 관찰 메모
- 자유 메모

사용자 액션:

- 텍스트 직접 입력
- 텍스트 파일 업로드
- source type 선택
- participant 선택 또는 입력
- task 선택 또는 입력

출력:

- raw text
- metadata
- normalized text record

실패 상태:

- 텍스트가 비어 있으면 저장 불가
- participant/task가 없으면 unknown으로 저장 가능하되 경고 표시

### CSV Data

지원하는 자료:

- 사용성 평가 점수
- 태스크 성공 여부
- 만족도
- 난이도
- 오류 수
- 자유 메모

권장 컬럼:

- participant
- task
- score
- success
- difficulty
- satisfaction
- error_count
- note

사용자 액션:

- CSV 업로드
- 컬럼 미리보기
- 컬럼 매핑
- 분석에 사용할 컬럼 선택

출력:

- raw CSV file
- mapped CSV data
- numeric summary
- task/participant summary

실패 상태:

- CSV 파싱 실패
- 필수 컬럼 매핑 누락
- numeric으로 처리해야 하는 컬럼에 문자열만 있음
- 너무 큰 파일 업로드

## 3. AI Analysis

### Purpose

텍스트와 CSV를 결합해 리서치 인사이트 초안을 생성한다.

### Inputs

- project metadata
- text records
- mapped CSV data
- selected LLM provider

### Analysis Types

- pain point extraction
- usability issue extraction
- positive signal extraction
- task friction summary
- score summary
- evidence quote extraction
- severity/frequency/confidence suggestion

### Output Schema

각 인사이트는 다음 필드를 가진다.

- id
- title
- type
- summary
- severity
- frequency
- confidence
- related_tasks
- related_participants
- evidence
- source_ids
- status

status 값:

- draft
- approved
- rejected
- merged

### Failure States

- LLM provider 미설정
- 회사 LLM API 응답 실패
- 응답이 JSON으로 파싱되지 않음
- 입력 데이터가 너무 길어 분석 불가
- 근거 없는 결론이 생성됨

### Guardrails

- 인사이트는 반드시 evidence를 포함해야 한다.
- evidence 없는 인사이트는 low confidence로 표시한다.
- AI 결과는 기본적으로 draft 상태로 생성한다.
- draft 상태 인사이트는 보고서에 자동 반영하지 않는다.

## 4. Insight Review

### Purpose

리서처가 AI 결과를 검수하고 최종 보고서에 반영할 인사이트를 결정한다.

### User Actions

- 인사이트 제목 수정
- 요약 수정
- severity/frequency/confidence 수정
- evidence 확인
- 인사이트 승인
- 인사이트 제외
- 유사 인사이트 병합

### Outputs

- approved insights
- rejected insights
- edited insight history

### Failure States

- evidence가 없는 인사이트 승인 시 경고
- 병합 대상 인사이트가 서로 다른 source를 가질 경우 병합 전 확인

## 5. Report Builder

### Purpose

승인된 인사이트를 바탕으로 UX 리서치 보고서 초안을 생성한다.

### Inputs

- project metadata
- approved insights
- score summary
- evidence records

### Report Sections

- Executive Summary
- Research Background
- Method
- Key Findings
- Usability Issues
- Evidence
- Recommendations
- Appendix

### User Actions

- 전체 보고서 생성
- 섹션별 재생성
- 섹션별 직접 편집
- evidence 삽입 또는 제거
- Markdown export

### Failure States

- 승인된 인사이트가 없으면 보고서 생성 불가
- report section 생성 실패 시 해당 섹션만 재시도
- LLM 응답이 너무 일반적이면 근거 부족 경고 표시

## 6. Export

### v1 Export

- Markdown
- JSON snapshot

### v2 Export Candidates

- PDF
- DOCX
- 사내 문서 시스템 업로드

### Export Contents

- report markdown
- approved insights
- score summary
- evidence appendix
- generated timestamp

## 7. LLM Provider Settings

### Purpose

회사 환경과 개인 개발 환경에서 같은 앱 구조를 유지한다.

### Providers

- CompanyLLMProvider
- MockProvider
- GroqProvider

### Defaults

- company environment: CompanyLLMProvider
- local development: MockProvider
- optional external test: GroqProvider

### Security Rules

- API key는 환경변수에서 읽는다.
- UI에는 API key 전체를 표시하지 않는다.
- 회사 환경에서는 GroqProvider를 비활성화할 수 있어야 한다.
