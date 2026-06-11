# Technical Approach

## 1. Architecture

```
Next.js (App Router)
  ↕ fetch → localhost:8000
FastAPI (Python)
  → core/intake        텍스트/CSV 파싱
  → core/analysis      LLM 분석 파이프라인
  → core/storage       프로젝트 파일시스템 저장
  → LLM provider
      GroqProvider      개발 환경 기본값
      OpenRouterProvider 폴백
      GaussProvider     운영 환경 (추후 추가)
```

## 2. Directory Structure

```
backend/
  main.py

core/
  analysis/
    groq.py            LLM 분석 (Groq / OpenRouter)
    qualitative.py     분석 결과 데이터 모델
    storage.py         세션 저장/불러오기
  intake/
    models.py          Segment 모델
    parsers.py         txt/md 파싱
    storage.py         입력 파일 저장
  storage/
    projects.py        프로젝트 메타데이터 CRUD
  config.py            환경변수

frontend/
  app/                 Next.js App Router
  components/
  lib/

projects/              런타임 데이터 (gitignore)
docs/
```

## 3. LLM Provider Interface

모든 LLM 호출은 provider 모듈을 통해 이루어진다.
환경변수로 provider를 선택한다.

현재 구현된 provider:
- Groq (`GROQ_API_KEY`)
- OpenRouter (`OPENROUTER_API_KEY`) — Groq rate limit 시 폴백

추후 추가할 provider:
- Gauss (`COMPANY_LLM_ENDPOINT`, `COMPANY_LLM_API_KEY`) — 운영 환경

provider 추가 시 `core/analysis/groq.py`의 `_chat_json` 패턴을 참고해
새 모듈을 추가하고 `core/config.py`에서 선택한다.

## 4. Storage Strategy

각 프로젝트는 `projects/{slug}/` 폴더에 저장된다.

```
projects/
  {slug}/
    metadata.json
    inputs/
    analysis/
      sessions/        타임스탬프 기반 분석 세션
    reports/
```

- SQLite/DB 없음 — 파일시스템만 사용
- 사내 배포 시 `PROJECTS_DIR` 환경변수로 경로 교체

## 5. Insight Schema

분석 결과 인사이트 객체 구조:

```json
{
  "id": "insight_001",
  "type": "usability_issue",
  "title": "태스크 완료 후 다음 액션이 불명확해 사용자가 멈춘다",
  "summary": "P1, P3, P4가 폼을 제출한 뒤 어디로 가야 할지 몰라 3-5초간 화면을 탐색했다.",
  "severity": "높음",
  "frequency": "보통",
  "confidence": "높음",
  "related_tasks": ["태스크 2"],
  "related_participants": ["P1", "P3", "P4"],
  "supporting_quotes": [
    {
      "quote": "제출하고 나서 뭘 눌러야 하는지 모르겠어요.",
      "participant": "P1",
      "source_id": "seg_0012"
    }
  ],
  "recommendation": "폼 제출 완료 시 명확한 다음 단계 CTA를 노출하고, 완료 상태와 이후 흐름을 분리해 표시한다.",
  "status": "draft"
}
```

status 흐름: `draft → approved / rejected / merged`
`approved` 상태만 보고서에 포함된다.

## 6. CSV 처리 방식

컬럼 스펙을 고정하지 않는다.
업로드 시 LLM이 헤더와 샘플 행을 보고 컬럼 의미를 추론한다.
리서처는 추론 결과를 확인하고 수정할 수 있다.

처리 순서:
1. pandas로 CSV/XLSX 읽기
2. 헤더 + 첫 3행 샘플을 LLM에 전달
3. LLM이 각 컬럼의 역할(participant, task, success 등)을 JSON으로 반환
4. 리서처 확인 후 분석 실행

## 7. Chunking

긴 인터뷰 원문은 segment 단위로 chunking해서 분석한다.
chunk 단위 1차 분석 → synthesis 단계로 최종 결과 통합.
프롬프트에 원문 전체를 넣지 않는다.

환경변수로 chunk 크기 조정 가능:
- `ANALYSIS_CHUNK_SIZE` (기본값: 10 segments)
- `ANALYSIS_CHUNK_MAX_TOKENS` (기본값: 1500)
- `ANALYSIS_SYNTHESIS_MAX_TOKENS` (기본값: 6000)

## 8. Session Memory

이전 분석 세션의 인사이트 제목을 synthesis 프롬프트에 주입한다.
같은 프로젝트의 반복 패턴을 LLM이 연결할 수 있도록 한다.
최근 3개 세션만 참고한다 (`core/analysis/storage.py`).
