# Evidence grounding

This is the heart of the skill. Synthesis earns trust only when a reader can trace every claim back
to something real in the source. The failure mode to prevent is *quiet escalation* — a hunch
becoming an "insight," an "insight" becoming a "fact," a fact driving a decision no participant
actually justified. Keep the chain visible and the tiers separate.

## The three tiers

**1. Observation** — directly present in the source.
- A verbatim quote, a recorded misclick, a task marked failed, a metric value, a survey answer.
- Traceable to a specific participant, line, session, or data point.
- Phrasing stays close to the source: "P3 abandoned the checkout task after returning to the cart
  twice." "4 of 6 participants mentioned not noticing the filter."

**2. Interpretation** — your reasoned inference from one or more observations.
- This is analysis, and it's where you add value — but it is a *reading*, not the data.
- Always signposted as interpretation: "This suggests…", "A likely explanation is…", "It appears
  that…". "Users seem to expect the filter to persist — three returned to re-apply it."
- Good interpretation names the observations it rests on.

**3. Recommendation** — a proposed next action (product, UX, content, or further research).
- Offer one only when evidence supports it; tie it to the observation/interpretation beneath it.
- "Consider persisting filter state across pagination (P2, P3, P5 re-applied filters after paging)."
- When evidence is too thin to recommend a change, recommend *research* instead: a gap, not a fix.

Keep these distinct in prose and in the report's visual structure. If you can't tell which tier a
statement belongs to, surface the uncertainty rather than rounding up.

## Non-negotiables (do not fabricate)

These exist because a single invented detail poisons the credibility of the whole report. There is
no upside to inventing — an honest gap is always better than a confident fiction.

- **Don't invent participant counts.** If the source doesn't state how many people there were, don't
  assert a number. Say "several participants" / "the available responses" / "count not specified."
- **Don't invent quotes.** Use only wording actually present. Never paraphrase into quotation marks,
  never "clean up" a quote into something not said. If you paraphrase, drop the quote marks and say
  it's a paraphrase.
- **Don't invent metrics.** Don't compute a rate the raw data can't support, don't assign a SUS/SEQ
  score that wasn't collected, don't invent benchmarks or "industry averages" to compare against.
- **Don't invent task names, screens, features, or flows.** Refer to them as the source labels them.
  If a step is unnamed, describe it generically ("the second form step") rather than naming it.
- **Don't invent business impact.** No made-up conversion lifts, revenue figures, churn numbers, or
  "this costs us X." You may note that an issue *could* affect a business outcome — clearly as a
  hypothesis, never as a measured result.
- **Don't generalize from one participant** unless explicitly labeled as a single-participant
  signal. "One participant struggled with X" is fine; silently turning it into "users struggle with
  X" is not.
- **Don't present interpretation as fact.** Keep the signposting.
- **Don't hide uncertainty.** Thin evidence, conflicting signals, and unanswerable questions get
  stated, not smoothed over.
- **If evidence is insufficient, say so** — and make that a gap/open-question output.
- **Every major insight must be traceable.** If you can't point to the evidence, it isn't a finding
  yet.

## Completeness in the spreadsheet vs. fabrication

The full `.xlsx` aggregation must include **every** quantitative value the source actually contains
(or that is directly derivable from its raw counts) — that is the "nothing omitted" rule. This does
**not** loosen the anti-fabrication rules. "Complete" means *don't drop real numbers*; it never means
*fill gaps with invented ones*. If a metric wasn't collected, the cell stays empty or marked "수집
안 됨 (not collected)" — you never manufacture a value to make the sheet look finished.

## Grounded vs. ungrounded phrasing

| Ungrounded (avoid) | Grounded (prefer) |
| --- | --- |
| "Users find checkout confusing." | "3 of 5 participants hesitated or backtracked at the payment step (P1, P3, P4); this suggests the step's requirements aren't clear upfront." |
| "The signup flow has a 40% drop-off." | "The notes don't include drop-off rates; this is a gap worth instrumenting." |
| "Participants loved the new dashboard." | "Two participants spontaneously praised the dashboard layout (P2: 'this is way cleaner'); the other three didn't comment on it." |
| "This will increase conversion." | "Reducing this friction may help conversion — a hypothesis to validate, not a measured effect." |
| "8 users tested the prototype." | "The source doesn't state the participant count; treat patterns as directional." |

## A quick self-check before publishing a finding

- Can I point to the specific evidence? If no → it's not a finding yet.
- Am I claiming more certainty/scope than the evidence carries? If yes → scale it back.
- Did I label interpretation as interpretation? If no → fix the phrasing.
- Did I invent any number, quote, name, or impact? If yes → remove it.
- Have I shown what this data *can't* tell us? If no → add the gap.
