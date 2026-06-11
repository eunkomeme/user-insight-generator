# AGENTS.md — UX Research AI Workbench

이 파일은 AI 코딩 에이전트가 프로젝트를 파악하고 작업을 이어받기 위한 컨텍스트 문서다.
작업 전 반드시 이 파일 전체를 읽고 시작하라.

---

## 1. 프로젝트 요약

UX 리서처가 인터뷰 속기, 관찰 메모, 사용성 평가 CSV를 한곳에서 분석하고,
AI가 도출한 인사이트를 검수한 뒤 Markdown 보고서를 만드는 웹앱.

- PRD 전문: `docs/PRD.md`
- 기능 스펙: `docs/FEATURE_SPEC.md`
- 기술 설계: `docs/TECHNICAL_APPROACH.md`

---

## 2. 스택

| 레이어 | 기술 |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.11+) |
| LLM (개발) | Groq API / OpenRouter |
| LLM (운영 예정) | 사내 API — provider 교체 구조로 대응 |
| Storage | 로컬 파일시스템 (`projects/` 디렉토리) |
| 차트 | Recharts |

---

## 3. 로컬 실행

```bash
# 백엔드 (프로젝트 루트에서)
pip install -r requirements.txt
uvicorn backend.main:app --reload

# 프론트엔드
cd frontend
npm install
npm run dev
```

환경변수는 프로젝트 루트의 `.env`에 설정:

```env
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
OPENROUTER_API_KEY=...
```

---

## 4. 디렉토리 구조

```text
backend/
  main.py              # FastAPI 엔드포인트
core/
  analysis/
    groq.py            # LLM 분석 (Groq / OpenRouter provider)
    qualitative.py     # 현재 분석 결과 데이터 모델 (변경 예정)
    storage.py         # 분석 세션 저장/불러오기
    __init__.py
  intake/
    models.py          # Segment 데이터 모델
    parsers.py         # txt/md 파싱
    storage.py         # 입력 파일 저장
    __init__.py
  storage/
    projects.py        # 프로젝트 메타데이터 CRUD
    __init__.py
  config.py            # 환경변수 읽기
frontend/
  app/
    page.tsx           # 메인 페이지
    workbench.tsx      # 워크벤치 컴포넌트
  components/          # UI 컴포넌트
  lib/                 # API 클라이언트 등 유틸
projects/              # 프로젝트 데이터 (gitignore됨)
docs/
  PRD.md
  FEATURE_SPEC.md
  TECHNICAL_APPROACH.md
```

---

## 5. 프로젝트 데이터 저장 구조

```text
projects/
  {project_slug}/
    metadata.json          # 프로젝트 메타데이터
    inputs/                # 업로드된 원본 파일
    analysis/
      sessions/            # 분석 세션 파일 (타임스탬프 기반)
    reports/               # 보고서 초안
```

---

## 6. 현재 구현 상태

### 완료

- 프로젝트 메타데이터 생성/저장 (`core/storage/projects.py`)
- txt/md 파일 파싱 → Segment 분리 (`core/intake/parsers.py`)
- Groq/OpenRouter LLM 분석 파이프라인 (`core/analysis/groq.py`)
- 분석 세션 저장 및 이전 세션 메모리 주입 (`core/analysis/storage.py`)
- FastAPI 엔드포인트: `/api/analyze`, `/api/parse`, `/api/analyze-upload`
- Next.js 기본 UI

### 미완성 — 우선순위 순

1. **분석 출력 스키마 교체** (최우선)
   - 현재: `keywords / topics / insights` 구조
   - 목표: `type / severity / frequency / supporting_quotes / status` 구조
   - 변경 대상: `core/analysis/qualitative.py`, `core/analysis/groq.py` 프롬프트
   - 스펙: `docs/FEATURE_SPEC.md` Section 3, `docs/TECHNICAL_APPROACH.md` Section 7

2. **CSV/XLSX 입력 + LLM 컬럼 해석**
   - pandas/openpyxl로 파일 읽기
   - LLM이 헤더와 샘플 행을 보고 컬럼 의미 추론
   - 리서처가 해석 결과 확인/수정 후 분석 실행
   - 컬럼명 고정 스펙 없음 — LLM이 유연하게 해석

3. **Human Review 워크플로우**
   - 인사이트 상태: `draft → approved / rejected / merged`
   - `approved` 상태만 보고서에 포함
   - 프론트엔드 인사이트 카드 UI + 백엔드 상태 저장 API

4. **Markdown 보고서 생성 및 export**
   - 승인된 인사이트 기반 보고서 초안 생성
   - 섹션: 리서치 개요 → 주요 발견 → 인사이트 → 개선 제안
   - Markdown 파일 다운로드

---

## 7. 코딩 컨벤션

### Python (백엔드/코어)

- `from __future__ import annotations` 모든 파일 상단에
- 타입 힌트 필수 (`list[str]`, `dict[str, Any]` 등 PEP 604 스타일)
- dataclass 사용 (`@dataclass`, `field(default_factory=...)`)
- 환경변수는 반드시 `core/config.py`를 통해서만 읽는다
- 외부 API 호출은 `core/analysis/groq.py` 패턴 참고
- 한국어 에러 메시지 허용 (기존 코드 패턴 유지)

### TypeScript (프론트엔드)

- App Router 방식 (`app/` 디렉토리)
- `fetch`로 백엔드 API 호출 (`http://localhost:8000`)
- Tailwind CSS만 사용 (별도 CSS 파일 최소화)

### 공통

- 새 파일보다 기존 파일 수정 우선
- 불필요한 주석, docstring 추가 금지
- 사용하지 않는 코드는 삭제 (주석 처리 금지)

---

## 8. 하지 말아야 할 것

- `projects/` 디렉토리 안의 실제 데이터 커밋 금지
- API key를 코드에 직접 작성 금지
- LLM 프롬프트에 원문 데이터 전체를 그대로 넣지 않음 (chunking 처리 필수)
- Streamlit 의존성 추가 금지 (v1은 Next.js + FastAPI)
- PostgreSQL, Redis, SQLite 등 DB 도입 금지 (파일시스템만 사용)
- PDF/DOCX 파싱 구현 금지 (v2 후보)
- 외부 인터넷 검색 기능 구현 금지

---

## 9. LLM Provider 교체 구조

현재는 Groq/OpenRouter만 구현되어 있다.
사내 LLM(Gauss) 연동은 나중에 추가한다.
추가 시 `core/analysis/groq.py`의 provider 패턴을 참고해 새 모듈만 추가하면 된다.
기존 코드를 수정하는 방식이 아닌 새 provider 클래스/함수를 추가하고
`core/config.py`의 환경변수로 선택하는 방식으로 구현한다.
