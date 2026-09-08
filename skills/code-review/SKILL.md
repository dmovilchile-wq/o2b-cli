---
name: code-review
description: Review the current diff for correctness bugs, reuse, and simplification opportunities. Use after writing or modifying code, before considering a change done.
origin: O2B-CONTRIBUTOR
version: 1.0.0
tags: [contributor, engineering-practice]
---

Review only the actual diff. Prioritize real correctness bugs over style.
For each finding, cite the file/line, the concrete failure scenario, and
the smallest fix — never a rewrite when a small fix suffices.
