# CXI Studio IA & UX Flow

기준: 현재 Next.js 3패널 워크벤치 구현

## 1. Information Architecture

```text
CXI Studio
├── TopBar
│   ├── 현재 프로젝트 메뉴
│   ├── 자동 저장 상태
│   ├── 보고서 반영 인사이트 수
│   ├── 임시 저장 삭제
│   └── Markdown 보고서 다운로드
├── SourcesPanel (left)
│   ├── 소스 추가 버튼
│   ├── 소스 체크박스 목록
│   ├── 소스별 상태: 대기중 / 분석중 / 분석완료 / 오류
│   ├── 개별 분석 실행
│   └── 소스 삭제
├── ChatPanel (center)
│   ├── 선택한 소스 기반 질문 입력
│   ├── 답변 메시지
│   └── citation 목록
├── StudioPanel (right)
│   ├── 인사이트
│   ├── 어피니티 다이어그램
│   ├── 인사이트 맵
│   └── 리포트
└── ArtifactModal
    ├── FindingsWorkspace
    ├── AffinityBoard
    ├── InsightGraph
    └── ReportPanel
```

## 2. Primary Flow

```text
앱 진입
  └─ GET /api/projects

프로젝트 선택 또는 생성
  ├─ GET /api/projects/{slug}
  └─ POST /api/projects

소스 추가
  ├─ 파일 업로드: POST /api/projects/{slug}/sources
  │   ├─ TXT/MD → 텍스트 세그먼트
  │   └─ CSV/XLSX → 행별 Markdown 관찰 노트 세그먼트
  └─ 텍스트 직접 분석: POST /api/parse + POST /api/analyze

소스 분석
  └─ POST /api/projects/{slug}/sources/{source_id}/analyze
      ├─ 최근 분석 세션 memory context 주입
      ├─ chunk 분석
      ├─ synthesis
      └─ analysis.json 저장 및 소스 상태 갱신

검토와 산출물
  ├─ 인사이트 모달에서 자동 반영/주의/숨김 상태 조정
  ├─ 어피니티 모달에서 인사이트별 근거 세그먼트 확인 및 이동
  ├─ 인사이트 맵에서 relationship 확인
  └─ 리포트 모달에서 Markdown 다운로드
      └─ POST /api/report/markdown
```

## 3. State Model

### DraftState

브라우저 LocalStorage 키: `cxi-studio:draft:v1`

| 상태 | 설명 |
| --- | --- |
| `activeProjectSlug` | 현재 프로젝트 |
| `projectName` | 화면의 프로젝트명 |
| `recognition` | 자료 인식 결과 |
| `result` | 최근 분석 결과 |
| `reviewedInsights` | 프론트 검토 상태가 붙은 인사이트 |
| `segmentTopicOverrides` | 어피니티 보드에서 수동 이동한 세그먼트 매핑 |

### Insight Review State

백엔드 LLM 결과의 `status`는 `draft`로 유지한다. 프론트는 별도 `findingStatus`를 부여한다.

| 값 | 의미 | 보고서 포함 |
| --- | --- | --- |
| `auto_included` | 근거가 있고 confidence가 낮지 않음 | 포함 |
| `needs_attention` | 근거 부족 또는 낮은 confidence | 포함, 검토 권장 |
| `pinned` | 리서처가 고정 | 포함 |
| `edited` | 리서처가 수정 | 포함 |
| `hidden` | 리서처가 숨김 | 제외 |

자동 할당:

```text
supporting_quotes.length === 0  -> needs_attention + weak_evidence
confidence === "낮음"           -> needs_attention + overgeneralized
그 외                           -> auto_included
```

## 4. API Mapping

| 동작 | API |
| --- | --- |
| 헬스 체크 | `GET /health` |
| 프로젝트 목록 | `GET /api/projects` |
| 프로젝트 생성 | `POST /api/projects` |
| 프로젝트 조회 | `GET /api/projects/{slug}` |
| 프로젝트 삭제 | `DELETE /api/projects/{slug}` |
| 소스 목록 | `GET /api/projects/{slug}/sources` |
| 소스 업로드/인식 | `POST /api/projects/{slug}/sources` |
| 소스 삭제 | `DELETE /api/projects/{slug}/sources/{source_id}` |
| 소스 분석 | `POST /api/projects/{slug}/sources/{source_id}/analyze` |
| 소스 어피니티 저장 | `POST /api/projects/{slug}/sources/{source_id}/affinity` |
| 선택 소스 채팅 | `POST /api/projects/{slug}/chat` |
| 직접 텍스트 인식 | `POST /api/parse` |
| 직접 파일 인식 | `POST /api/parse-upload` |
| 직접 텍스트 분석 | `POST /api/analyze` |
| 직접 파일 분석 | `POST /api/analyze-upload` |
| 보고서 Markdown 생성 | `POST /api/report/markdown` |

## 5. Empty, Loading, Error States

- 소스가 없으면 ChatPanel은 질문 입력을 비활성화한다.
- 분석 중에는 SourcesPanel에 단계 텍스트를 표시한다.
- 분석 실패 시 소스 상태는 `오류`로 바뀌고 에러 배너를 표시한다.
- 보고서 Markdown API가 실패하면 다운로드 버튼은 비활성화되고 에러 메시지를 표시한다.

## 6. Current UX Principles

- 첫 화면은 마케팅 페이지가 아니라 실제 워크벤치다.
- 소스 추가, 질문, 산출물 확인을 한 화면에서 반복할 수 있어야 한다.
- CSV/XLSX는 별도 컬럼 매핑 화면 없이 백엔드 정규화로 처리한다.
- 보고서는 승인 게이트 없이 자동 생성되며, 사용자는 숨김 처리로 제외한다.
