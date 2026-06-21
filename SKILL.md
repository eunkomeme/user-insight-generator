---
name: usability-research-synthesizer
description: >-
  Analyze raw usability evaluation and UX research material and turn it into evidence-grounded
  findings, insights, and a self-contained visual HTML report. Use this whenever someone shares
  usability test notes, moderated or unmoderated session records, interview transcripts,
  participant-by-participant evaluation logs, open-ended survey responses, task-completion or
  success/error logs, usability metrics (completion rate, time on task, misclicks, SUS/SEQ), mixed
  qual+quant research data, or an existing UX research report that needs synthesis, critique, or a
  stakeholder-ready write-up. Trigger on phrases like "analyze these usability test results",
  "synthesize my interview notes", "what are the themes / pain points / friction points here",
  "make this research stakeholder-ready", "turn this into findings", "affinity map this", or "build
  a UX research report / usability report from this data" — even when the user doesn't name a
  specific method. Also triggers on the same requests in Korean, e.g. "사용성 테스트 결과 분석해줘",
  "인터뷰 내용 정리해줘", "리서치 결과 보고서 만들어줘", "이 데이터에서 페인포인트/인사이트 뽑아줘",
  "주요 발견사항으로 정리해줘". The defining job is grounding every finding in source evidence and
  adapting the analysis and report shape to the material, rather than forcing a fixed template.
  Deliverables are written in Korean by default. Do NOT use for
  generating brand-new survey/interview questions or a research plan from scratch (no data yet),
  for non-research product analytics dashboards or A/B test stats work, for academic/scientific
  literature reviews, or for general data-cleaning of tabular files where the deliverable is a
  spreadsheet rather than research synthesis.
---

# Usability Research Synthesizer

## What this skill is for

You are handed messy, real UX research material and asked to make sense of it: usability test
notes, interview transcripts, per-participant evaluation records, open-ended survey answers, task
logs, usability metrics, or some mixture — sometimes an existing report that needs sharpening. Your
job is to turn that into findings a product team can actually act on, **without ever inventing
what the data doesn't say.**

The value you add is not volume. It is a trustworthy chain from *what was observed* → *what it
likely means* → *what to do next*, presented in a clean visual report shaped to fit the material.
A short, honest, evidence-backed synthesis beats an impressive-looking report padded with
plausible-sounding claims nobody can trace to a source.

## The one rule everything else serves: stay grounded in evidence

Research synthesis fails in a specific, costly way — the synthesizer quietly upgrades a hunch into
a "finding," and a team ships a decision built on something no participant actually did or said.
Once that happens the whole report becomes untrustworthy, because the reader can no longer tell
which claims are real. So the most important discipline in this skill is keeping three things
visibly separate:

1. **Observation** — what is directly present in the source material. A quote, a recorded
   misclick, a task marked failed, a metric value. Traceable to a specific participant, line, or
   data point.
2. **Interpretation** — what you reasonably infer from one or more observations. This is your
   analysis ("users seem to expect the filter to persist across pages"). It is valuable, but it is
   a *reading* of the evidence, not the evidence itself — so label it as interpretation.
3. **Recommendation** — a suggested next action (product, UX, content, or further research). Only
   propose one when the evidence supports it, and tie it back to the observation/interpretation it
   rests on.

Keep these distinct in your thinking, in your prose, and in the report's visual structure. When you
are unsure which tier something belongs to, that uncertainty is itself information worth showing —
say so rather than rounding up.

`references/evidence-grounding.md` has the detailed rules, the non-negotiables (don't invent
participant counts, quotes, metrics, task names, features, or business impact), and concrete
examples of grounded vs. ungrounded phrasing. Read it before writing findings.

## Output language and deliverables

**Write all deliverables in Korean by default** — the analysis prose, the HTML report's labels and
narrative, and the spreadsheet's sheet names, headers, and notes. The one exception is *verbatim
evidence*: keep participant quotes in their original language exactly as written (don't translate or
"tidy" them — that would break the grounding rule). If a quote is in another language and a Korean
reader needs it, you may add a clearly-marked Korean gloss next to the original (e.g., 원문 + "(번역:
…)"), but the original must remain. If the user explicitly asks for another language, follow that.

**Produce up to two deliverables, matched to the data:**

1. **Complete quantitative aggregation → a spreadsheet (`.xlsx`).** Whenever the material contains
   tally-able numbers — usability metrics, task success/fail outcomes, error/misclick counts, SEQ/SUS
   scores, or codeable counts like participant×theme — build a spreadsheet that captures **every**
   such value present in the source, with **nothing omitted**. This is the complete record:
   per-participant and per-task breakdowns, totals, and any rates that are *directly derivable* from
   the raw counts (e.g., "4 of 5" and its 80%). The completeness rule applies only to numbers that
   are actually in (or directly computable from) the source — the anti-fabrication rules still hold:
   never invent a metric, score, benchmark, or count the data doesn't support. Use the `xlsx` skill
   to build the file. Skip the spreadsheet only when there is genuinely nothing numeric to tally
   (e.g., a couple of stray open-text comments).

2. **An action-oriented working document → a self-contained HTML report.** This is the *selective*
   view a product team acts on: the decision, the priority issues, and a backlog they can lift into
   a tracker — leading with what to fix, with methodology and full evidence pushed to the appendix
   (see "HTML report — a working document"). It does **not** need every number — that's the
   spreadsheet's job. It carries headline metrics and points to the spreadsheet for the full tally.

Think of it as "complete record (spreadsheet) + action document (HTML)". For purely qualitative,
thin, or non-numeric input, the HTML report (or even a short written summary) alone is the right
output.

## Workflow

This is a sequence of intentions, not a rigid checklist. Adapt depth to the material — thin input
deserves a light pass, rich input rewards deeper synthesis.

1. **Inspect before analyzing.** Read everything first. Resist the pull to start theming
   immediately. Get a feel for what you actually have.

2. **Characterize the material.** What kind of data is this (transcripts? task logs? metrics?
   open-ended survey? mixed? an existing report)? How much of it is there — how many participants,
   sessions, responses, data points? How rich vs. thin? How structured vs. raw? Note what is
   *present* and, just as important, what is *absent*. This characterization drives every later
   choice, so make it explicit (a sentence or two to yourself is enough).

3. **Decide what can and cannot be concluded.** Before extracting anything, set the ceiling on
   your claims. One participant ≠ a pattern. Five sessions ≠ a statistically reliable rate. A
   metric with no task definition ≠ an interpretable score. Knowing the ceiling now prevents
   over-claiming later.

4. **Choose an analysis approach that fits.** See "Adaptive analysis selection" below. Don't
   default to the same recipe every time — let the data pick the method.

5. **Extract evidence first, insights second.** Pull the concrete observations (quotes, events,
   metric values, task outcomes) before you interpret them. This ordering is what keeps insights
   anchored. If you find yourself writing an insight you can't point to evidence for, stop — either
   find the evidence or drop the insight.

6. **Group evidence into themes or patterns.** For qualitative material, cluster related
   observations affinity-style and name the clusters from what's in them, not from what you expected
   to find. For task/metric material, group by task, friction point, or severity. Let groupings
   emerge from the data.

7. **Derive insights — supported only.** Each insight should be a readable interpretation that
   names the evidence underneath it. Note how many participants/sources support it (without
   inventing the count) so the reader can weigh it.

8. **Recommend where warranted; flag gaps where not.** Where evidence supports an action, suggest
   it and connect it to its basis. Where the data is too thin to conclude, say so plainly and turn
   it into a research-gap or open-question item — that is a genuinely useful output, not a failure.

9. **Build the deliverables.** When numeric data exists, first produce the complete `.xlsx`
   aggregation (every value, nothing omitted), then the action-oriented HTML report — leading with
   the decision and the fixes, methodology and evidence in the appendix (see "Output language and
   deliverables" and "HTML report — a working document"). Write them in natural, product-team
   Korean. Point the reader to the spreadsheet for the full numbers.

## Adaptive analysis selection

The point of this skill is that the analysis bends to the data, not the reverse. Use the material's
character (from step 2) to choose emphasis. These are starting instincts, not boxes — most real
datasets are mixtures, so combine freely.

- **Interview transcripts / open-ended responses (qualitative-heavy):** Prioritize themes, user
  needs, goals, pain points, mental models, and emotional signals. Cluster observations
  affinity-style; let the quotes carry the evidence. Use the qualitative material to explain *why*
  users behaved or felt as they did — that "why" is the thing quantitative data usually can't give.

- **Usability test data / task logs (behavioral):** Prioritize task friction, completion vs.
  failure, errors and misclicks, points of confusion, and recovery behavior. Organize by task or by
  friction point, and assess severity (how blocking) and confidence (how well-evidenced)
  separately. Remember a success/fail measures the *design's* effectiveness, not the user.

- **Metrics present (quantitative):** Report the metrics that exist (completion rate, time on task,
  error/misclick rate, SEQ, SUS, etc.) and pair each with the qualitative evidence that explains it.
  A number tells you *what*; the quotes and observations tell you *why*. Never compute a metric the
  raw data can't support, and never invent benchmarks. `references/maze-methodology-notes.md` has
  definitions and what each metric can and can't tell you.

- **Thin or incomplete input:** Produce a deliberately limited summary. State what little can be
  concluded, mark research gaps prominently, and resist inflating a few data points into a
  confident narrative. A credible "here's what we can and can't say yet" is the right deliverable.

- **Rich input (many observations):** Go deeper — affinity-style clustering, an insight hierarchy
  (themes → sub-themes → supporting evidence), severity/confidence weighting, and richer visual
  synthesis. This is where the more elaborate report modules earn their place.

- **Existing findings / a prior report:** Shift into critique mode. Test each existing claim against
  its evidence: Is it observation, interpretation, or assertion? Is it traceable? Strengthen the
  evidence chain, flag unsupported leaps, surface what was overlooked, and reframe for stakeholders.

`references/analysis-patterns.md` expands each of these with cues and pitfalls.

## HTML report — a working document, not a research write-up

Design the report as something a product team takes straight into a meeting, a backlog, or a
JIRA/PLM ticket — **not** as an academic analysis. The grounding facts you preserved are good; the
problem to avoid is a report a practitioner reads and thinks "그래서 뭘 고치라는 거지? 어디부터?".
Two guiding lines:

- **방법론을 완벽히 설명하는 것보다, 제품팀이 바로 의사결정하고 개선 작업으로 옮길 수 있게 정리하는 것을
  우선한다.** (Prioritize practical decision-making over methodological completeness.)
- **본문은 실행을 위한 문서이고, 부록은 근거 확인을 위한 영역이다.** (The main report is for action; the
  appendix is for evidence.)

So lead with the decision and the fixes. Push methodology, the "why this structure" note, and the
full evidence tables down into the appendix or collapsible sections. Do **not** open with an
explanation of observation/interpretation/recommendation, and do **not** sprinkle those labels
repeatedly through the body — the grounding shows up *inside* each issue (its 근거 and 근거 수준),
not as a framing lecture. Traceability stays intact; it just stops being the headline.

**Default structure** (adapt to the material — this is the working-document spine, not a rigid mold):

1. **이번 테스트에서 확인된 결론 (Decision Summary)** — 3–5 bullets. What changed, what failed, what
   needs a product decision. No methodology here.
2. **우선 개선 이슈 (Priority Issues)** — issues ranked by user impact × frequency × task criticality ×
   evidence strength. Each title is plain and action-oriented ("결제 화면에서 배송지 변경 버튼을 찾기
   어려움"), never a vague label ("진입점 부재", "시각 어포던스").
3. **개선안 백로그 (Action Backlog)** — a table the team can lift straight into a tracker. Columns:
   우선순위 / 이슈 / 근거 / 제안 개선안 / 기대 효과 / 확인 방법. Never invent owners, dates, or
   business-impact numbers that aren't in the data.
4. **이슈별 상세 카드 (Issue Detail Cards)** — one card per priority issue: 문제 / 근거 (참가자·과제·인용
   또는 행동) / 영향 / 제안 / 확인 방법 / 근거 수준 (강·중·약).
5. **과제별 결과 요약 (Task Result Overview)** — a simple task table (성공 / 실패 / 머뭇거림 / 우회 경로).
   Don't dump every raw note here.
6. **근거 부록 (Evidence Appendix)** — participant-level evidence table, verbatim quotes, raw
   observations, metrics if any. Full traceability lives here; collapsible is ideal.
7. **추가 확인 필요사항 (Research Gaps)** — missing metrics, weak-evidence items, follow-up questions.

For qualitative-only material the same spine applies, with themes/user needs standing in for "issues"
and a quote-driven appendix. For thin input, a short Decision Summary + Gaps is enough — don't pad.

Before finalizing, sanity-check from the reader's seat:
- PM이 5분 안에 액션 아이템으로 옮길 수 있는가?
- 디자이너가 무엇을 바꿔야 하는지 이해되는가?
- 개발자가 어떤 플로우/화면 상태가 영향받는지 알 수 있는가?
- 평가자가 주요 주장마다 근거로 되짚어갈 수 있는가?
- 한국어가 번역투 없이 자연스러운가?

Keep the hard technical constraints: **one self-contained `.html` file**, all CSS inline, no external
CDNs/images/JS, opens offline, readable with scripts disabled (tiny vanilla JS for collapsible
appendix sections is welcome). When a `.xlsx` aggregation exists, the report carries only headline
numbers and points to the spreadsheet for the full tally.

`references/html-report-patterns.md` has the detailed structure, the jargon→plain-Korean swaps, card
and backlog layouts, and styling. Treat it as guidance, not a fixed template.

## Reference files

Read these as needed; they hold the depth so this file stays scannable.

- `references/evidence-grounding.md` — the three tiers in detail, non-negotiable anti-fabrication
  rules, and grounded vs. ungrounded phrasing examples. **Read before writing any findings.**
- `references/research-principles.md` — qual vs. quant, why-not-just-what, stakeholder framing,
  sample-size humility, severity vs. confidence.
- `references/analysis-patterns.md` — how to pick and run an analysis approach per data type, with
  cues and pitfalls.
- `references/html-report-patterns.md` — module catalog, selection heuristic, self-contained HTML
  patterns, visual grounding cues.
- `references/maze-methodology-notes.md` — methodology notes distilled from Maze's articles on
  stakeholder buy-in, affinity diagrams, usability metrics, and qualitative research. Guidance to
  draw on, not structures to copy.

## A note on reliability and creativity

These two goals are not in tension here. Reliability comes from the grounding discipline — the
traceable chain from evidence to claim, the honesty about gaps, the refusal to fabricate. Creativity
comes from *how* you analyze and present: which method fits this data, which clusters reveal the
real story, which report modules make the insight land for this audience. Be rigorous about the
evidence and inventive about the synthesis. Don't let a desire for a complete-looking report push
you into claims the data can't carry — an honest, well-shaped partial picture is the more valuable
deliverable every time.
