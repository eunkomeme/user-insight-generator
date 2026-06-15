# UX Research AI Workbench

사내망에서 실행 가능한 UX 리서치 자료 분석 워크벤치입니다. Next.js 프론트엔드와 FastAPI 백엔드로 구성되어 있으며, 인터뷰 속기, 관찰 메모, CSV/XLSX 사용성 평가 데이터를 소스 라이브러리에 저장하고 AI 인사이트, 근거 발화, 채팅 답변, Markdown 보고서 초안을 생성합니다.

## 현재 구현 범위

- 3패널 CXI Studio UI: 출처 패널, 근거 기반 채팅, 산출물 스튜디오
- 프로젝트/소스 라이브러리 파일시스템 저장 (`projects/`)
- TXT/MD 파싱과 CSV/XLSX 행별 Markdown 관찰 노트 변환
- Groq 기본 분석, OpenRouter rate-limit fallback
- 새 인사이트 스키마: `type`, `severity`, `frequency`, `supporting_quotes`, `status`
- 선택한 소스에만 근거하는 Q&A
- 인사이트/어피니티/인사이트 맵/보고서 모달
- 백엔드 Markdown 보고서 생성 API
- Gauss 연동 후보 모듈 보존: 운영 전환 후보, 기본 라우팅은 아직 Groq/OpenRouter

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

루트의 `.env` 파일에 다음 값을 설정합니다.

```bash
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openrouter/free
OPENROUTER_MODELS=
ANALYSIS_CHUNK_SIZE=10
ANALYSIS_CHUNK_MAX_TOKENS=1500
ANALYSIS_SYNTHESIS_MAX_TOKENS=6000
ANALYSIS_PROMPT_MAX_SEGMENTS=45
ANALYSIS_PROMPT_SEGMENT_CHARS=420
ANALYSIS_CHUNK_SEGMENT_CHARS=260
```

Gauss 안내문서는 내부 검증용 로컬 문서로 유지하며 GitHub 업로드 대상에서는 제외합니다. 코드 레벨 후보 모듈은 `core/analysis/gauss.py`에 보존되어 있습니다.

## 검증

```bash
python3 -m unittest discover -s tests -v
cd frontend && npm run build
```

실제 회사 리서치 데이터는 승인된 저장 위치와 승인된 LLM API에서만 사용하세요. 외부 개발 환경에서는 비식별화한 더미 데이터를 사용합니다.
