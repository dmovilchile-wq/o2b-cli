# Context Configuration Score — formula, validation, and honest limits

## Why not "Context Efficiency"?

The Phase 1 plan originally called this score "Context Efficiency". That
name implies a validated relationship between a token count and actual
model performance/cost — **we have no such evidence**. What O2B can
actually measure is how large the *always-loaded* instruction set
(`CLAUDE.md`/`AGENTS.md`/`settings.json`, global + project) is, compared to
an arbitrary reference budget. So the score is called **Context
Configuration Score**, and the code (`packages/core/src/doctor/scoring.ts`)
says so explicitly in a comment next to `CONTEXT_BUDGET_TOKENS`.

## Formula

```
alwaysLoadedTokens = sum of estimateTokens(content) for every
                      CLAUDE.md / AGENTS.md / settings.json
                      instruction source, global + project

overBudgetRatio = max(0, (alwaysLoadedTokens - CONTEXT_BUDGET_TOKENS) / CONTEXT_BUDGET_TOKENS)
score            = clamp(100 - overBudgetRatio * 100, 0, 100)
```

`CONTEXT_BUDGET_TOKENS = 20,000` — **this is an arbitrary, documented
reference point, not an empirically derived threshold.** No study backs
"20,000 tokens is where things get bad" for any given model or context
window. It is a single adjustable constant (`packages/core/src/doctor/scoring.ts`)
precisely so it can be revisited without touching the formula shape.

`estimateTokens()` (`packages/core/src/context/estimate-tokens.ts`) is a
`chars / 4` heuristic — a common rough approximation, not a real tokenizer.
Both facts are stated in the report itself: the score's `method` field is
always `'estimated'`, never `'measured'`.

## Real fixture → tokens → score table

Measured by running `packages/core/tests/doctor/scoring.test.ts` against
the real fixture files in `packages/core/tests/fixtures/context-sizes/`
(not hand-typed numbers):

| Fixture   | File size | Estimated tokens | Score |
|-----------|-----------|-------------------|-------|
| minimal   | 0 bytes   | 0                 | 100   |
| small     | 632 B     | 158               | 100   |
| medium    | 34,410 B  | 8,603             | 100   |
| large     | 97,409 B  | 24,353            | 78    |
| extreme   | 1,103,912 B | 275,978         | 0     |

## Validated properties (see `scoring.test.ts`)

- **Monotonic non-increasing**: score never goes up as always-loaded token
  count goes up (tested across the 5 fixtures above, in order).
- **Bounded [0, 100]**: verified at every fixture size, at exactly the
  budget boundary, and at 1000× the budget.
- **0 bytes → 100**: an empty/absent always-loaded config scores perfectly.
- **At exactly the budget → 100**: the formula's boundary is inclusive.
- **Missing `estimatedTokens` field → treated as 0, never throws.**
- **`method` is always `'estimated'`**, never presented as measured fact.

## What is still NOT validated (stated explicitly, not hidden)

- The 20,000-token budget itself is not empirically justified — it is a
  starting assumption. Changing it is a one-line, low-risk change
  (`CONTEXT_BUDGET_TOKENS`), and doing so does not require touching this
  score's shape or its tests.
- `chars/4` token estimation is a rough heuristic; real tokenization can
  differ meaningfully depending on language, code vs. prose, and the
  model's actual tokenizer.
- The score currently only penalizes `alwaysLoaded` tokens. It does not
  attempt to score `onDemandPotential` (skill/agent body size) because that
  cost is not confirmed to be incurred in a given session — see
  `docs/PRIVACY.md` and `ContextBreakdown.loadedActive` (`method: 'unknown'`
  by design in Phase 1).
