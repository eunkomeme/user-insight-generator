# UX Research AI Workbench PRD

## 1. Product Summary

UX Research AI Workbench는 리서처가 인터뷰 속기, 관찰 메모, 사용성 평가 점수 CSV를 한곳에서 분석하고, AI가 도출한 인사이트 초안을 검수한 뒤 실무형 UX 리서치 보고서를 만드는 도구다.

v1은 Next.js + FastAPI 기반 웹앱으로 구현한다. 개인 개발 환경에서는 Groq API로 구조를 검증하고, 회사 환경에서는 사내 LLM API(Gauss)로 교체한다. 데이터는 로컬 파일시스템에 저장하며, 사내 배포 시 저장 경로만 변경한다.

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
- 모든 AI 인사이트에 원문 근거(인용 발화 또는 데이터 출처)를 연결한다.
- 리서처가 AI 결과를 승인하기 전까지 최종 보고서에 반영하지 않는다.
- 개발 환경(Groq)과 운영 환경(사내 LLM)을 provider 교체만으로 전환할 수 있는 구조를 갖는다.

## 5. Non-Goals

v1에서는 다음을 구현 대상으로 보지 않는다.

- PDF/DOCX 자동 파싱
- 음성 녹음 업로드 및 STT 전사
- 실시간 협업 댓글
- SSO, 조직 권한관리, 감사로그
- PostgreSQL 또는 사내 저장소 직접 연동
- affinity map 중심의 대형 드래그 시각화 도구
- 외부 인터넷 기반 레퍼런스 추천

## 6. MVP Scope

### 6.1 Input

| 유형 | 형식 | 설명 |
| --- | --- | --- |
| 인터뷰 속기 | txt, md, 텍스트 직접 입력 | 참여자 발화 원문 |
| 관찰 메모 | txt, md, 텍스트 직접 입력 | 평가자 관찰 기록 |
| 자유 메모 | 텍스트 직접 입력 | 담당자 의견, 추가 맥락 |
| UT 정량 데이터 | CSV, XLSX | LLM이 컬럼 의미를 해석 |

CSV/XLSX는 평가마다 컬럼 구성이 다르므로 고정 스펙을 강제하지 않는다. 업로드 시 LLM이 헤더와 샘플 행을 보고 각 컬럼의 의미(참여자, 태스크, 성공 여부, 점수, 오류 수 등)를 추론하여 분석에 활용한다. 리서처는 LLM이 해석한 결과를 확인하고 필요 시 수정할 수 있다.

### 6.2 Analysis Output

AI 분석은 아래 구조로 결과를 반환한다.

| 필드 | 설명 |
| --- | --- |
| type | pain_point / usability_issue / positive_signal / task_friction |
| title | 한 줄 결론 (관찰 요약이 아닌 구조적 해석) |
| summary | 맥락과 반복 패턴 설명 (2-3문장) |
| severity | 높음 / 보통 / 낮음 |
| frequency | 발생 빈도 (참여자 수 기준) |
| confidence | 높음 / 보통 / 낮음 |
| supporting_quotes | 근거 발화 목록 (segment_id 포함) |
| related_participants | 관련 참여자 목록 |
| related_tasks | 관련 태스크 목록 |
| recommendation | 개선 방향 (대상, 맥락, 구체적 조치 포함) |
| status | draft / approved / rejected / merged |

### 6.3 Human Review

- 인사이트 내용 직접 수정
- 인사이트 승인(approved) 또는 제외(rejected)
- severity / frequency / confidence 조정
- 유사 이슈 병합(merged)
- 담당자 의견(free memo) 추가

승인(approved) 상태의 인사이트만 보고서 초안에 포함된다.

### 6.4 Report

- 승인된 인사이트 기반 보고서 초안 자동 생성
- 섹션 구성: 리서치 개요 → 주요 발견 → 인사이트 목록 → 개선 제안
- 섹션별 텍스트 편집
- Markdown export

## 7. Core User Journey

1. 리서처가 새 프로젝트를 만든다.
2. 리서치 목적, 대상 제품/기능, 참여자 수, 태스크 목록, 평가 기준을 입력한다.
3. 인터뷰 속기와 관찰 메모를 입력하거나 파일로 업로드한다.
4. 사용성 평가 CSV를 업로드하고 컬럼을 매핑한다.
5. AI 분석을 실행한다.
6. 리서처가 인사이트와 근거 발화를 검수하고 승인/제외한다.
7. 승인된 인사이트를 기반으로 보고서 초안을 생성한다.
8. 리서처가 보고서를 편집하고 Markdown으로 내보낸다.

## 8. Success Criteria

- 리서처가 한 프로젝트 안에서 텍스트 자료와 CSV 점수를 함께 볼 수 있다.
- AI가 생성한 각 인사이트에 근거 발화 또는 데이터 출처가 표시된다.
- 리서처가 AI 결과를 승인해야 보고서에 반영된다.
- 외부 인터넷 접근 없이 사내 LLM API만으로 동작할 수 있는 구조를 갖는다.
- 개발 환경에서는 Groq provider로 동일한 흐름을 검증할 수 있다.

## 9. Constraints

### Network

- 회사 환경에서는 외부 인터넷 접근이 차단될 수 있다.
- 운영 환경에서는 사내 LLM API(Gauss)만 호출한다.
- 개발 환경에서는 Groq 또는 OpenRouter를 사용한다.
- LLM provider는 환경변수로 교체 가능한 구조를 유지한다.

### Security

- 인터뷰 원문, 사용자 발화, 관찰 메모는 민감 데이터로 취급한다.
- API key는 코드에 저장하지 않는다 (.env 사용).
- 로그에 원문 데이터나 민감 발화를 남기지 않는다.
- 개발 환경에서는 실제 리서치 데이터를 사용하지 않는다.

### Storage

- v1은 로컬 파일시스템 기반 저장을 사용한다 (`projects/` 디렉토리).
- SQLite, PostgreSQL 등 DB는 v2에서 검토한다.
- 사내 배포 시 저장 경로를 환경변수로 교체한다.

## 10. Tech Stack

| 레이어 | 기술 |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python) |
| LLM (개발) | Groq API / OpenRouter |
| LLM (운영) | 사내 LLM API (Gauss) — provider 교체로 전환 |
| Storage | 로컬 파일시스템 (프로젝트 폴더 구조) |
| 차트 | Recharts |

## 11. v2 Candidates

- PDF/DOCX 파싱
- STT 전사 연동
- Postgres 또는 사내 DB 연동
- 내부 object storage 연동
- SSO와 권한관리
- 감사로그
- 협업 댓글
- 보고서 PDF/DOCX export
- affinity map / bubble view 고도화
- Gauss Agent-API 전환 검증
