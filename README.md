# UX Research AI Workbench

사내망에서 실행 가능한 UX 리서치 자료 정리, 분석, 보고서 작성용 워크벤치입니다.

현재는 Streamlit 프로토타입에서 Next.js 프론트엔드와 FastAPI 백엔드 구조로 전환하는 단계입니다. 사용자는 인터뷰 속기나 관찰 메모를 그대로 붙여넣고, 백엔드는 Groq API를 이용해 긴 자료를 청크 단위로 나누어 분석합니다. Groq 한도 초과 시 OpenRouter 키가 설정되어 있으면 `openrouter/free`로 자동 전환합니다.

## 현재 구현 범위

- Next.js 기반 한국어 인터뷰 분석 화면
- FastAPI 기반 `/api/analyze` 분석 API
- `.env`의 `GROQ_API_KEY`, `GROQ_MODEL` 사용
- Groq 429 한도 초과 시 OpenRouter fallback
- TXT/MD 형태 텍스트 파싱
- 긴 인터뷰 자료를 나눠서 Groq로 분석
- 핵심 결론, 인사이트 카드, 근거 발화, 어피니티 다이어그램 표시

## 실행 방법

백엔드:

```bash
pip install -r requirements.txt
python3 -m uvicorn backend.main:app --reload --port 8000
```

프론트엔드:

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 환경변수

루트의 `.env` 파일에 다음 값을 넣습니다.

```bash
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openrouter/free
OPENROUTER_MODELS=
ANALYSIS_CHUNK_SIZE=10
ANALYSIS_CHUNK_MAX_TOKENS=1000
ANALYSIS_SYNTHESIS_MAX_TOKENS=2800
ANALYSIS_PROMPT_MAX_SEGMENTS=45
ANALYSIS_PROMPT_SEGMENT_CHARS=420
ANALYSIS_CHUNK_SEGMENT_CHARS=260
```

기본값인 `openrouter/free`는 현재 사용 가능한 무료 모델 중 하나를 OpenRouter가 자동으로 선택합니다. 특정 모델을 직접 우선순위로 지정하고 싶을 때만 `OPENROUTER_MODELS`에 콤마로 구분해 입력합니다.

실제 회사 리서치 데이터는 사내에서 승인된 저장 위치와 승인된 LLM API에서만 사용하세요. 집이나 외부 개발 환경에서는 비식별화한 더미 데이터만 사용하는 것이 기본 원칙입니다.
