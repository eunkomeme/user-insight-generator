# UX Research AI Workbench PRD

## 1. Product Summary

UX Research AI Workbench는 사내망에서 실행되는 리서치 자료 정리, 분석, 보고서 작성 도구다. 사용자는 인터뷰 속기, 관찰 메모, 자유 메모, 사용성 평가 점수 CSV를 입력하고, AI가 도출한 인사이트 초안을 검수한 뒤 실무형 UX 리서치 보고서를 만든다.

v1은 Streamlit 기반 내부 MVP로 만든다. 회사에서 Streamlit 실행 경험이 있고, GPT류 외부 웹사이트 접속과 외부 인터넷 접근이 제한될 가능성이 크기 때문이다. 제품형 Next.js/FastAPI 구조는 검증 이후 v2에서 검토한다.

## 2. Problem

UX 리서치 결과는 보통 여러 형태로 흩어진다.

- 인터뷰 속기와 관찰 메모는 비정형 텍스트로 남는다.
- 사용성 평가 결과는 점수척도, 태스크 성공 여부, 오류 수 같은 정량 데이터로 남는다.
- 리서처는 정성 자료와 정량 자료를 다시 읽고, 이슈를 묶고, 근거를 찾고, 보고서 문장으로 바꿔야 한다.
- affinitybubble.com 같은 도구는 인터뷰 내용을 군집화하는 데 유용하지만, 사용성 평가 점수, 관찰 메모, 태스크별 이슈, 보고서 작성까지 포괄하기에는 범위가 좁다.

이 제품은 클러스터링 자체가 아니라 "리서치 자료를 근거 기반 인사이트와 보고서로 전환하는 과정"을 줄이는 것을 목표로 한다.

## 3. Target Users

### Primary User

UX 리서처

- 리서치 자료를 수집하고 분석한다.
- AI가 만든 초안을 검수, 수정, 승인한다.
- 최종 보고서를 작성하고 공유한다.

### Secondary Users

PM, 기획자, 디자이너

- 리서치 보고서를 소비한다.
- 핵심 발견, 우선순위, 개선 제안을 확인한다.
- 필요 시 리서처가 정리한 근거를 따라간다.

## 4. Goals

- 텍스트 자료와 CSV 점수 데이터를 함께 분석한다.
- 모든 AI 인사이트에 원문 근거를 연결한다.
- 리서처가 AI 결과를 승인하기 전까지 최종 보고서에 반영하지 않는다.
- 사내망에서 실행 가능한 Streamlit MVP를 우선한다.
- 외부 LLM, 외부 SaaS, 외부 DB 의존성을 운영 기본값으로 두지 않는다.

## 5. Non-Goals

v1에서는 다음을 구현 대상으로 보지 않는다.

- PDF/DOCX 자동 파싱
- 음성 녹음 업로드 및 STT 전사
- 실시간 협업 댓글
- SSO, 조직 권한관리, 감사로그 완성형 구현
- PostgreSQL 또는 사내 저장소 직접 연동
- affinity map 중심의 대형 시각화 도구
- Next.js/FastAPI 기반 제품형 웹앱

## 6. MVP Scope

### Input

- 텍스트 입력 또는 텍스트 파일 업로드
  - 인터뷰 속기
  - 관찰 메모
  - 자유 메모
- CSV 업로드
  - participant
  - task
  - score
  - success
  - difficulty
  - satisfaction
  - error_count
  - note

### Analysis Output

- pain point
- usability issue
- positive signal
- task friction
- severity
- frequency
- confidence
- supporting quote
- related participant
- related task

### Human Review

- AI 인사이트 수정
- 인사이트 승인 또는 제외
- severity/frequency/confidence 조정
- 유사 이슈 병합

### Report

- 실무형 UX 리서치 보고서 초안 생성
- 섹션별 편집
- Markdown export 우선 지원
- PDF/DOCX export는 v1 이후 후보

## 7. Core User Journey

1. 리서처가 새 프로젝트를 만든다.
2. 리서치 목적, 제품/기능, 참여자, 태스크, 평가 기준을 입력한다.
3. 인터뷰 속기와 관찰 메모를 입력한다.
4. 사용성 평가 CSV를 업로드하고 컬럼을 매핑한다.
5. AI 분석을 실행한다.
6. 리서처가 인사이트와 근거를 검수한다.
7. 승인된 인사이트를 기반으로 보고서 초안을 생성한다.
8. 리서처가 보고서를 편집하고 Markdown으로 내보낸다.

## 8. Success Criteria

- 리서처가 한 프로젝트 안에서 텍스트 자료와 CSV 점수를 함께 볼 수 있다.
- AI가 생성한 각 인사이트에 근거 quote 또는 데이터 출처가 표시된다.
- 리서처가 AI 결과를 승인해야 보고서에 반영된다.
- 클러스터링 화면 없이도 핵심 업무 흐름이 완료된다.
- 외부 인터넷 접근 없이 회사 LLM API만으로 동작할 수 있는 구조를 갖는다.
- 집/개인 개발 환경에서는 더미 데이터 또는 Groq provider로 구조를 검증할 수 있다.

## 9. Constraints

### Network

- 회사 환경에서는 GPT류 외부 웹사이트 접속이 차단될 수 있다.
- 외부 인터넷 접근이 거의 차단될 가능성을 기본 전제로 둔다.
- 운영 환경에서는 회사 전용 LLM API만 호출한다.

### Security

- 인터뷰 원문, 사용자 발화, 관찰 메모는 민감 데이터로 취급한다.
- API key는 코드에 저장하지 않는다.
- 로그에 원문 데이터나 민감 quote를 남기지 않는다.
- 집/외부 개발 환경에서는 실제 리서치 데이터를 사용하지 않는다.

### Storage

- v1은 SQLite를 운영 기본값으로 두지 않는다.
- 초기 MVP는 프로젝트 폴더 기반 저장을 사용한다.
- 사내 정책상 허용된 내부 저장 위치에만 실제 데이터를 저장한다.

## 10. v2 Candidates

- PDF/DOCX 파싱
- STT 전사 연동
- Postgres 또는 사내 DB 연동
- 내부 object storage 연동
- SSO와 권한관리
- 감사로그
- 협업 댓글
- report PDF/DOCX export
- Next.js/FastAPI 제품형 전환
- affinity map 또는 bubble view 고도화
