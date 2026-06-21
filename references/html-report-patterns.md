# HTML report patterns — a product-team working document

The report is a **working document**, not a research write-up. A PM, designer, developer, or
evaluator should open it and immediately know what to decide and fix — then be able to trace any
claim to evidence if they want. Lead with action; keep methodology and full evidence in the
appendix. Write in natural Korean that a product team actually uses.

Core principle:
> 방법론을 완벽히 설명하는 것보다, 제품팀이 바로 의사결정하고 개선 작업으로 옮길 수 있게 정리하는 것을
> 우선한다. 본문은 실행을 위한 문서이고, 부록은 근거 확인을 위한 영역이다.

## Hard constraints

- **One self-contained `.html` file.** All CSS inline; no external CDNs, fonts, images, or JS.
- **Opens offline**, renders by double-click, fully readable with JS disabled. Tiny vanilla JS for
  collapsible appendix sections is welcome.
- **Korean by default.** Headings, labels, narrative all Korean. Keep verbatim quotes in their
  original language; a clearly-marked Korean gloss may sit alongside.
- **Curated, not exhaustive.** When a companion `.xlsx` exists, show only headline numbers and point
  to the spreadsheet for the full tally.

## Default structure (the working-document spine)

Order matters: **분석 결과 → 실행 안건 → 근거**, not 분석 방법 → 결과 → 근거 → 실행.

1. **이번 테스트에서 확인된 결론 (Decision Summary)** — 3–5 bullets at the very top. What changed, what
   failed, what needs a product decision. No methodology, no "구성 이유" lecture here. This is the part
   that goes into a meeting agenda.
2. **우선 개선 이슈 (Priority Issues)** — ranked list. Rank by user impact × frequency × task
   criticality × evidence strength. Titles are plain and action-oriented.
3. **개선안 백로그 (Action Backlog)** — a table the team lifts straight into JIRA/PLM. Columns:
   우선순위 · 이슈 · 근거 · 제안 개선안 · 기대 효과 · 확인 방법. Never invent owners, dates, sprint
   labels, or business-impact numbers not in the data.
4. **이슈별 상세 카드 (Issue Detail Cards)** — one card per priority issue (see card format below).
5. **과제별 결과 요약 (Task Result Overview)** — simple task table: 성공 / 실패 / 머뭇거림 / 우회 경로.
   Keep it scannable; don't paste every raw note.
6. **근거 부록 (Evidence Appendix)** — participant-level evidence table, verbatim quotes, raw
   observations, metrics. This is where full traceability lives. Make it collapsible so it doesn't
   bury the action sections.
7. **추가 확인 필요사항 (Research Gaps)** — missing metrics, weak-evidence items, follow-up questions.

A short "이 보고서 보는 법 / 방법론" note may exist, but **at the bottom or in a collapsed box** — never
as the opening.

For **qualitative-only** material: same spine, with 주제(themes) and 사용자 니즈 standing in for issues,
and the appendix carrying the quote wall. For **thin** input: Decision Summary + Research Gaps only.

## Issue detail card format

Each card, in this order:

- **문제** — what users struggled with, in plain language.
- **근거** — participant IDs + task + verbatim quote or observed behavior (e.g., "P1: T4에서 변경 방법
  못 찾고 포기 / P2: 장바구니로 돌아갔다 재진입 / P5: 편집 링크가 작아 찾는 데 시간").
- **영향** — why it matters for the product experience (a hypothesis if not measured — label it so).
- **제안** — what to change, concretely (component, state, placement).
- **확인 방법** — how to validate the fix (e.g., 수정안에서 T4 재수행, 성공률·머뭇거림 비교).
- **근거 수준** — 강 / 중 / 약. (This is where confidence lives — not as repeated badges in the body.)

## Action backlog table

| 우선순위 | 이슈 | 근거 | 제안 개선안 | 기대 효과 | 확인 방법 |
|---|---|---|---|---|---|
| 1 | 할인 코드 입력란을 결제 화면에서 찾기 어려움 | 5명 중 4명 우회/실패 (P1·P2·P3·P4) | 장바구니 화면에 프로모 코드 입력란 노출 | 코드 미적용 결제·이탈 감소(가설) | 수정안에서 T2 재수행, 직접 적용률 확인 |

"기대 효과" stays a hypothesis unless the data measured it — never a fabricated percentage.

## Tone and language

- Natural Korean a product team speaks. Short, concrete sentences.
- No translation-ese, no consultant/academic phrasing.
- Swap jargon for plain language:

| 분석가/번역투 (피하기) | 실무형 (선호) |
| --- | --- |
| 진입점 부재 | 버튼/경로를 찾기 어려움 |
| 시각 어포던스 문제 | 눌러도 되는 버튼처럼 보이지 않음 |
| 마이크로 마찰 | 작은 헷갈림 |
| 방향성 신호 | 참고용 수치 |
| 확신도 | 근거 수준 |
| 단일 참가자 신호 | 1명 사례라 추가 확인 필요 |
| 권고 | 제안 / 해야 할 일 |
| 근거 기반 핵심 발견 | 우선 개선 이슈 |
| findability / recoverability 등 영어 용어 | 쉬운 우리말로 풀어서 |

Grounding is preserved through 근거 and 근거 수준 inside each issue — not by repeating "관찰/해석/권고"
labels throughout. State it once (e.g., a tiny legend in the appendix) if at all.

## Styling

- Clean, scannable, meeting-ready. System font stack, generous spacing, clear hierarchy.
- The top should read like a **decision dashboard**: summary bullets + a priority-issue list a reader
  can grasp in seconds. Use color to encode priority/근거 수준, not for decoration.
- Issue cards and the backlog table are the visual centerpiece. Evidence appendix collapsible.
- Anonymized participant labels (P1–Pn) everywhere; never invent identities.
- Accessible: real text (not text-in-images), sufficient contrast, sensible heading order.

## Self-check before finalizing

1. PM이 5분 안에 액션 아이템으로 옮길 수 있는가?
2. 디자이너가 무엇을 바꿔야 하는지 이해되는가?
3. 개발자가 어떤 플로우/화면 상태가 영향받는지 알 수 있는가?
4. 평가자가 주요 주장마다 근거로 되짚어갈 수 있는가?
5. 한국어가 번역투 없이 자연스러운가?

If any answer is "no", fix the report before shipping. Accuracy was never the problem — usefulness is
the bar here.

## Minimal skeleton (starting point — adapt freely)

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>사용성 테스트 결과 — 작업 문서</title>
<style>
  :root { --p1:#dc2626; --p2:#ea580c; --p3:#ca8a04; --ink:#1f2937; --line:#e5e7eb; }
  body { font-family: system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
         line-height:1.6; color:var(--ink); max-width:980px; margin:0 auto; padding:2rem; }
  .summary { background:#f8fafc; border:1px solid var(--line); border-radius:12px; padding:1.2rem 1.4rem; }
  .issue-card { border:1px solid var(--line); border-left:5px solid var(--p1); border-radius:10px;
                padding:1rem 1.2rem; margin:1rem 0; }
  table { border-collapse:collapse; width:100%; } th,td{ border:1px solid var(--line); padding:.5rem .6rem; text-align:left; }
  details.appendix { margin-top:2rem; } /* collapsible evidence */
</style>
</head>
<body>
  <h1>체크아웃 사용성 테스트 — 작업 문서</h1>
  <section class="summary"><h2>이번 테스트에서 확인된 결론</h2><ul><!-- 3–5 bullets --></ul></section>
  <h2>우선 개선 이슈</h2><!-- ranked list -->
  <h2>개선안 백로그</h2><!-- table -->
  <h2>이슈별 상세 카드</h2><!-- issue-card per issue -->
  <h2>과제별 결과 요약</h2><!-- simple task table -->
  <details class="appendix"><summary>근거 부록 (참가자별 근거·인용·원자료)</summary><!-- evidence --></details>
  <h2>추가 확인 필요사항</h2><!-- gaps -->
</body>
</html>
```

The skeleton is scaffolding to depart from, not a mold to copy identically.
