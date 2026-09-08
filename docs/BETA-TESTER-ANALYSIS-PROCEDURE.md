# O2B Private Beta — Tester Analysis Procedure

Procedure for the *next* session to follow when a tester sends results
back. Written now, at freeze time, so analysis is consistent across all
5 testers instead of improvised per-response.

## Inputs expected from a tester (per beta-kit/SEND-BACK.md)

1. Completed `beta-kit/FEEDBACK-FORM.md`
2. `o2b report --sanitize` output (sanitized JSON)
3. Optional: sanitized crash report (`--crash-report`), only if something failed

Never request or accept: `.claude.json`, full `settings.json`, `.env`,
tokens, API keys, full `CLAUDE.md`, or private source code (see
`beta-kit/SEND-BACK.md`).

## Steps

1. **Verify sanitization** — before reading the sanitized report as data,
   grep it for anything that looks like a real home path, email, or
   secret-shaped string. If anything real slipped through despite
   `--sanitize`, treat that as a P0 finding in its own right (a
   sanitization bypass), not just a data-quality issue.
2. **Fill in the tester's `docs/beta-testers/BETA-TESTER-0NN.md` file**
   from the feedback form + sanitized report — replace "NOT TESTED" with
   the real (anonymized) evidence. Do not infer or fill any field the
   tester did not actually answer.
3. **Produce a TESTER ANALYSIS** with these sections:
   - TRUE POSITIVES
   - FALSE POSITIVES
   - FALSE NEGATIVES
   - BUGS
   - PRODUCT GAPS
   - FEATURE REQUESTS
   - VALUE DISCOVERED
   - PRIVACY ISSUES
   - COMMERCIAL SIGNALS
4. **Classify each item** per `docs/BETA-CHANGE-POLICY.md` (P0-P4).
5. **Do not implement immediately.** Accumulate evidence across testers
   first — a single tester's request is a data point, not a mandate. See
   `docs/BETA-CHANGE-POLICY.md` for what gets fixed immediately vs. what
   waits.
6. **Update `docs/BETA-RESULTS-TEMPLATE.md`'s synthesis section** only
   once at least 2-3 testers have reported, so patterns (not single
   anecdotes) drive the synthesis.

## What NOT to do

- Do not implement a P3 feature request after one tester asks for it.
- Do not change `docs/BETA-SUCCESS-CRITERIA.md` thresholds based on results.
- Do not treat one tester's false positive as proof a detector is broken
  — check whether it reproduces, and whether other testers hit the same one.
