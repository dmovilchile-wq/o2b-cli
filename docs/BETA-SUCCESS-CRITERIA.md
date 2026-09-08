# O2B Private Beta — Success Criteria (defined before receiving results)

Locked at freeze time (0.2.0-beta.1), before any external tester has run
O2B. These criteria are not to be adjusted after seeing results to make
O2B look better — if a threshold turns out to be wrong, that itself is a
finding to report, not something to quietly redefine.

## Primary signal

**Did O2B reveal at least one useful thing the tester did not already know?**

This is the single most important question. Everything else is secondary.

## Secondary signals

- Successful installation
- Successful `doctor` execution (no P0/P1 crash/blocker)
- Inventory accuracy (tester's own judgment vs. what they know is installed)
- False-positive rate
- False negatives discovered manually by the tester
- Useful security findings
- Useful conflict findings
- Optimize usefulness
- Would reinstall
- Would recommend
- Willingness to pay
- Requested Pro capabilities

## Success criteria (experimental thresholds, not statistical evidence — 5 testers is not a sample size that supports statistical claims)

- **TECHNICAL SUCCESS**: 4/5 testers complete install + `doctor` with no P0/P1 blocker.
- **VALUE SUCCESS**: at least 2/5 testers discover something useful they did not already know.
- **QUALITY WARNING**: severe false positives or dangerous recommendations reported by ≥2 testers.
- **COMMERCIAL SIGNAL**: at least 1 tester expresses real interest in paying for a specific Pro capability.

These thresholds are a working heuristic for this first private round, not
a validated statistical bar. They will not be changed retroactively once
results start coming in — if they turn out to be miscalibrated, that gets
written down as a finding for the *next* round, not silently edited here.
