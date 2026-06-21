# Analysis patterns

How to pick and run an analysis approach based on what the material actually is. Most real datasets
are mixtures — combine patterns rather than forcing one. The aim is to let the data choose the
method, not to apply the same recipe every time.

## First, characterize the material

Before choosing, answer for yourself:
- **Type:** transcripts, task logs, open-ended survey, metrics, mixed, or an existing report?
- **Volume:** how many participants / sessions / responses / data points?
- **Richness:** detailed and quote-heavy, or sparse and bullet-ish?
- **Structure:** clean and labeled, or raw and messy?
- **What's present vs. absent:** what can this realistically answer, and what can't it?

That characterization sets both the method and the ceiling on your claims.

## Pattern: thematic / affinity synthesis (qualitative-heavy)

Best for interview transcripts, open-ended survey responses, lots of session notes.

- Extract each discrete observation (a quote, a stated need, a noted reaction) as its own unit.
- Cluster related units; name each cluster from what's *in* it, not from a pre-decided category.
- Let themes emerge bottom-up. Re-group when a cluster gets incoherent or too large.
- Build a hierarchy when rich: theme → sub-theme → supporting observations.
- Capture *why* (motivations, mental models, emotions), not just *what*.
- **Pitfalls:** confirmation bias (seeing the theme you expected), over-clustering tiny groups into
  false patterns, losing the quote that anchors a cluster.

## Pattern: task-friction / usability analysis (behavioral)

Best for usability test data, task-completion logs, moderated/unmoderated session records.

- Organize by task or by friction point.
- For each: what happened (success / indirect success / fail / abandon), where confusion arose,
  what errors/misclicks occurred, and whether/how users recovered.
- Rate **severity** (how blocking) and **confidence** (how well-evidenced) as separate axes.
- Distinguish a one-off slip from a recurring, design-caused breakdown.
- Frame issues as properties of the design, not failures of the user.
- **Pitfalls:** treating one stumble as systemic, computing "rates" from too few sessions, conflating
  severity with confidence.

## Pattern: mixed-methods (qual + quant)

Best when metrics and qualitative evidence both exist.

- Report the metrics that genuinely exist; never compute ones the data can't support.
- For each notable number, attach the qualitative evidence that explains it (the *why* behind the
  *what*).
- Let conflicts between the two surface — a good score with bad sentiment is itself a finding.
- **Pitfalls:** inventing benchmarks, implying causation from correlation, dropping the qual context
  and leaving bare numbers.

## Pattern: limited-evidence summary (thin input)

Best when there's very little data, or it's fragmentary.

- State plainly what can and cannot be concluded.
- Offer directional observations, clearly flagged as tentative.
- Make research gaps a prominent section, not a footnote.
- Resist building a confident narrative from a few points.
- **Pitfalls:** padding to look complete, over-generalizing, hiding how little there is.

## Pattern: critique / strengthen existing findings

Best when handed a prior report or a list of findings.

- For each existing claim, classify it: observation, interpretation, or unsupported assertion?
- Test traceability — is there evidence behind it? Is the leap from evidence to claim sound?
- Strengthen weak chains, flag unsupported jumps, and surface what was overlooked.
- Reframe for the intended audience without inflating beyond the evidence.
- **Pitfalls:** rubber-stamping confident-sounding claims, adding new fabricated support to prop up a
  shaky finding.

## Choosing, in one line

If it's mostly words → thematic/affinity. If it's mostly behavior/tasks → task-friction. If it's
both words and numbers → mixed-methods. If there's barely anything → limited-evidence summary. If
it's already a report → critique. When in doubt, combine, and say what you did.
