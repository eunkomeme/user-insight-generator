# Technical Approach

## 1. Architecture

```text
Next.js App Router
  -> fetch http://localhost:8000
FastAPI
  -> core/intake      TXT/MD/CSV/XLSX 세그먼트화
  -> core/analysis    LLM chunk 분석, 채팅, 세션 저장
  -> core/storage     프로젝트 메타데이터와 파일시스템 경로
  -> projects/        런타임 데이터
```

## 2. Directory Structure

```text
backend/
  main.py              FastAPI endpoints

core/
  analysis/
    chat.py            선택 소스 기반 Q&A
    gauss.py           Gauss 연동 후보 모듈
    groq.py            Groq/OpenRouter 분석 파이프라인
    qualitative.py     분석 결과 dataclass
    storage.py         분석 세션 저장/불러오기
  intake/
    models.py          Segment 모델
    parsers.py         TXT/MD/CSV/XLSX 파서
    sources.py         프로젝트 소스 라이브러리 저장
  storage/
    projects.py        프로젝트 메타데이터 CRUD
  config.py            환경변수 접근
```

## 3. Storage

```text
projects/{project_slug}/
  metadata.json
  inputs/
    sources/{source_id}/
      metadata.json
      segments.json
      analysis.json
      affinity.json
      {uploaded_file}
  analysis/
    sessions/{timestamp}.json
  reports/
```

- DB는 사용하지 않는다.
- `projects/`는 gitignore 대상이다.
- 소스별 분석 결과는 `inputs/sources/{source_id}/analysis.json`에 저장한다.
- 프로젝트 전체 memory context는 `analysis/sessions/`의 최근 3개 세션에서 만든다.

## 4. Intake Pipeline

### TXT/MD

- heading, `Q`, `Topic`, participant label을 이용해 세그먼트 분리
- 진행자 발화는 `include_in_analysis=False`
- fallback은 문단 기반 세그먼트

### CSV/XLSX

- pandas/openpyxl로 frame을 읽는다.
- 컬럼명 휴리스틱으로 참여자/태스크/성공/점수/오류/메모/응답을 감지한다.
- 각 row를 Markdown 관찰 노트로 변환한다.
- 감지되지 않은 컬럼도 `추가 데이터`에 보존한다.
- numeric summary는 숫자로 변환 가능한 컬럼 전체에서 생성한다. 참여자/태스크/메모/응답 컬럼은 summary에서 제외한다.

## 5. Analysis Pipeline

1. `include_in_analysis` 세그먼트만 선택
2. `ANALYSIS_CHUNK_SIZE` 기준으로 chunk 분리
3. 각 chunk에서 observation과 notable quote JSON 생성
4. synthesis prompt에서 최종 insight JSON 생성
5. `_normalize_result`가 type, level, status, quote source id를 검증/보정
6. 소스 분석이면 source metadata와 `analysis.json` 갱신
7. 프로젝트 분석 세션 저장

주요 환경변수:

- `ANALYSIS_CHUNK_SIZE`
- `ANALYSIS_CHUNK_MAX_TOKENS`
- `ANALYSIS_SYNTHESIS_MAX_TOKENS`
- `ANALYSIS_PROMPT_MAX_SEGMENTS`
- `ANALYSIS_PROMPT_SEGMENT_CHARS`
- `ANALYSIS_CHUNK_SEGMENT_CHARS`

## 6. LLM Providers

현재 라우팅:

- Groq: 기본
- OpenRouter: Groq 429 fallback

보존된 운영 후보:

- `core/analysis/gauss.py`
- Gauss 안내문서는 로컬 전용으로 유지하며 GitHub 업로드 대상에서 제외한다.

Gauss는 아직 `/api/analyze` 라우팅에 연결하지 않는다. 연결 시 `core/config.py`의 Gauss 환경변수와 provider 선택 변수를 추가해 기존 Groq 코드를 직접 교체하지 않고 분기한다.

## 7. Report Markdown

`POST /api/report/markdown`은 프론트에서 전달한 검토 인사이트와 세그먼트를 Markdown으로 변환한다. LLM을 다시 호출하지 않는다.

보고서 섹션:

- Executive Summary
- 리서치 개요
- 방법
- 주요 발견
- 인사이트 유형
- 개선 제안
- Appendix

## 8. Frontend Integration

- `TopBar`: 프로젝트 선택, 저장 상태, 보고서 다운로드
- `SourcesPanel`: 소스 라이브러리와 개별 분석
- `ChatPanel`: 선택 소스 기반 Q&A
- `StudioPanel`: 산출물 모달 진입
- `ArtifactModal`: 인사이트, 어피니티, 그래프, 리포트 표시

프론트는 `analysis.topics`에 의존하지 않는다. 어피니티 보드는 인사이트의 `supporting_quotes.source_id`로 근거 세그먼트를 묶는다.

## 9. Verification

```bash
python3 -m unittest discover -s tests -v
cd frontend && npm run build
```

추가 smoke check:

- `backend.main` import
- CSV 파서 Markdown 세그먼트 생성
- `/api/report/markdown` helper Markdown 생성
