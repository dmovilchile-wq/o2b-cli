# O2B Private Beta — Change Policy During Beta

Rules for how (and how fast) to react to tester feedback during the
0.2.0-beta.x private beta window. The point is to avoid turning the beta
into development directed by whichever tester happens to speak first.

## Severity classes

- **P0 — security/privacy**: fix immediately. Examples: a real secret
  leaking into a "sanitized" report, O2B accidentally writing to
  `~/.claude`/`~/.codex`, a network call O2B should never make.
- **P1 — crash / data correctness**: fix immediately, ship as a beta
  patch (new version + new checksum, see Versioning below). Examples: a
  crash on a valid config, a wrong score/count that misrepresents the
  environment.
- **P2 — false positive / product quality**: record it. Fix only if it
  reproduces, or if it appears across multiple testers — not on a single
  report alone.
- **P3 — feature request**: do NOT implement during this beta round.
  Record it in the tester's file and in the synthesis. Feature requests
  are input to the *next* planning cycle, not to this freeze.
- **P4 — cosmetic**: backlog, no action during beta.

## Versioning

If a real P0/P1 is found and fixed during beta:

```
0.2.0-beta.1 → 0.2.0-beta.2
```

Never silently replace the same tarball/version in place. Every beta
build that goes out the door has its own checksum, and the report that
comes back from a tester should be checked against the checksum of the
build that was actually sent to them.

## What this policy protects against

Beta testing should produce *evidence*, not a queue of unreviewed
feature requests turned into commits. Accumulate findings across
multiple testers (see `docs/BETA-TESTER-ANALYSIS-PROCEDURE.md`) before
deciding what's worth building next.
