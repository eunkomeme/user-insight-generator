# Slide-deck patterns — an optional presentation format

This is a **third, opt-in** shape for deliverable #2 (the HTML report). Most requests still want the
default working-document HTML (`html-report-patterns.md`). Switch to the slide-deck format only when
the user's phrasing asks for a presentation, not a document — e.g. "슬라이드로 만들어줘", "발표용 덱으로",
"임원/스테이크홀더 보고용 프레젠테이션처럼", "한 장씩 넘기는 형태로", "킥오프 미팅에서 보여줄 거예요", or
the English equivalents ("make this a slide deck", "deck I can present"). Don't switch formats on your
own initiative just because the material is rich — ask only if genuinely ambiguous; otherwise default
to the working document.

The inspiration is [Slidev](https://github.com/slidevjs/slidev)'s slide vocabulary — cover slide,
section dividers, two-column/image-right layouts, a big "statement" slide for a single number or
quote, an end slide — **not** its tooling. Slidev is a Vite/Vue dev-server framework; nothing here
requires a build step, npm, or a browser plugin. Borrow the *shapes*, not the stack, and keep every
hard constraint from the working-document format (one self-contained `.html`, inline CSS, no
external deps, opens offline by double-click).

## When to use this vs. the working document

| Signal | Format |
| --- | --- |
| "보고서/문서/리포트로 만들어줘", no presentation context | Working document (default) |
| "슬라이드/덱/PPT처럼", "발표용으로", "회의에서 보여줄 거예요" | Slide deck |
| Both requested ("발표용 슬라이드랑 상세 리포트 둘 다") | Build both — they share content, not files |

The slide deck is **more curated than the working document, not less**. A working document can hold
a full backlog table and five detail cards; a slide a stakeholder reads from across a room cannot. If
both are requested, build the working-document HTML (and `.xlsx`) first as the source of truth, then
derive the deck from it — the deck always points back to the document/spreadsheet for full evidence
rather than duplicating it.

## Hard constraints (same family as the working document, plus presentation-specific ones)

- **One self-contained `.html` file.** Inline CSS, no external CDNs/fonts/images/JS.
- **Opens offline**, advances by scrolling even with JS disabled (see Navigation below) — JS only
  adds convenience (keyboard arrows, click zones, a progress readout), it is never required to read
  the content in order.
- **Printable to PDF** via the browser's own print dialog — no export tooling needed. Each slide must
  land on its own printed page in landscape orientation (see CSS below).
- **Korean by default**, same as the working document. Quotes stay verbatim.
- **Curated, not exhaustive.** Each slide carries one idea. If a slide needs three paragraphs to
  explain, it's not a slide — split it or push detail to the companion document.

## Layout module catalog (mapped from Slidev's layout vocabulary)

| Slidev layout | What it does there | Adapted module here |
| --- | --- | --- |
| `cover` | Title slide, big centered title + subtitle | **표지** — report title, one-line study description (method, participant count, date if known) |
| `section` | Divider between major parts of a long deck | **구간 구분** — only for decks with >~12 slides; skip for short decks |
| `statement` | One big number or one big sentence, nothing else | **핵심 지표 / 한 줄 결론** — a single SUS/완료율 number, or one Decision-Summary bullet blown up |
| `two-cols` / `image-right` | Split layout: text one side, supporting visual/list the other | **이슈 상세** — 문제·제안 on one side, curated 근거 (2–3 lines max) on the other |
| `quote` | Large centered quotation | **인용 강조** — a single verbatim participant quote when it *is* the finding (use sparingly — most quotes belong inside an issue slide, not standalone) |
| `default` | Bullet list slide | **결론 요약 / 다음 단계** — short bullet lists, large type |
| `end` | Closing slide | **마무리** — thank-you + pointers to the full report/spreadsheet, no new claims |

Not every module is needed every time — a thin-input deck might be cover → 핵심 결론 → 갭 → 마무리 and
nothing else. Don't pad a short story into more slides just to look thorough (the same instinct as
"don't pad the working document" applies here, doubled — empty slides waste a stakeholder's attention
faster than empty paragraphs do).

## Default structure (adapt to the material; this is the spine, not a mold)

1. **표지** — report title, study meta (참가자 수, 방법, 과제 수). One slide, centered, large type.
2. **이번 테스트에서 확인된 결론** — the same Decision Summary bullets as the working document, but
   fewer per slide (3–4 max) and each rendered in large type. If there are more than ~4, split across
   two slides rather than shrinking the type to fit.
3. **핵심 지표** *(only if quantitative data exists)* — one or two "statement" slides with the
   headline numbers (완료율, SUS, 평균 SEQ). Pair each number with one line of qualitative color, not
   a wall of explanation — the full tally lives in the `.xlsx`.
4. **우선 개선 이슈** — one slide per top issue, **top 3–5 only**, in priority order. Two-column
   layout: left = 문제 + 제안 (plain language, one or two lines each), right = a *curated* evidence
   list of 2–3 lines (not the full per-participant list from the working document — pick the
   strongest 2–3 and say "외 n명" if more support it). Rank shown as a small badge, same color
   convention as the working document (`--p1`…`--p4` border/badge color = priority, one signal).
5. **과제별 결과 요약** *(behavioral data only)* — one slide, a simple visual (bars or a compact table)
   of 성공/실패 per task. Skip per-participant detail here; that's the appendix's job, not the deck's.
6. **추가 확인 필요사항** — one slide, short bullets, only the items worth a stakeholder's attention
   (not every minor gap — that level of detail belongs in the working document).
7. **마무리 / 다음 단계** — what decision is being asked for, and a pointer to the full HTML report
   and `.xlsx` for anyone who wants to trace evidence. No new claims on this slide.

Lower-confidence issues, the full per-participant evidence table, and methodology notes do **not** get
their own slides — point to the companion document instead of duplicating them at a worse zoom level.
This mirrors the working document's "say each thing once" rule, just at a stricter altitude: the deck
says each *issue* once, briefly, and defers everything else.

## Typography and density — the thing that actually differs from the working document

A working-document paragraph that's perfectly fine on a screen someone reads up close is unreadable
projected or skimmed in a meeting. Concretely:

- **One idea per slide.** If you're tempted to add a second `<h2>` to a slide, that's a second slide.
- **Big type, short lines.** Headline ~2.2–3rem, body ~1.4–1.8rem, evidence quotes ~1.2–1.4rem — roughly
  double the working document's sizes. Wrap text at a width that keeps lines short (a presentation
  line should read in one eye-sweep).
- **3–5 bullets per list slide, max.** More than that, split into two slides rather than shrinking
  type or line-height to cram it in.
- **Evidence is curated, not complete.** Pick the 2–3 strongest pieces of evidence per issue slide,
  say how many in total support it ("외 2명"), and let the working document/appendix carry the rest.
- Same color discipline as the working document: one signal per meaning (a left border or a badge for
  priority — not both, not also italics).

## Navigation (works with JS disabled; JS adds convenience only)

Use CSS scroll-snap as the foundation — this means the deck is fully navigable with nothing but the
browser's native scrolling (arrow keys, space, trackpad, Page Down) even if scripts are blocked:

```css
html, body { margin:0; height:100%; }
.deck { height:100vh; overflow-y:scroll; scroll-snap-type:y mandatory; }
.slide { height:100vh; width:100%; scroll-snap-align:start; scroll-snap-stop:always;
         display:flex; flex-direction:column; justify-content:center; box-sizing:border-box;
         padding:6vh 8vw; }
```

Then layer small, optional vanilla-JS conveniences on top — none of them load-bearing for readability:

- A bottom-right slide counter (`3 / 12`) updated via `IntersectionObserver` on `.slide` elements.
- Left/right-arrow and click-edge handlers that call `scrollIntoView({behavior:'smooth'})` on the
  next/previous `.slide`, as a faster alternative to scrolling — not a replacement for it.
- A thin progress bar pinned to the top, width driven by the same observer.

If JS is disabled, none of this breaks anything — the deck still scrolls slide-by-slide because of
`scroll-snap`, which is pure CSS. This satisfies the same "readable with scripts disabled" constraint
the working document carries.

## Print / PDF export

No export tooling is needed — the browser's own print dialog produces a slide-per-page PDF if the
print stylesheet forces one `.slide` per page in landscape:

```css
@media print {
  @page { size: landscape; margin: 0; }
  .nav-controls, .progress-bar, .slide-counter { display:none; }
  .slide { height:100vh; width:100vw; page-break-after:always; break-after:page; }
}
```

## Self-check before finalizing

1. Does every slide say exactly one thing? (If a slide has two headlines, split it.)
2. Is the type large enough to read from across a room, not just on the screen you authored it on?
3. Did you cut evidence down to the strongest 2–3 per issue rather than copying the working
   document's full per-participant list?
4. Does the deck still open and scroll slide-by-slide with JavaScript disabled?
5. Does it point back to the working-document HTML / `.xlsx` for full evidence instead of duplicating
   them?
6. Would a stakeholder who only watches the deck (never opens the appendix) still get an accurate,
   non-overclaimed picture — same grounding discipline as the working document, just fewer words?

## Minimal skeleton (starting point — adapt freely)

This reuses the working document's color tokens (`--p1`…`--p4`, `--ink`, `--mut`, `--line`, `--bg`)
so a deck and its companion report feel like one family, not two design systems.

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>체크아웃 사용성 테스트 — 발표용 슬라이드</title>
<style>
  :root{ --p1:#dc2626; --p2:#ea580c; --p3:#ca8a04; --p4:#64748b;
         --ink:#1f2937; --mut:#6b7280; --line:#e5e7eb; --bg:#f8fafc; }
  *{box-sizing:border-box;}
  html,body{ margin:0; height:100%; font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif; color:var(--ink); }
  .deck{ height:100vh; overflow-y:scroll; scroll-snap-type:y mandatory; scroll-behavior:smooth; }
  .slide{ height:100vh; width:100%; scroll-snap-align:start; scroll-snap-stop:always;
          display:flex; flex-direction:column; justify-content:center; padding:6vh 9vw; }
  .slide.cover{ align-items:center; text-align:center; background:var(--bg); }
  .slide h1{ font-size:3rem; margin:0 0 .6rem; }
  .slide .sub{ color:var(--mut); font-size:1.3rem; }
  .slide h2{ font-size:2.1rem; margin:0 0 1.4rem; }
  .slide ul{ font-size:1.5rem; line-height:1.7; padding-left:1.3rem; }
  .slide ul li{ margin:.7rem 0; }
  .twocol{ display:grid; grid-template-columns:1.1fr 1fr; gap:3rem; align-items:start; }
  .twocol h3{ font-size:1.7rem; margin:0 0 .8rem; }
  .twocol .lead p{ font-size:1.35rem; line-height:1.6; }
  ul.evidence{ list-style:none; padding:0; margin:0; font-size:1.25rem; line-height:1.65; }
  ul.evidence li{ margin:.9rem 0; padding-left:1rem; border-left:4px solid var(--line); }
  .pid{ font-weight:700; color:#334155; margin-right:.4rem; }
  .badge{ display:inline-flex; width:2.2rem; height:2.2rem; border-radius:8px; background:var(--p1);
          color:#fff; font-weight:800; align-items:center; justify-content:center; margin-right:.7rem; flex:0 0 auto; }
  .badge.l2{background:var(--p2);} .badge.l3{background:var(--p3);} .badge.l4{background:var(--p4);}
  .slide.end{ align-items:center; text-align:center; background:var(--bg); }
  .progress-bar{ position:fixed; top:0; left:0; height:4px; background:var(--p1); width:0; transition:width .2s; }
  .slide-counter{ position:fixed; bottom:1.2rem; right:1.5rem; font-size:1rem; color:var(--mut); }
  @media print{
    @page{ size:landscape; margin:0; }
    .progress-bar,.slide-counter{ display:none; }
    .deck{ overflow:visible; height:auto; }
    .slide{ height:100vh; width:100vw; page-break-after:always; break-after:page; scroll-snap-align:none; }
  }
</style>
</head>
<body>

<div class="progress-bar" id="bar"></div>
<div class="slide-counter" id="counter">1 / 4</div>

<div class="deck" id="deck">

  <section class="slide cover">
    <h1>체크아웃 리디자인 사용성 테스트</h1>
    <p class="sub">참가자 5명 · 과제 4개 · 발표용 요약 — 전체 근거는 동봉 작업 문서/엑셀 참고</p>
  </section>

  <section class="slide">
    <h2>이번 테스트에서 확인된 결론</h2>
    <ul>
      <li>마찰은 결제 단계에 몰려 있음 — 장바구니 담기는 5명 전원 문제없음.</li>
      <li>할인 코드 입력란 위치가 가장 큰 문제 — 5명 중 4명이 헤매거나 실패.</li>
      <li>결제 중 배송지 변경 경로가 안 보여 1명은 끝내 포기.</li>
    </ul>
  </section>

  <section class="slide">
    <h2>우선 개선 이슈 #1</h2>
    <div class="twocol">
      <div class="lead">
        <h3><span class="badge">1</span>할인 코드 입력란을 찾기 어려움</h3>
        <p><strong>제안:</strong> 장바구니 화면에 프로모 코드 입력란 노출.</p>
      </div>
      <div>
        <ul class="evidence">
          <li><span class="pid">P3</span> 끝까지 못 찾고 미적용 결제</li>
          <li><span class="pid">P1</span> 결제 화면에서 뒤늦게 발견</li>
        </ul>
        <p style="color:var(--mut); font-size:1rem; margin-top:.6rem;">외 2명 추가 언급 — 전체 근거는 작업 문서 참고</p>
      </div>
    </div>
  </section>

  <section class="slide end">
    <h2>다음 단계</h2>
    <p class="sub">할인 코드 입력란 노출 여부, 먼저 결정 필요 — 전체 근거는 작업 문서·집계표 참고</p>
  </section>

</div>

<script>
  var slides = document.querySelectorAll('.slide');
  var bar = document.getElementById('bar');
  var counter = document.getElementById('counter');
  var deck = document.getElementById('deck');
  var current = 0;

  function update(){
    var i = Math.round(deck.scrollTop / window.innerHeight);
    current = Math.max(0, Math.min(slides.length - 1, i));
    counter.textContent = (current + 1) + ' / ' + slides.length;
    bar.style.width = ((current + 1) / slides.length * 100) + '%';
  }
  deck.addEventListener('scroll', update, { passive: true });
  update();

  document.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown'){
      slides[Math.min(slides.length - 1, current + 1)].scrollIntoView({behavior:'smooth'});
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp'){
      slides[Math.max(0, current - 1)].scrollIntoView({behavior:'smooth'});
    }
  });
</script>

</body>
</html>
```

The skeleton is scaffolding, not a mold — reshape modules freely to fit the material. What must
survive: scroll-snap as the no-JS navigation baseline, one idea per slide, curated (not duplicated)
evidence, the shared color tokens, and the print stylesheet.
