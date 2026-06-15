# CXI Studio PRD

## 1. Product Summary

CXI Studio는 UX 리서처가 인터뷰 속기, 관찰 메모, CSV/XLSX 사용성 평가 데이터를 한 프로젝트 안에서 관리하고, AI가 도출한 근거 기반 인사이트를 검토한 뒤 Markdown 보고서 초안으로 내보내는 웹앱이다.

v1은 Next.js + FastAPI 기반이며 데이터는 로컬 파일시스템의 `projects/` 아래에 저장한다. 개발 환경에서는 Groq를 기본 LLM provider로 사용하고, Groq rate-limit 시 OpenRouter fallback을 사용한다. Gauss 연동 후보 모듈은 보존되어 있으며 운영 환경 전환 후보로 관리한다. Gauss 안내문서는 내부 검증용 로컬 문서로 유지하고 GitHub 업로드 대상에서는 제외한다.

## 2. Problem

UX 리서치 결과는 여러 형태로 흩어진다.

- 인터뷰 속기와 관찰 메모는 긴 비정형 텍스트로 남는다.
- 사용성 평가 결과는 CSV/XLSX의 태스크 성공 여부, 점수, 오류 수, 관찰 메모로 남는다.
- 리서처는 자료를 다시 읽고, 반복 패턴을 묶고, 근거를 추적하고, 보고서 문장으로 바꿔야 한다.
- 단순 군집화 도구만으로는 소스 관리, 근거 확인, 채팅 질문, 보고서 export까지 이어지는 워크플로우를 다루기 어렵다.

CXI Studio는 클러스터링 자체보다 "원자료를 근거 추적 가능한 인사이트와 보고서 초안으로 바꾸는 시간"을 줄이는 데 초점을 둔다.

## 3. Target Users

### Primary

UX 리서처

- 프로젝트별 원자료를 모으고 분석한다.
- AI 인사이트의 근거와 품질을 검토한다.
- 불필요한 인사이트를 숨기고 필요한 내용을 보고서로 내보낸다.

### Secondary

PM, 기획자, 디자이너

- 리서치 결론, 우선순위, 개선 제안을 읽는다.
- 필요 시 근거 발화와 원자료 맥락을 확인한다.

## 4. Goals

- TXT/MD/CSV/XLSX 자료를 한 소스 라이브러리에서 관리한다.
- CSV/XLSX는 행별 Markdown 관찰 노트로 정규화해 기존 분석 파이프라인과 동일하게 처리한다.
- 모든 AI 인사이트에 원문 근거(`supporting_quotes.source_id`)를 연결한다.
- 선택한 소스에만 근거해 Q&A를 제공한다.
- 숨김 처리하지 않은 인사이트로 Markdown 보고서 초안을 생성한다.
- LLM provider 교체가 가능한 구조를 유지한다.

## 5. Non-Goals

- PDF/DOCX 자동 파싱
- 음성 업로드 및 STT 전사
- 실시간 협업 댓글
- SSO, 조직 권한관리, 감사로그
- PostgreSQL, Redis, SQLite 등 DB 도입
- 외부 인터넷 기반 레퍼런스 추천
- 브라우저 내 대형 bubble clustering 전용 도구

## 6. MVP Scope

### Input

| 유형 | 형식 | 처리 방식 |
| --- | --- | --- |
| 인터뷰 속기 | TXT, MD, 직접 입력 | 발화/문단 세그먼트로 분리 |
| 관찰 메모 | TXT, MD, 직접 입력 | 문단/주제 기반 세그먼트로 분리 |
| UT 표 데이터 | CSV, XLSX | 행별 Markdown 관찰 노트로 변환 |

CSV/XLSX는 고정 컬럼 스펙을 강제하지 않는다. 백엔드가 참여자, 태스크, 성공 여부, 점수, 오류 수, 관찰 메모, 발화/응답 컬럼을 휴리스틱으로 감지하고, 매칭되지 않은 컬럼도 "추가 데이터"로 Markdown 세그먼트에 포함한다.

### Analysis Output

AI 분석 결과의 핵심 객체는 인사이트다.

| 필드 | 설명 |
| --- | --- |
| `type` | `pain_point`, `usability_issue`, `positive_signal`, `task_friction` |
| `title` | 관찰 요약이 아닌 구조적 한 줄 결론 |
| `summary` | 맥락과 반복 패턴 설명 |
| `severity` | 제품/과업 영향도: 높음, 보통, 낮음 |
| `frequency` | 참여자 또는 세그먼트 반복 빈도: 높음, 보통, 낮음 |
| `confidence` | 근거 강도: 높음, 보통, 낮음 |
| `supporting_quotes` | 근거 발화 또는 관찰 세그먼트 목록 |
| `related_participants` | 관련 참여자 |
| `related_tasks` | 관련 태스크/주제 |
| `recommendation` | 개선 대상, 맥락, 구체적 조치가 담긴 제안 |
| `status` | LLM 결과는 `draft`; 프론트 검토 상태는 별도 `findingStatus` |

### Human Review

AI 인사이트는 기본적으로 보고서에 반영된다. 리서처는 품질이 낮거나 불필요한 항목만 숨김 처리한다.

- `auto_included`: 근거가 있고 confidence가 낮지 않아 자동 반영
- `needs_attention`: 근거 부족 또는 낮은 confidence로 검토 권장
- `pinned`: 리서처가 중요 항목으로 고정
- `edited`: 리서처가 내용을 수정
- `hidden`: 보고서에서 제외

보고서에는 `hidden`이 아닌 인사이트를 포함한다.

### Report

- 백엔드 `POST /api/report/markdown`이 Markdown 본문을 생성한다.
- 섹션: Executive Summary, 리서치 개요, 방법, 주요 발견, 인사이트 유형, 개선 제안, Appendix
- 프론트는 생성된 Markdown을 다운로드한다.

## 7. Core User Journey

1. 리서처가 프로젝트를 만들거나 기존 프로젝트를 선택한다.
2. 왼쪽 출처 패널에서 TXT/MD/CSV/XLSX 파일을 추가하거나 텍스트를 붙여넣는다.
3. 업로드된 소스는 프로젝트 소스 라이브러리에 저장된다.
4. 소스 분석을 실행하면 세그먼트와 최근 분석 세션 memory context가 LLM에 전달된다.
5. 가운데 채팅 패널에서 선택한 소스에 근거해 질문할 수 있다.
6. 오른쪽 스튜디오 패널에서 인사이트, 어피니티, 인사이트 맵, 리포트를 모달로 연다.
7. 필요 없는 인사이트를 숨기고 Markdown 보고서를 다운로드한다.

## 8. Success Criteria

- CSV/XLSX 업로드가 컬럼 고정 스펙 없이 분석 가능한 세그먼트를 생성한다.
- 각 인사이트가 실제 세그먼트 id를 근거로 가진다.
- 소스 선택 기반 채팅이 자료 밖 내용을 추측하지 않는다.
- 보고서 다운로드가 백엔드 Markdown API를 통해 생성된다.
- Groq/OpenRouter 개발 흐름이 동작하고, Gauss 전환 후보 모듈은 보존된다.

## 9. Constraints

- 실제 리서치 데이터는 승인된 환경에서만 사용한다.
- API key는 `.env`에서만 읽고 코드에 저장하지 않는다.
- 원문 전체를 한 번에 LLM에 넣지 않고 chunking한다.
- v1 저장소는 파일시스템만 사용한다.
- `projects/` 런타임 데이터와 빌드 산출물은 커밋하지 않는다.

## 10. Tech Stack

| 레이어 | 기술 |
| --- | --- |
| Frontend | Next.js App Router, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python |
| LLM 개발 | Groq, OpenRouter fallback |
| LLM 운영 후보 | Gauss 모듈 보존, provider 선택 연결은 후속 작업 |
| Storage | 로컬 파일시스템 |
| Visualization | React components, `@xyflow/react` |

## 11. v2 Candidates

- Gauss provider 라우팅을 환경변수로 연결
- 보고서 편집/저장 API
- PDF/DOCX export
- 사내 object storage 또는 DB 연동
- SSO와 권한관리
- 협업 댓글과 감사로그
