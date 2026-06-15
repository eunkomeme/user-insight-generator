# Feature Specification

## 1. Projects

### Purpose

리서치 프로젝트의 기본 맥락과 소스 라이브러리를 묶는다.

### User Actions

- 프로젝트 생성, 선택, 삭제
- 프로젝트명, 리서치 목적, 대상 제품/기능, 참여자 수, 태스크, 평가 기준 입력

### Backend

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{slug}`
- `DELETE /api/projects/{slug}`

### Storage

```text
projects/{slug}/
  metadata.json
  inputs/sources/{source_id}/
  analysis/sessions/
  reports/
```

## 2. Source Intake

### Supported Inputs

- TXT, MD, Markdown
- CSV
- XLSX
- 직접 입력 텍스트

### Text Parsing

- 참여자 라벨, 질문/주제 헤딩, 문단을 기준으로 세그먼트를 만든다.
- 진행자 발화는 기본적으로 분석 근거에서 제외한다.

### CSV/XLSX Parsing

- pandas/openpyxl로 파일을 읽는다.
- 컬럼명은 고정하지 않는다.
- 백엔드가 다음 역할을 휴리스틱으로 감지한다:
  - 참여자
  - 태스크/주제
  - 성공 여부
  - 점수/척도
  - 오류 수
  - 관찰 메모
  - 발화/응답
- 각 행은 Markdown 관찰 노트 세그먼트로 변환된다.
- 매칭되지 않은 컬럼도 `추가 데이터` 섹션에 포함한다.
- numeric summary는 분석 synthesis prompt에 전달한다.

### Failure States

- 빈 파일
- 읽을 수 없는 CSV/XLSX
- 분석 가능한 행이 없는 표 파일
- 지원하지 않는 확장자

## 3. Source Library

### Purpose

프로젝트 안에서 여러 원자료를 저장하고 개별 분석할 수 있게 한다.

### Source Status

- `대기중`
- `분석중`
- `분석완료`
- `오류`

### Backend

- `GET /api/projects/{slug}/sources`
- `POST /api/projects/{slug}/sources`
- `DELETE /api/projects/{slug}/sources/{source_id}`
- `POST /api/projects/{slug}/sources/{source_id}/analyze`

## 4. AI Analysis

### Inputs

- 분석 대상 세그먼트
- 프로젝트 맥락: 리서치 목적, 태스크, 평가 기준
- 최근 분석 세션 memory context
- 표 데이터 numeric summary

### Pipeline

1. 분석 대상 세그먼트만 필터링
2. chunk 단위 1차 관찰 추출
3. synthesis 단계에서 최종 인사이트 생성
4. 결과 정규화와 근거 세그먼트 검증
5. 세션 파일 저장

### Output Schema

```json
{
  "insights": [
    {
      "id": "insight_001",
      "type": "usability_issue",
      "title": "구조적 결론",
      "summary": "맥락과 반복 패턴",
      "severity": "높음",
      "frequency": "보통",
      "confidence": "높음",
      "related_tasks": ["태스크"],
      "related_participants": ["P1"],
      "supporting_quotes": [
        {
          "quote": "근거 일부",
          "participant": "P1",
          "source_id": "seg_0001"
        }
      ],
      "recommendation": "구체적 개선 제안",
      "status": "draft"
    }
  ],
  "participant_mentions": { "P1": 1 },
  "relationships": []
}
```

### Guardrails

- 근거 없는 결론을 만들지 않는다.
- `supporting_quotes.source_id`는 입력 세그먼트 id만 허용한다.
- LLM의 잘못된 type/level/status는 백엔드에서 안전한 기본값으로 정규화한다.

## 5. Review & Artifacts

### Insight Review

프론트는 LLM 결과에 `findingStatus`와 `riskFlags`를 부여한다.

- 근거가 없으면 `needs_attention + weak_evidence`
- confidence가 낮으면 `needs_attention + overgeneralized`
- 그 외는 `auto_included`

`hidden`이 아닌 인사이트가 보고서에 포함된다.

### Affinity Board

- 백엔드 topic 결과에 의존하지 않는다.
- 인사이트별 supporting quote 세그먼트를 컬럼으로 보여준다.
- 사용자가 세그먼트를 다른 인사이트 영역으로 이동하면 affinity override를 저장한다.

### Insight Map

- `relationships`가 있으면 그래프로 표시한다.
- 관계가 없으면 인사이트 노드만 표시한다.

## 6. Chat

### Purpose

선택한 소스의 세그먼트에만 근거해 질문에 답한다.

### Backend

- `POST /api/projects/{slug}/chat`

### Rules

- 선택된 소스의 세그먼트만 prompt에 포함한다.
- 근거가 된 세그먼트는 citations에 반환한다.
- 자료에서 확인할 수 없는 내용은 확인할 수 없다고 답한다.

## 7. Report Markdown

### Purpose

검토된 인사이트와 세그먼트를 Markdown 보고서 초안으로 변환한다.

### Backend

- `POST /api/report/markdown`

### Inputs

- 프로젝트명
- 자료명/자료 유형
- 세그먼트 수/참가자 정보
- hidden이 아닌 인사이트
- 근거 세그먼트 목록

### Sections

- Executive Summary
- 리서치 개요
- 방법
- 주요 발견
- 인사이트 유형
- 개선 제안
- Appendix

## 8. LLM Provider

### Current

- Groq: 기본 개발 provider
- OpenRouter: Groq 429 rate-limit fallback

### Preserved For Operation

- Gauss 모듈: `core/analysis/gauss.py`
- Gauss 안내문서: 로컬 전용으로 유지하며 GitHub 업로드 대상에서 제외

Gauss는 아직 기본 라우팅에 연결하지 않는다. 운영 전환 시 환경변수 기반 provider 선택을 추가한다.
