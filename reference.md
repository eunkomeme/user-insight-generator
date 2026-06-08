공주, 현재 레퍼런스는 크게 **4개 계열**로 나뉩니다. 공주가 만들려는 건 “사용자 리서치 인터뷰/UT 결과 요약 및 인사이트 도출 에이전트”이므로, 단순 회의록 요약툴보다 **리서치 원자료를 태깅·클러스터링·근거 인용·리포트화하는 툴**을 중심으로 봐야 합니다.

---

# 사용자 리서치/UT 요약 AI 서비스 레퍼런스 조사

## 1. 전체 시장 구조

| 유형               | 대표 서비스                                        | 핵심 역할                                 | 공주 서비스에 참고할 점             |
| ---------------- | --------------------------------------------- | ------------------------------------- | ------------------------- |
| 리서치 저장소 + AI 분석형 | Dovetail, Looppanel, Condens, Marvin, Notably | 인터뷰/UT 원자료 업로드, 전사, 태깅, 인사이트 도출, 리포트화 | 공주가 만들려는 서비스와 가장 직접적으로 유사 |
| UT 실행 + AI 리포트형  | Maze, UserTesting, Lyssna, Useberry           | 프로토타입/웹/앱 테스트 실행, 행동 데이터 수집, 자동 리포트   | UT 결과 요약 기능 설계 참고         |
| 리서치 운영 통합형       | Great Question, User Interviews 연계 플랫폼        | 리크루팅, 일정, 인터뷰, 분석, 저장소 통합             | 사내 리서치 운영까지 확장할 때 참고      |
| 행동분석 + AI 요약형    | Hotjar, Contentsquare 계열                      | 세션 리플레이, 히트맵, 설문 응답, AI 요약            | 정성 인터뷰 외 실제 사용 로그 결합 참고   |

---

## 2. 가장 직접적인 레퍼런스

### 1) Dovetail

**포지션**
Dovetail은 리서치 저장소와 고객 인사이트 플랫폼 성격이 강합니다. 공식 페이지에서도 “sales calls, support tickets, research” 같은 여러 고객 신호를 AI가 실행 가능한 답변으로 바꾼다고 설명합니다. 즉, 단순 인터뷰 요약툴이 아니라 **고객 데이터 통합 저장소 + AI 질의응답 + 인사이트 허브**에 가깝습니다. ([Dovetail][1])

**주요 기능 방향**

* 인터뷰/녹취/영상/노트 업로드
* 자동 전사
* 하이라이트 및 태깅
* 근거 발화 기반 인사이트 정리
* 리서치 저장소 검색
* 팀 단위 공유용 리포트

**공주 서비스에 참고할 점**
Dovetail의 핵심은 “요약”이 아니라 **근거 추적성**입니다. AI가 “사용자는 원격 제어를 불안해한다”라고 말하면, 바로 어떤 참가자의 어떤 발화에서 나온 결론인지 연결되어야 합니다. 사내 서비스에서도 `인사이트 → 근거 발화 → 원문 위치` 구조가 반드시 필요합니다.

---

### 2) Looppanel

**포지션**
Looppanel은 UX 리서치 분석과 저장소를 위한 AI 툴로, 공식 페이지에서 “qualitative research analysis”, “repository of insights”, “high quality transcripts”를 전면에 내세웁니다. ([Looppanel][2]) 별도 소개 페이지에서도 인터뷰 녹화, 전사, 노트 생성, 비디오 클립 생성, 리포트 요약 공유 기능이 언급됩니다. ([Insight Platforms][3])

**주요 기능 방향**

* Zoom/Meet 인터뷰 녹음 및 전사
* AI 노트 생성
* 자동 태깅
* 테마 추출
* 발화 기반 클립 생성
* 리포트 링크 공유

**공주 서비스에 참고할 점**
Looppanel은 **리서처가 빠르게 읽고 검토할 수 있는 분석 보조형 UI**에 가깝습니다. 공주가 만드는 에이전트도 단번에 “최종 인사이트”만 뱉기보다, 아래처럼 단계형으로 보여주는 게 좋습니다.

```text
1. 원문 정리
2. 주요 발화 추출
3. 임시 코드 생성
4. 코드 클러스터링
5. 테마 후보 도출
6. 인사이트 문장화
7. 근거 발화 연결
8. 리포트 초안 생성
```

---

### 3) Condens

**포지션**
Condens는 “customer insights in one place”를 내세우며, 고객 데이터 저장·분석·공유·확장을 돕는 정성 리서치 플랫폼입니다. ([Condens][4]) 2026년 5월에는 AI가 리서치 분석을 더 빠르게 만들지만 신뢰 문제는 남아 있다는 내용의 리포트도 발행했습니다. ([Condens][5])

**주요 기능 방향**

* 인터뷰, UT, 설문, 고객 피드백 통합 관리
* 코드/태그 기반 분석
* 인사이트 저장소
* 팀 공유
* AI 분석 보조

**공주 서비스에 참고할 점**
Condens류 툴에서 중요한 건 **AI 결과를 그대로 믿게 하는 것보다, 리서처가 검토·수정할 수 있게 하는 것**입니다. 사내툴도 “AI가 인사이트를 확정한다”보다 “AI가 1차 분석안을 만들고 리서처가 승인한다”는 워크플로우가 안전합니다.

---

### 4) Marvin / HeyMarvin

**포지션**
HeyMarvin은 “AI-native customer insights platform”으로, 흩어진 고객 지식을 하나의 검색 가능한 시스템에 모으고, AI-assisted research 및 패턴 분석을 제공한다고 설명합니다. ([HeyMarvin][6])

**주요 기능 방향**

* 고객/브랜드/시장 리서치 데이터 통합
* 질의응답형 검색
* AI-assisted interview
* 대량 데이터 패턴 분석
* 의사결정용 인사이트 산출

**공주 서비스에 참고할 점**
Marvin류에서 참고할 핵심은 **“한 번 분석하고 끝나는 도구”가 아니라 “계속 쌓이는 리서치 지식베이스”**라는 점입니다. 예를 들어 SmartThings 요리 제어 리서치가 쌓이면 나중에 이렇게 질문할 수 있어야 합니다.

```text
“요리 맥락에서 사용자가 앱 제어를 불신하는 이유를 최근 3개 리서치 기준으로 정리해줘.”
“오븐 예열 관련 불편이 2024년 대비 2025년에 어떻게 달라졌어?”
“가족 사용자와 1인 가구의 SmartThings 요리 루틴 니즈 차이를 비교해줘.”
```

---

### 5) Notably

**포지션**
Notably는 리서치 노트와 영상을 모으고, 참가자별 테이블/스티키노트/캔버스 방식으로 테마를 분석하는 플랫폼으로 소개됩니다. ([producthunt.com][7]) 과거 공개 자료에서는 GPT 기반 전사, 요약, 태그 제안, 인사이트 생성 기능도 언급됩니다. ([LinkedIn][8])

**주요 기능 방향**

* 원자료를 참가자 단위로 정리
* 스티키노트 기반 클러스터링
* 태그 추천
* 인사이트 생성
* 리서치 저장소 공유

**공주 서비스에 참고할 점**
Notably는 **어피니티 다이어그램식 사고방식**에 가깝습니다. 공주가 앞에서 말한 Affinity Bubble 같은 서비스와도 연결됩니다. 따라서 공주 서비스에는 “AI 요약 결과”뿐 아니라 **발화 카드 → 자동 그룹핑 → 테마명 추천 → 인사이트 후보** 흐름이 있으면 좋습니다.

---

## 3. UT 결과 요약 쪽 레퍼런스

### 1) Maze

**포지션**
Maze는 end-to-end user research platform으로, 리크루팅, 리서치 실행, 분석을 한 플랫폼에 모으는 방향입니다. 공식 페이지도 “Recruit / Research / Analyze” 흐름을 강조합니다. ([Maze][9]) Maze의 usability testing guide는 remote usability test, prototype test, live site/mobile test를 수행하고 리포트/히트맵 등으로 검증하는 도구군을 설명합니다. ([Maze][10])

**주요 기능 방향**

* 프로토타입 테스트
* 태스크 성공률
* 클릭/이탈/시간 데이터
* 설문 응답
* 리포트 자동화
* 히트맵/경로 분석

**공주 서비스에 참고할 점**
UT 결과 요약 에이전트라면 인터뷰 발화만 요약하면 부족합니다. UT는 반드시 아래 데이터를 같이 구조화해야 합니다.

```text
- Task ID
- 성공/실패 여부
- 실패 지점
- 소요 시간
- 망설임/되돌아감/오조작
- 참가자 발화
- 관찰자 메모
- 심각도
- 개선 우선순위
```

---

### 2) UserTesting

**포지션**
UserTesting은 대규모 참가자 네트워크와 human insight platform을 강점으로 내세우며, AI workflow와 연결해 아이디어 검증부터 런칭 전후까지 빠르게 검증하는 플랫폼입니다. ([UserTesting][11]) LinkedIn 소개에서도 AI-powered analysis와 participant network를 강조합니다. ([LinkedIn][12])

**주요 기능 방향**

* 원격 UT
* 영상 기반 사용자 피드백
* 참가자 패널
* AI 분석
* 하이라이트 릴
* 제품/컨셉 검증

**공주 서비스에 참고할 점**
UserTesting류에서 참고할 건 **이해관계자 설득용 증거물**입니다. 사내 리서치 요약 에이전트도 “요약 문장”만 주면 힘이 약합니다. 리포트에 바로 넣을 수 있는 형태로 만들어야 합니다.

```text
- 대표 발화 3개
- 실패 장면 요약
- 사용자 감정 변화
- 재현 가능한 문제 시나리오
- 개선안 우선순위
```

---

### 3) Lyssna

**포지션**
Lyssna는 usability testing, surveys, interviews, recruitment를 한 플랫폼에서 제공한다고 설명합니다. ([Lyssna][13]) Lyssna의 AI UX research 글에서는 AI가 전사, 감정 분석, 행동 추적, 설문 응답 분석, 리포팅을 가속할 수 있다고 설명합니다. ([Lyssna][14])

**공주 서비스에 참고할 점**
Lyssna류 서비스는 **가벼운 테스트 실행과 빠른 리포트**에 강합니다. 공주 서비스가 사내에서 쓰이려면 “전문 리서처만 쓰는 고급툴”보다, PM/기획자도 쓸 수 있는 **템플릿형 분석 모드**가 필요합니다.

예시:

```text
- Discovery Interview 요약
- Usability Test 요약
- FGI 요약
- VOC/리뷰 분석
- Concept Test 결과 요약
- Persona별 니즈 비교
```

---

### 4) Useberry

**포지션**
Useberry는 remote UX research platform이며, unmoderated usability testing, prototype testing, first click test, 5 second test, card sorting, survey 등을 제공합니다. ([Useberry][15])

**공주 서비스에 참고할 점**
Useberry는 인터뷰 분석보다는 **비대면 UT 방법론 템플릿** 참고용입니다. 공주 서비스가 UT 결과를 요약한다면 분석 입력값을 아래처럼 표준화하는 게 좋습니다.

```text
테스트 유형:
- First Click Test
- 5 Second Test
- Task-based UT
- Preference Test
- Card Sorting
- Tree Testing

분석 출력:
- 주요 실패 패턴
- 이해 안 된 용어
- 첫 클릭 오류
- 탐색 경로 이탈
- 기대와 실제 UI 불일치
```

---

### 5) Hotjar

**포지션**
Hotjar는 세션 리플레이, 히트맵, 설문, 퍼널 분석 중심의 행동분석 툴입니다. 공식 페이지에서는 real user journeys를 보고 버그, 혼란, 이탈을 찾고, one-click summary로 주요 순간을 요약할 수 있다고 설명합니다. ([Hotjar][16]) 또한 설문 응답 분석에서는 sentiment analysis, automated tags, automated summaries를 제공한다고 설명합니다. ([Hotjar 도움말][17])

**공주 서비스에 참고할 점**
Hotjar류는 정성 인터뷰와 실제 행동 데이터를 결합할 때 유용합니다. 예를 들어 SmartThings 앱 UT라면 사용자가 “헷갈렸다”고 말한 지점과 실제 세션에서 “뒤로가기/머뭇거림/반복 클릭”이 발생한 지점을 연결할 수 있습니다.

---

## 4. 리서치 운영 통합형 레퍼런스

### Great Question

**포지션**
Great Question은 UX research software로, 참가자 리크루팅, 스터디 실행, 분석을 하나의 흐름으로 묶는 플랫폼입니다. 공식 페이지에서는 “recruit participants, run studies, turn insights into product decisions”를 강조합니다. ([Great Question][18]) 2026년 비교 글에서도 participant CRM, recruitment, moderated interviews, unmoderated tests, surveys, card sorts, prototype tests, AI-powered analysis, AI research repository 등을 포함한다고 설명됩니다. ([Great Question][19])

**공주 서비스에 참고할 점**
지금 당장 공주가 만들려는 건 “요약/인사이트 에이전트”지만, 장기적으로는 아래까지 확장될 수 있습니다.

```text
1. 리서치 계획서 생성
2. 인터뷰 질문지 생성
3. 참가자 조건 정리
4. 인터뷰 원문 업로드
5. 자동 전사/요약
6. 인사이트 도출
7. 리포트/PPT 초안 생성
8. 과거 리서치와 비교
```

즉, 단순 요약툴이 아니라 **Research Ops + Analysis Agent**로 포지셔닝할 수 있습니다.

---

## 5. 공주가 만들 서비스 기준 핵심 벤치마킹 포인트

## A. 입력 데이터 구조

레퍼런스들을 보면 좋은 서비스는 입력을 그냥 “긴 텍스트”로만 받지 않습니다. 최소한 아래 구조가 필요합니다.

```text
프로젝트 정보
- 프로젝트명
- 리서치 목적
- 제품/서비스명
- 리서치 방법
- 참가자 수
- 참가자 세그먼트
- 핵심 가설

원자료
- 인터뷰 속기록
- UT 관찰 기록
- 참가자 발화
- 태스크 성공/실패
- 행동 로그
- 설문 응답
- 관찰자 메모

분석 조건
- 보고서 목적
- 독자
- 원하는 출력 형식
- 중요하게 볼 기준
- 제외할 정보
```

---

## B. 출력 결과 구조

공주 서비스는 최소 아래 산출물을 지원해야 합니다.

```text
1. 전체 요약
2. 참가자별 요약
3. 주요 Pain Point
4. 주요 Need
5. 주요 Quote
6. 행동 패턴
7. 세그먼트별 차이
8. UT 태스크별 실패 원인
9. 인사이트
10. 제품/UX 개선 기회
11. 우선순위
12. 리포트 초안
```

여기서 가장 중요한 건 **인사이트와 근거 발화가 분리되면 안 된다**는 점입니다.

좋은 출력 예시는 이렇게 가야 합니다.

```text
Insight
사용자는 SmartThings를 ‘원격 제어 앱’보다 ‘요리 과정의 상태를 확인하고 안심하는 도구’로 인식한다.

근거
- P1: “앱에는 예열 중이라고 뜨는데 진짜 켜졌나 싶어요.”
- P5: “제어보다 확인 쪽이 더 좋습니다.”
- P6: “저녁 준비 중에는 상태를 놓치지 않는 게 중요해요.”

Implication
요리 관련 UX에서는 원격 실행 기능보다 현재 상태, 예상 완료 시간, 위험 여부, 다음 행동 안내를 우선 설계해야 한다.
```

---

## C. 핵심 기능 모듈

공주가 설계할 때는 기능을 이렇게 나누면 됩니다.

| 모듈        | 기능      | 설명                                  |
| --------- | ------- | ----------------------------------- |
| Import    | 원자료 업로드 | txt, docx, csv, xlsx, 음성 전사본, UT 로그 |
| Clean-up  | 속기 정리   | 화자 분리, 중복 제거, 비문 보정, 개인정보 마스킹       |
| Summarize | 요약      | 전체/참가자별/질문별 요약                      |
| Code      | 코드 생성   | 발화 단위 태그 자동 생성                      |
| Cluster   | 클러스터링   | 유사 발화 묶기, 테마명 추천                    |
| Insight   | 인사이트 도출 | 현상 → 원인 → 기회 구조                     |
| Evidence  | 근거 연결   | 인사이트별 원문 quote 연결                   |
| Report    | 리포트 생성  | Markdown, PPT 초안, 표 형태 출력           |
| Search    | 지식 검색   | 과거 리서치 결과 질의응답                      |
| Compare   | 비교 분석   | 세그먼트/차수/제품별 차이 분석                   |

---

## 6. 레퍼런스별 벤치마킹 요약

| 서비스         | 벤치마킹 가치                          | 그대로 따라 하면 안 되는 점             |
| ----------- | -------------------------------- | ---------------------------- |
| Dovetail    | 근거 기반 인사이트 저장소, AI 검색, 리서치 지식베이스 | 기능이 무거워질 수 있음                |
| Looppanel   | 전사→노트→테마→리포트 흐름이 명확함             | 리서처 검토 UX 없으면 신뢰 떨어짐         |
| Condens     | 정성 분석 워크플로우와 팀 공유 구조             | AI 결과보다 사람의 해석 흐름이 중요        |
| Marvin      | 고객 지식베이스 + AI Q&A 방향             | 사내 보안/권한 구조 필수               |
| Notably     | 스티키노트/클러스터링/어피니티 분석 참고           | 시각화만 있고 논리 구조 약하면 안 됨        |
| Maze        | UT 태스크 결과 자동 리포트 참고              | 인터뷰 인사이트와 UT 지표를 분리하면 안 됨    |
| UserTesting | 영상/발화 기반 설득 자료 생성 참고             | 참가자 패널 중심 기능은 사내툴에 불필요할 수 있음 |
| Lyssna      | 가벼운 리서치 템플릿과 빠른 테스트 참고           | 고급 정성 분석에는 한계 가능             |
| Useberry    | UT 방법론 템플릿 참고                    | 요약/인사이트 에이전트와는 직접 유사도 낮음     |
| Hotjar      | 행동 로그 + AI 요약 참고                 | 리서치 인터뷰 분석툴은 아님              |

---

## 7. 공주 서비스의 차별화 방향

공주가 사내 보안 때문에 직접 만들려는 거라면, 해외 SaaS와 똑같이 만들 필요는 없습니다. 오히려 사내형으로는 아래 방향이 더 맞습니다.

## 핵심 포지셔닝

```text
사내 사용자 리서치/UT 원자료를 업로드하면,
AI가 요약, 코드화, 클러스터링, 인사이트, 근거 발화, 개선 기회, 보고서 초안을 생성하는
보안형 리서치 분석 에이전트
```

## MVP 기능 우선순위

| 우선순위 | 기능                           | 이유               |
| ---- | ---------------------------- | ---------------- |
| 1    | 속기록 업로드 후 전체 요약              | 가장 기본            |
| 2    | 참가자별 요약                      | 리서치 분석 필수        |
| 3    | Pain Point / Need / Quote 추출 | 보고서 활용도 높음       |
| 4    | 인사이트별 근거 발화 연결               | 신뢰성 핵심           |
| 5    | 어피니티 클러스터링                   | 리서처 업무시간 절감      |
| 6    | UT 태스크별 이슈 정리                | 사용성 평가 업무와 직접 연결 |
| 7    | 리포트/PPT용 문장 생성               | 실무 산출물 연결        |
| 8    | 과거 리서치 검색                    | 장기 확장            |

---

## 8. 공주가 바로 참고할 화면 구조

```text
[Project Dashboard]
- 프로젝트명
- 리서치 목적
- 방법론
- 참가자 수
- 분석 상태

[Raw Data]
- 원문 속기록
- 화자별 필터
- 질문별 필터
- 키워드 검색

[AI Summary]
- 전체 요약
- 질문별 요약
- 참가자별 요약

[Affinity Board]
- 자동 생성 코드
- 발화 카드
- 클러스터
- 테마명
- 리서처 수정 기능

[Insights]
- Insight statement
- Evidence quotes
- User segment
- Severity
- Opportunity
- Recommendation

[UT Analysis]
- Task별 성공/실패
- 실패 원인
- 관찰 발화
- 개선 우선순위

[Report Builder]
- Executive summary
- Key findings
- Pain points
- Opportunities
- Recommended actions
- Appendix quotes
```

---

## 결론

공주가 만들려는 서비스의 가장 가까운 레퍼런스는 **Dovetail + Looppanel + Notably** 조합입니다.

* **Dovetail**: 리서치 저장소와 근거 기반 인사이트 구조
* **Looppanel**: 전사/노트/요약/테마 추출 자동화
* **Notably**: 어피니티 보드와 클러스터링 UX
* **Maze/UserTesting**: UT 태스크 결과 리포트 구조
* **Hotjar**: 행동 데이터와 정성 피드백 결합 방식

사내 MVP는 “예쁜 리서치 플랫폼”보다 **속기록/UT 결과를 넣으면 근거 발화가 붙은 인사이트 리포트가 나오는 도구**로 시작하는 게 맞습니다. 핵심 경쟁력은 자동 요약이 아니라 **근거 추적 가능한 인사이트 도출**입니다.

[1]: https://dovetail.com/?utm_source=chatgpt.com "Dovetail | Customer Intelligence Platform"
[2]: https://www.looppanel.com/?utm_source=chatgpt.com "Looppanel | UX Research AI Analysis & Repository"
[3]: https://www.insightplatforms.com/platforms/looppanel/?utm_source=chatgpt.com "Looppanel"
[4]: https://condens.io/?utm_source=chatgpt.com "Condens"
[5]: https://condens.io/blog/ai-in-user-research-analysis-report/?utm_source=chatgpt.com "AI in User Research Analysis Report"
[6]: https://heymarvin.com/?utm_source=chatgpt.com "HeyMarvin | #1 AI-Native Customer Insights Platform"
[7]: https://www.producthunt.com/products/notably-2?utm_source=chatgpt.com "Notably: Collect, analyze, and share customer research"
[8]: https://www.linkedin.com/posts/notablyai_notably-ai-powered-insights-for-product-activity-7057422813040635904-gpTG?utm_source=chatgpt.com "Notably - AI-powered insights for product teams"
[9]: https://maze.co/?utm_source=chatgpt.com "Maze | User Research and Testing Platform"
[10]: https://maze.co/guides/usability-testing/tools/?utm_source=chatgpt.com "18 Best Usability Testing Tools: Features & Pricing"
[11]: https://www.usertesting.com/?utm_source=chatgpt.com "UserTesting Human Insight Platform | Customer Experience ..."
[12]: https://www.linkedin.com/company/usertesting-com?utm_source=chatgpt.com "UserTesting"
[13]: https://www.lyssna.com/?utm_source=chatgpt.com "Lyssna: User Research & Usability Testing Platform"
[14]: https://www.lyssna.com/blog/ai-ux-research/?utm_source=chatgpt.com "AI UX research"
[15]: https://www.useberry.com/?utm_source=chatgpt.com "Useberry: UX Research & Usability Testing Platform"
[16]: https://www.hotjar.com/?utm_source=chatgpt.com "Hotjar: Website Heatmaps & Behavior Analytics Tools"
[17]: https://help.hotjar.com/hc/en-us/articles/36820006275857-How-to-Analyze-Survey-Responses-with-AI?utm_source=chatgpt.com "How to Analyze Survey Responses with AI"
[18]: https://greatquestion.co/?utm_source=chatgpt.com "Great Question: UX Research Software & User Research ..."
[19]: https://greatquestion.co/blog/best-user-research-tools-in-2026-10-platforms-compared?utm_source=chatgpt.com "Best user research tools in 2026: 10 platforms compared"
