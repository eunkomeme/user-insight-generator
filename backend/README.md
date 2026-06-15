# Backend

```bash
python3 -m uvicorn backend.main:app --reload --port 8000
```

FastAPI는 루트 `.env`에서 `GROQ_API_KEY`, `GROQ_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_MODELS`를 읽습니다.

주요 API:

- `POST /api/parse`, `POST /api/parse-upload`: TXT/MD/CSV/XLSX를 세그먼트로 인식
- `POST /api/analyze`, `POST /api/analyze-upload`: 업로드 자료를 분석
- `GET/POST/DELETE /api/projects...`: 프로젝트와 소스 라이브러리 관리
- `POST /api/projects/{slug}/chat`: 선택한 소스에 근거한 Q&A
- `POST /api/report/markdown`: 검토된 인사이트와 세그먼트로 Markdown 보고서 생성

Groq가 기본 분석 provider입니다. Groq가 429 rate-limit을 반환하면 `OPENROUTER_API_KEY`가 있을 때 OpenRouter fallback을 사용합니다. Gauss 연동 모듈은 보존되어 있지만 기본 요청 라우팅에는 아직 연결하지 않았습니다.
