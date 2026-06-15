# Screen Design

## 1. Design Direction

CXI Studio는 리서처가 반복적으로 쓰는 작업 도구다. 화면은 마케팅 페이지가 아니라 바로 작업 가능한 3패널 워크벤치로 시작한다.

- 조용하고 밀도 있는 사내 리서치 도구 톤
- 소스, 질문, 산출물을 한 화면에서 이동
- 카드 남용보다 패널, 리스트, 모달 중심
- 근거와 상태가 항상 보이도록 구성

## 2. Global Layout

```text
TopBar
Left: SourcesPanel
Center: ChatPanel
Right: StudioPanel
Overlay: UploadModal / ArtifactModal
```

### TopBar

- CXI Studio 브랜드
- 프로젝트 메뉴
- 자동 저장 상태
- 보고서 반영 인사이트 수
- 임시 저장 삭제
- Markdown 다운로드

### SourcesPanel

- 소스 추가 버튼
- 전체 선택/개별 선택
- 소스 카드: 자료 유형, 세그먼트 수, 참가자 수, 인사이트 수, 상태
- 액션: 분석, 삭제
- 접기 상태 지원

### ChatPanel

- 선택한 소스 수 표시
- 추천 질문 버튼
- grounded answer와 citations
- 소스가 없으면 입력 비활성화

### StudioPanel

- 인사이트
- 어피니티 다이어그램
- 인사이트 맵
- 리포트
- 분석 결과가 없으면 비활성화

## 3. Upload Modal

### File Mode

- TXT, MD, CSV, XLSX 파일 드롭/선택
- 파일 선택 즉시 프로젝트 생성이 필요하면 생성 후 소스 라이브러리에 저장
- 같은 파일로 분석 실행

### Text Mode

- 텍스트 직접 입력
- `POST /api/parse`와 `POST /api/analyze` 흐름 사용

### Loading

분석 단계 텍스트를 순환 표시한다.

## 4. Artifact Modal

### Insights

- 인사이트 목록과 상세 편집
- `findingStatus`: auto_included, needs_attention, pinned, edited, hidden
- risk flag: weak_evidence, overgeneralized, duplicate_candidate
- 숨김 처리된 인사이트는 보고서 제외

### Affinity

- 인사이트별 근거 세그먼트 컬럼
- 세그먼트 카드를 다른 인사이트 컬럼으로 drag & drop
- 이동 결과는 source affinity override로 저장

### Insight Map

- `@xyflow/react` 기반 그래프
- 인사이트 node와 relationship edge 표시

### Report

- 보고서 초안 preview
- Markdown 다운로드 버튼
- Markdown 본문은 `POST /api/report/markdown`에서 가져온다.

## 5. States

| 상황 | 표시 |
| --- | --- |
| 프로젝트 없음 | 현재 입력값으로 프로젝트 생성 가능 |
| 소스 없음 | SourcesPanel empty state, ChatPanel disabled |
| 분석중 | 소스 상태 `분석중`, 단계 텍스트 |
| 분석완료 | Studio artifact 버튼 활성화 |
| 분석오류 | 에러 배너, 소스 상태 `오류` |
| 보고서 준비중 | 다운로드 버튼 disabled, spinner |

## 6. Responsive Behavior

- desktop: 3패널 고정 레이아웃
- tablet/mobile: 패널이 세로로 쌓임
- 좌우 패널은 desktop에서 접기 가능
- 모달은 viewport 안에서 scroll 가능
