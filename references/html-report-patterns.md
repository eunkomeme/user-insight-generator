# HTML report patterns — a product-team working document

The report is a **working document**, not a research write-up. A PM, designer, developer, or
evaluator should open it and immediately know what to decide and fix — then be able to trace any
claim to evidence if they want. Lead with action; keep methodology and full evidence in the
appendix. Write in natural Korean that a product team actually uses.

Core principle:
> 방법론을 완벽히 설명하는 것보다, 제품팀이 바로 의사결정하고 개선 작업으로 옮길 수 있게 정리하는 것을
> 우선한다. 본문은 실행을 위한 문서이고, 부록은 근거 확인을 위한 영역이다.

## Readability is part of being useful

A grounded report nobody can comfortably read fails the same way a fabricated one does — the reader
gives up before the evidence reaches them. So treat the *reading experience* as a first-class
requirement, not polish. Four habits below cause most of the trouble; the rest of this doc shows how
to avoid them. They're written as "do this because…" so you can adapt, not obey.

1. **One idea per line; let the layout do the separating.** Don't pack five participants, three
   quotes, and two caveats into one run-on sentence joined by `·`. When a reader has to parse a wall
   of inline text to find "who said what," the evidence stops landing. Give each piece of evidence
   its own row.
2. **Make label↔value read as two clean columns.** A `문제 / 근거 / 영향 / 제안` row should have the
   label in one column and the value in the next, with the value's second line staying aligned under
   its first — not wrapping back to the far-left margin under the label. Use a 2-column grid, not an
   inline-block label followed by inline text.
3. **Let color and emphasis carry one meaning at a time.** If priority is already encoded by a left
   border, you don't also need a colored rank circle *and* a colored pill *and* italics on the same
   line — that's visual noise competing for attention. Pick one signal per meaning. Reserve italics:
   Korean set in italic is genuinely harder to read, and long English quotes in italic worse still.
4. **Summary bullets are takeaways, not paragraphs.** Each Decision Summary bullet should be one
   scannable sentence that leads with the conclusion. If a bullet needs supporting detail, put it in
   a muted second clause or push it into the matching issue card — don't make the reader read a
   paragraph to extract the point.

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

A common mistake is to list every issue three times — once as a ranked priority list, again as a
backlog table, again as detail cards. That triples the length and the reader scrolls past the same
items repeatedly. **Say each thing once, in the place it's most useful:** the backlog table is the
one-glance summary, and the detail cards (which carry the rank) are where depth lives.

1. **이번 테스트에서 확인된 결론 (Decision Summary)** — 3–5 bullets at the very top, each a single
   takeaway sentence (see habit #4). What changed, what failed, what needs a product decision. No
   methodology, no "구성 이유" lecture here. This is the part that goes into a meeting agenda.
2. **개선안 백로그 (Action Backlog)** — the one-glance summary table the team lifts straight into
   JIRA/PLM, ranked by priority. This *is* the priority list — don't also add a separate ranked-issue
   section above it. Columns: 우선순위 · 이슈 · 근거(요약) · 제안 개선안 · 기대 효과 · 확인 방법.
   Keep cells short — one line each; the full evidence lives in the cards and appendix. Never invent
   owners, dates, sprint labels, or business-impact numbers not in the data.
3. **이슈별 상세 카드 (Issue Detail Cards)** — one card per issue, in priority order, each card
   showing its rank in the header (see card format below). This is the depth layer; the backlog row
   and the card are the same issue seen at two zoom levels, not two separate sections to maintain.
4. **과제별 결과 요약 (Task Result Overview)** — simple task table: 성공 / 실패 / 머뭇거림 / 우회 경로.
   Keep it scannable; don't paste every raw note. (Behavioral/task data only.)
5. **근거 부록 (Evidence Appendix)** — participant-level evidence table, verbatim quotes, raw
   observations, metrics. This is where full traceability lives. Make it collapsible so it doesn't
   bury the action sections.
6. **추가 확인 필요사항 (Research Gaps)** — missing metrics, weak-evidence items, follow-up questions.

A short "이 보고서 보는 법 / 방법론" note may exist, but **at the bottom or in a collapsed box** — never
as the opening.

For **qualitative-only** material: same spine, with 주제(themes) and 사용자 니즈 standing in for issues,
and the appendix carrying the quote wall. For **thin** input: Decision Summary + Research Gaps only.

## Issue detail card format

Each card carries its rank in the header, then these rows — each row a clean label↔value pair:

- **문제** — what users struggled with, in plain language. One or two sentences.
- **근거** — the evidence, **as a list with one source per line**, not a run-on. Each line: a
  participant chip (P1, P2…) + the task + the verbatim quote or observed behavior. This is the single
  most important readability fix — see the evidence-list pattern below.
- **영향** — why it matters for the product experience (a hypothesis if not measured — label it so).
- **제안** — what to change, concretely (component, state, placement).
- **확인 방법** — how to validate the fix (e.g., 수정안에서 T4 재수행, 성공률·머뭇거림 비교).
- **근거 수준** — 강 / 중 / 약, shown once (a small chip in the header is enough). This is where
  confidence lives — don't repeat it as badges throughout the body.

### Evidence-list pattern (the fix for run-on 근거)

Don't do this — it's a wall of text where who-said-what is lost:

```
근거: P1: 장바구니에서 먼저 찾다가 결제 화면에서 발견 · P3: 끝까지 못 찾고 코드 없이 결제 · P4: 스크롤
후 발견 · P2: "I almost missed it" · P5: "the promo code placement is weird"
```

Do this — one source per line, participant chip set off from the quote, quote upright (not italic):

```html
<ul class="evidence">
  <li><span class="pid">P3</span> T2 — 끝까지 못 찾고 코드 없이 결제(본인은 미적용 사실 모름)
      <span class="q">"I assumed there'd be a promo box right in the cart"</span></li>
  <li><span class="pid">P1</span> T2 — 장바구니에서 찾다가 결제 화면에서 뒤늦게 발견
      <span class="q">"where do I put the code... oh it's down here"</span></li>
  <li><span class="pid">P5</span> T2 — <span class="q">"the promo code placement is weird"</span></li>
</ul>
```

The reader now scans participants down the left edge and reads each quote on its own line. Keep
quotes verbatim and upright; a Korean gloss may follow in parentheses if a reader needs it.

## Action backlog table

| 우선순위 | 이슈 | 근거(요약) | 제안 개선안 | 기대 효과 | 확인 방법 |
|---|---|---|---|---|---|
| 1 | 할인 코드 입력란을 결제 화면에서 찾기 어려움 | 5명 중 4명 우회/실패 (P1·P2·P3·P4) | 장바구니 화면에 프로모 코드 입력란 노출 | 코드 미적용 결제·이탈 감소(가설) | 수정안에서 T2 재수행, 직접 적용률 확인 |

Keep each cell to one line — this table is the scannable summary, so the 근거 column is a *count +
participant IDs*, not the full quotes (those are in the card). "기대 효과" stays a hypothesis unless
the data measured it — never a fabricated percentage.

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

The goal is a calm, scannable, meeting-ready page. Concretely:

- **Color discipline — one meaning per signal.** Encode priority/근거 수준 with *one* device (a left
  border color on the card, or a single chip), not three overlapping ones. A rank number can sit in a
  neutral circle; it doesn't also need to be red just because the card border is. Use color to mean
  something, not to decorate.
- **No italics for quotes or Korean.** Set verbatim quotes upright in a lightly tinted block with a
  left border — that reads as "quote" without the legibility cost of italic. Keep body Korean upright
  throughout.
- **Clean label↔value rows.** Use a 2-column grid for card rows so values align (see skeleton).
  Generous vertical spacing between rows and cards; let the page breathe.
- **System font stack, clear heading hierarchy.** The top should read like a decision dashboard:
  summary bullets + the backlog table a reader grasps in seconds.
- Anonymized participant labels (P1–Pn) everywhere; never invent identities.
- Accessible: real text (not text-in-images), sufficient contrast, sensible heading order.

## Self-check before finalizing

1. PM이 5분 안에 액션 아이템으로 옮길 수 있는가?
2. 디자이너가 무엇을 바꿔야 하는지 이해되는가?
3. 개발자가 어떤 플로우/화면 상태가 영향받는지 알 수 있는가?
4. 평가자가 주요 주장마다 근거로 되짚어갈 수 있는가?
5. 한국어가 번역투 없이 자연스러운가?
6. 근거가 한 줄로 뭉치지 않고 한 사람=한 줄로 읽히는가? 카드의 라벨과 값이 두 칸으로 정렬되는가?
7. 같은 이슈를 여러 섹션에서 반복하지 않는가(백로그=요약, 카드=상세)?

If any answer is "no", fix the report before shipping. Accuracy was never the problem — usefulness is
the bar here, and readability is part of usefulness.

## Minimal skeleton (starting point — adapt freely)

This skeleton bakes in the four readability habits: grid card rows, an evidence list (not run-on
근거), upright tinted quotes, single-signal color, and the consolidated backlog→cards structure.

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>사용성 테스트 결과 — 작업 문서</title>
<style>
  :root{ --p1:#dc2626; --p2:#ea580c; --p3:#ca8a04; --p4:#64748b;
         --ink:#1f2937; --mut:#6b7280; --line:#e5e7eb; --bg:#f8fafc; }
  *{box-sizing:border-box;}
  body{ font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
        line-height:1.65; color:var(--ink); max-width:980px; margin:0 auto; padding:2rem 1.5rem 4rem; }
  h1{ font-size:1.6rem; margin:0 0 .3rem; }
  .sub{ color:var(--mut); margin:0 0 1.8rem; font-size:.95rem; }
  h2{ font-size:1.25rem; margin:2.6rem 0 .9rem; padding-bottom:.35rem; border-bottom:2px solid var(--line); }

  /* Decision summary: each <li> is one takeaway sentence, not a paragraph */
  .summary{ background:var(--bg); border:1px solid var(--line); border-radius:14px; padding:1.2rem 1.5rem; }
  .summary ul{ margin:.4rem 0 0; padding-left:1.2rem; }
  .summary li{ margin:.55rem 0; }
  .summary .detail{ color:var(--mut); }           /* optional muted supporting clause */

  table{ border-collapse:collapse; width:100%; font-size:.92rem; }
  th,td{ border:1px solid var(--line); padding:.55rem .65rem; text-align:left; vertical-align:top; }
  th{ background:var(--bg); }

  /* Issue card: rank lives here (no separate priority list). Color = ONE signal (left border). */
  .card{ border:1px solid var(--line); border-left:6px solid var(--p1); border-radius:12px;
         padding:1.1rem 1.3rem; margin:1.2rem 0; }
  .card.l2{border-left-color:var(--p2);} .card.l3{border-left-color:var(--p3);} .card.l4{border-left-color:var(--p4);}
  .card h3{ display:flex; align-items:center; gap:.5rem; margin:.1rem 0 .8rem; font-size:1.08rem; }
  .rank{ flex:0 0 auto; width:1.7rem; height:1.7rem; border-radius:8px; background:#eef2f7; color:#334155;
         font-weight:800; display:flex; align-items:center; justify-content:center; font-size:.9rem; }
  .lvl{ margin-left:auto; font-size:.74rem; font-weight:700; padding:.1rem .55rem; border-radius:999px;
        border:1px solid var(--line); color:var(--mut); }   /* 근거 수준, stated once */

  /* Clean label<->value rows: 2-column grid so the value's 2nd line stays aligned */
  .row{ display:grid; grid-template-columns:5rem 1fr; gap:.15rem .9rem; margin:.55rem 0; }
  .row .k{ font-weight:700; color:#374151; }

  /* Evidence list: one source per line, quote upright (not italic) */
  ul.evidence{ list-style:none; margin:.1rem 0 0; padding:0; }
  ul.evidence li{ margin:.4rem 0; padding-left:.1rem; }
  .pid{ display:inline-block; min-width:2.1rem; font-weight:700; color:#334155; }
  .q{ color:#475569; }                              /* upright; tint, not italic */
  .quote{ display:block; border-left:3px solid var(--line); background:#fafbfc;
          padding:.3rem .8rem; margin:.35rem 0; color:#475569; }  /* for longer quotes */

  .ok{color:#15803d;font-weight:600;} .bad{color:#b91c1c;font-weight:600;} .warn{color:#b45309;font-weight:600;}
  details.appendix{ margin-top:1.6rem; border:1px solid var(--line); border-radius:12px; background:var(--bg); }
  details.appendix>summary{ cursor:pointer; padding:.9rem 1.2rem; font-weight:700; }
  .note{ color:var(--mut); font-size:.86rem; }
</style>
</head>
<body>

<h1>체크아웃 사용성 테스트 — 작업 문서</h1>
<p class="sub">모더레이티드 · 참가자 5명(P1–P5) · 과제 4개 · 전체 수치는 동봉 <strong>aggregation.xlsx</strong></p>

<section class="summary">
  <h2 style="border:none;margin:.1rem 0 .5rem;padding:0;">이번 테스트에서 확인된 결론</h2>
  <ul>
    <li>마찰은 결제 단계에 몰려 있음 — 장바구니 담기(T1)는 5명 전원 문제없음.</li>
    <li>할인 코드 입력란 위치가 가장 큰 문제. <span class="detail">5명 중 4명이 헤매거나 실패, P3은 미적용 결제.</span></li>
    <li><strong>결정 필요:</strong> 할인 코드 입력란을 장바구니 화면으로 옮길지 먼저 정해야 함(가장 빠른 개선).</li>
  </ul>
</section>

<h2>개선안 백로그</h2>  <!-- 한눈 요약 = 우선순위 리스트 역할도 겸함 -->
<table>
  <thead><tr><th>순위</th><th>이슈</th><th>근거(요약)</th><th>제안</th><th>기대 효과(가설)</th><th>확인 방법</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>할인 코드 입력란을 결제 화면에서 찾기 어려움</td><td>5명 중 4명 우회/실패 (P1·P2·P3·P4)</td><td>장바구니에 프로모 코드 입력란 노출</td><td>미적용 결제·이탈 감소</td><td>T2 재수행, 직접 적용률 비교</td></tr>
  </tbody>
</table>
<p class="note">담당자·일정·매출 영향은 자료에 없어 비워둠. 트래커에 옮길 때 팀에서 채우세요.</p>

<h2>이슈별 상세 카드</h2>
<div class="card l1">
  <h3><span class="rank">1</span>할인 코드 입력란을 결제 화면에서 찾기 어려움<span class="lvl">근거 강</span></h3>
  <div class="row"><span class="k">문제</span><span>코드를 장바구니에서 넣으려는데 입력란이 결제 화면에 있어 잘 못 찾음.</span></div>
  <div class="row"><span class="k">근거</span>
    <ul class="evidence">
      <li><span class="pid">P3</span> T2 — 못 찾고 코드 없이 결제(미적용 사실 모름) <span class="q">"I assumed there'd be a promo box right in the cart"</span></li>
      <li><span class="pid">P1</span> T2 — 장바구니에서 찾다 결제 화면에서 뒤늦게 발견 <span class="q">"oh it's down here"</span></li>
      <li><span class="pid">P5</span> T2 — <span class="q">"the promo code placement is weird"</span></li>
    </ul>
  </div>
  <div class="row"><span class="k">영향</span><span>코드 미적용 결제는 불만·문의로 이어지고 프로모션 효과도 떨어질 수 있음(가설).</span></div>
  <div class="row"><span class="k">제안</span><span>장바구니 화면에 프로모 코드 입력란 노출. 결제 화면에도 유지하되 위치를 또렷이.</span></div>
  <div class="row"><span class="k">확인 방법</span><span>수정안에서 T2 재수행, 헤매지 않고 직접 적용한 비율 비교.</span></div>
</div>

<h2>과제별 결과 요약</h2>
<table><thead><tr><th>과제</th><th>설명</th><th>성공</th><th>실패</th><th>주요 양상</th></tr></thead>
  <tbody><tr><td>T2</td><td>할인 코드 적용</td><td class="ok">4</td><td class="bad">1</td><td>성공자도 다수 우회 · P3 미적용 결제</td></tr></tbody>
</table>

<details class="appendix"><summary>근거 부록 — 참가자별 원자료·인용·측정값</summary>
  <!-- participant table, verbatim quotes (upright), methodology note at bottom -->
</details>

<h2>추가 확인 필요사항</h2>
<ul><li>완료율·과제 소요 시간은 이번 메모에 수집되지 않음 — 다음 테스트에서 계측 권장.</li></ul>

</body>
</html>
```

The skeleton is scaffolding to depart from, not a mold to copy identically — but the four habits
(evidence list, grid rows, upright quotes, single-signal color) and the consolidated structure are
the point of it, so keep those even as you reshape the rest to fit the material.
