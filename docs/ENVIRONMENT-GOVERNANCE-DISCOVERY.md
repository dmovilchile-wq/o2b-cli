# O2B — Environment Governance Discovery (from Super Prompt Maestro v2.1)

Date: 2026-09-08. **Product discovery only — no code was written or
changed for this document.** O2B remains frozen at 0.2.0-beta.1 for
Private Beta (see `docs/PRIVATE-BETA-FREEZE-REPORT.md`); nothing here
was implemented.

## Method and scope

Source analyzed: `SUPER_PROMPT_MAESTRO_CLAUDE_CODE_v2.1.md`
("C:\Users\vvald\OneDrive\Escritorio\super programas en contruccion
claude\..."), a personal operating prompt for how *a human using Claude
Code* should orchestrate tools, classify risk, and demand evidence
during a coding session.

**What this document is not**: O2B will not become a prompt manager, will
not ship or reference the Super Prompt's text, and will not copy its
structure, wording, or examples. Every idea below is treated as a
*concept* extracted from the prompt's underlying philosophy — the
question asked for each is "does this describe a general problem in AI
coding *environments*, independent of this one person's prompt?" — not
"should O2B implement what this prompt says to do."

The prompt is fundamentally about **session-time behavior of an agent**
(what to verify, when to escalate, which tool to reach for). O2B is
fundamentally a **static, offline auditor of the environment an agent
would operate in** (what's installed, configured, conflicting, or
security-sensitive, before any session starts). Most of the value here
is in translating session-time *principles* into environment-time
*static or hybrid checks* — not in copying session orchestration logic,
which is out of scope for what O2B is.

---

## Concept matrix

Each row: CONCEPT / USER PROBLEM / CURRENT O2B COVERAGE / MISSING
CAPABILITY / STATICALLY MEASURABLE? / RUNTIME OBSERVABILITY REQUIRED? /
HEURISTIC OR MEASURED? / PRIVACY IMPACT / FALSE-POSITIVE RISK /
COMMERCIAL VALUE / TIER / PRIORITY.

### 1. Installed ≠ Available / Connected ≠ Functional

- **USER PROBLEM**: a user (or an agent orchestrating a session) assumes
  a capability works because it's *listed* as installed/connected, then
  wastes a session discovering it doesn't actually respond.
- **CURRENT O2B COVERAGE**: O2B already reports MCP servers as
  *configured* (present in `.mcp.json`/`.claude.json`), never as
  "connected" or "working" — this distinction already exists implicitly
  because O2B has never claimed more than static config presence.
- **MISSING CAPABILITY**: no explicit label distinguishing "I found this
  in config" from "I confirmed this responds." Today a user could
  misread "5 MCP servers" as "5 working MCP servers."
- **STATICALLY MEASURABLE?**: the "installed/configured" half, yes. The
  "functional" half, no — that requires actually invoking the tool
  (spawning the MCP server process, sending a real request), which is a
  fundamentally different, riskier operation than reading files.
- **RUNTIME OBSERVABILITY REQUIRED?**: only for the "functional" half.
- **HEURISTIC OR MEASURED?**: configured = MEASURED. Functional = would
  need its own explicit confidence tier (see Hypothesis 2 below).
- **PRIVACY IMPACT**: low for config presence (already covered by
  existing redaction rules); a "functional" check would mean O2B
  *executes* third-party MCP server binaries, which is a meaningfully
  different privacy/trust posture than reading files — cannot be default
  behavior of a privacy-first, zero-network tool.
- **FALSE-POSITIVE RISK**: current (configured-only) reporting has a
  real *false-confidence* risk if a user misreads a count as "working" —
  this is a labeling problem, fixable without new capability.
- **COMMERCIAL VALUE**: medium — "your MCP config lists things that
  don't actually work" is a genuinely useful diagnostic, but is inherently
  active/runtime work, harder to keep privacy-first and read-only.
- **TIER**: Community can fix the *labeling* now (free); actual
  functional verification is Pro-shaped (active probing, opt-in, with
  clear consent since it executes code).
- **PRIORITY**: **P1** for the labeling fix (cheap, high honesty value,
  fits Community's existing static model). **P2** for actual functional
  probing (real capability, real complexity/risk increase).

### 2. Tool budget / unnecessary tools / redundant capabilities

- **USER PROBLEM**: environments accumulate MCP servers/skills/plugins
  over time; nobody prunes, and nobody can see which additions actually
  earn their context/complexity cost.
- **CURRENT O2B COVERAGE**: `optimize` already recommends tools *for* a
  detected stack (profile-based), and `detectConflicts` already flags
  `redundant-mcp` (near-duplicate names). `POSSIBLY UNNECESSARY` review
  findings exist but were deliberately narrowed (earlier this session's
  hardening) to only fire on explicit `discourages` matches — avoiding
  the "anything not explicitly recommended = flag it" false positive.
- **MISSING CAPABILITY**: no notion of "this MCP server is configured
  but never referenced by anything in this project's stack" beyond the
  profile-discourage list; no per-tool context-cost attribution (how
  many always-loaded tokens does *this specific* MCP server/skill/hook
  cost, individually, not just in aggregate).
- **STATICALLY MEASURABLE?**: partially. Redundant-name detection: yes.
  "Unused" in the sense of never invoked: no (needs runtime evidence).
  "High complexity" as a raw count: yes, trivially.
- **RUNTIME OBSERVABILITY REQUIRED?**: only for true usage/redundancy
  (was this MCP server ever called this session/week).
- **HEURISTIC OR MEASURED?**: name-similarity redundancy = HEURISTIC
  (already labeled as such). Raw counts = MEASURED.
- **PRIVACY IMPACT**: none for counts; session-usage tracking (see
  Hypothesis 8) has real privacy implications and must stay opt-in local.
- **FALSE-POSITIVE RISK**: high if O2B ever asserts "unnecessary" without
  usage evidence — this is exactly the failure mode the user explicitly
  warned against ("sin asumir que más herramientas = peor"). Any output
  here MUST be framed as descriptive complexity, not a verdict.
- **COMMERCIAL VALUE**: high — "which of my 40 MCP servers actually get
  used" is a strong, differentiated pitch, but only defensible with real
  usage data (Pro/session-observability dependent).
- **TIER**: Community (static redundancy + counts, already exists).
  Pro (usage-backed "unused" claims, needs session observability).
- **PRIORITY**: **P1** for a static "context cost per installed item"
  breakdown (extends existing context analyzer, no new data source).
  **P2** for usage-backed unused-tool detection (depends on session
  observability, which is itself still a prototype).

### 3. Agent/skill explosion, activation overlap, fragmentation

- **USER PROBLEM**: as a catalog of skills/agents grows, near-duplicate
  capabilities compete for activation, confuse the agent about which to
  use, and inflate the always-loaded skill index.
- **CURRENT O2B COVERAGE**: O2B already builds exactly this check for
  its *own* catalog (`packages/core/tests/skills/catalog.test.ts` —
  word-overlap similarity on descriptions, duplicate-name detection).
  `detectConflicts`'s `similar-description` and `duplicate-name` types
  do the equivalent for a *scanned user environment's* skills/agents,
  not just O2B's own catalog.
- **MISSING CAPABILITY**: no "fragmentation" metric distinct from pairwise
  duplication — e.g. 5 skills that each do one-fifth of what could be one
  coherent skill (the user's explicit example: don't artificially split
  one capability into five skills). Detecting *this* pattern (not
  duplication, but over-fragmentation of one concern) is not just
  pairwise similarity — it needs some notion of a shared topic cluster
  across more than 2 items, and O2B doesn't have that today.
- **STATICALLY MEASURABLE?**: pairwise duplication/overlap, yes (already
  built). Cluster-level fragmentation, only partially — lexical
  clustering could approximate it but would be HEURISTIC, not MEASURED,
  and would need real validation against known-fragmented catalogs
  before shipping (risk of false positives on legitimately-separate but
  topically-adjacent skills).
- **RUNTIME OBSERVABILITY REQUIRED?**: no for detection; yes to confirm
  the *practical* cost (does the ambiguity actually cause misactivation
  in real sessions) — that would need session observability.
- **HEURISTIC OR MEASURED?**: HEURISTIC (word-overlap is already
  explicitly documented as "not a semantic model" in O2B's own test).
- **PRIVACY IMPACT**: none — operates only on names/descriptions already
  read.
- **FALSE-POSITIVE RISK**: high without semantic understanding — the
  existing 0.6 similarity threshold was chosen conservatively for O2B's
  own small catalog; scaling this to arbitrary user catalogs with
  domain-specific vocabulary (medical, legal, gamedev skill names) risks
  either missing real duplicates or flagging unrelated skills that share
  common words. **The user's own instruction not to use absolute count as
  a criterion is directly satisfied by the existing approach — extending
  it needs the same discipline, not a bigger number.**
- **COMMERCIAL VALUE**: medium-high — this is one of the more genuinely
  differentiated ideas versus ECC (which *generates* content, has no
  incentive to tell a user their content overlaps).
- **TIER**: Community (extend `similar-description` conflict type to
  arbitrary user environments — this is largely already covered).
- **PRIORITY**: **P2** for cluster-level fragmentation detection (real
  value, but needs a validated methodology before shipping — the user's
  own instruction is explicit: don't use absolute count, and by
  extension don't ship an undefended heuristic either).

### 4. Instruction hierarchy / scope precedence / stale instructions

- **USER PROBLEM**: multiple instruction sources (global CLAUDE.md,
  project CLAUDE.md, `.claude/rules/*.md`, `AGENTS.md`, settings) can
  contradict or duplicate each other, and nothing today tells a user
  which one actually wins, or which ones are stale/unreachable.
- **CURRENT O2B COVERAGE**: `detectConflicts`'s `contradictory-instruction`
  type already catches contradiction between global/project CLAUDE.md
  on shared topics (verified for real in this session's dogfood).
  Instruction *sources* are already fully inventoried
  (`InstructionSource`, including `.claude/rules` and
  `settings.local.json` sources from this cycle's hardening, with
  `alwaysLoaded` tracked per source).
- **MISSING CAPABILITY**: no explicit precedence *resolution* — O2B
  reports each source separately (by design, documented in
  `docs/BETA-QUICKSTART.md`'s known limitations) but never claims "this
  is the effective, winning instruction." No "stale instruction" concept
  at all (e.g. a `.claude/rules/*.md` with a `paths:` pattern that
  matches zero files in the current project).
- **STATICALLY MEASURABLE?**: precedence resolution, partially — Claude
  Code's own documented precedence order (managed > CLI > local >
  shared project > user, roughly) is public and could be applied as a
  static rule, *if* it's verified against current official docs rather
  than assumed. Staleness (a rule whose `paths:` glob matches nothing),
  yes, fully static.
- **RUNTIME OBSERVABILITY REQUIRED?**: no for either.
- **HEURISTIC OR MEASURED?**: precedence resolution = MEASURED if the
  rule itself is verified current and applied deterministically. Rule
  staleness = MEASURED (glob-match against real filesystem).
- **PRIVACY IMPACT**: none beyond what's already read.
- **FALSE-POSITIVE RISK**: precedence resolution has real risk of being
  *wrong* if the harness's actual resolution logic changes or has
  undocumented edge cases (e.g. plugin-provided instructions, which
  O2B's own dogfood already found are non-trivial). This must ship with
  explicit "per Claude Code's documented precedence as of <date>" framing,
  not asserted as universal truth.
- **COMMERCIAL VALUE**: high — "which instruction actually wins" is one
  of the most concretely useful things O2B could tell a user, directly
  matching the Super Prompt's own truth-hierarchy philosophy applied to
  environment config instead of session data sources.
- **TIER**: Community (stale-rule detection: cheap, static, low risk).
  Community-or-Pro split on precedence resolution depending on how much
  verification/maintenance the precedence table needs as harnesses
  evolve (a wrong precedence claim is worse than no claim).
- **PRIORITY**: **P1** for stale-rule detection (extends `.claude/rules`
  support already built). **P1** for precedence-order *display* next to
  each existing `contradictory-instruction` finding (small addition,
  high clarity value) — but **P2** for a fully resolved "effective
  instruction" feature, which needs harness-precedence research before
  it can be MEASURED rather than guessed.

### 5. Risk classification / evidence requirements / adaptive rigor

- **USER PROBLEM**: the Super Prompt classifies a *coding task's* risk
  (LOW/MEDIUM/HIGH/PRODUCTION) to scale how much verification is
  required. This is a session-time concept, not an environment-state
  concept — but the *underlying idea* (confidence should be proportional
  to what's actually knowable, and stated explicitly) is exactly what
  O2B already does with its `Confidence` type.
- **CURRENT O2B COVERAGE**: O2B's `measured`/`heuristic`/`estimated`/
  `unknown` confidence model *is* O2B's version of this principle,
  already applied per-finding, per-score, and per-context-line. This is
  not a gap — it's arguably O2B's most mature existing differentiator.
- **MISSING CAPABILITY**: O2B does not classify the *environment itself*
  by a risk tier the way the Super Prompt classifies a *task*. Explored
  directly in Hypothesis 1 below (Environment Governance Score) — the
  answer there is deliberately cautious.
- **STATICALLY MEASURABLE?**: n/a — this concept is a methodology, not a
  single check.
- **PRIVACY IMPACT**: none.
- **COMMERCIAL VALUE**: this principle *is* already O2B's brand
  differentiator (see `docs/COMPETITIVE-MATRIX.md`) — the discovery here
  is confirming it, not finding a gap.
- **TIER / PRIORITY**: **NO new capability** — this is already covered
  by existing architecture. The action item is to keep applying it with
  discipline as new capabilities are added (which is exactly what this
  document tries to do for every row above and below), not to build
  something new.

### 6. Verified vs. unverified capabilities (capability state)

See **Hypothesis 2** below — developed as its own dedicated section
because the user asked for a specific state model.

### 7. Context economy / environment complexity

See **Hypothesis 7** below.

---

## Hypothesis-by-hypothesis findings

### 1. Environment Governance Score

**Can O2B score environment health/complexity without an arbitrary
number?**

**Finding: not defensibly, not as a single score, not yet.** O2B already
tried a single composite in one narrow area (Context Configuration
score, `packages/core/src/doctor/scoring.ts`) and that score is itself
explicitly `[ESTIMATED]` and documented as heuristic (a token-threshold
curve, not a validated model of actual harm). Generalizing that pattern
to a full "environment governance score" combining security + complexity
+ conflicts + context into one number would compound multiple heuristics
into a single figure that *looks* more authoritative than any of its
inputs — the exact failure mode O2B was built to avoid in other tools
(a single "health score" that hides what's actually known vs. guessed).

**What would make a governance score defensible**: (a) each input
already labeled MEASURED and (b) a published, fixed weighting formula
the user can inspect and disagree with, treated as a config choice, not
ground truth, plus (c) validation against real environments where the
score's ranking was checked against independent human judgment of
"which of these two environments would you rather inherit" — none of
which exists today.

**Recommendation**: **do not build a single Environment Governance
Score.** Instead, keep the existing four separate scores
(Security/Configuration/Context/Compatibility, each independently
labeled by confidence) and add the *descriptive* complexity breakdown
from Hypothesis 7 alongside them, un-scored. This is consistent with the
user's own instruction: don't implement a score without a defensible
methodology.

### 2. Capability State Model

**Can O2B model INSTALLED → CONFIGURED → AVAILABLE → FUNCTIONALLY
VERIFIED → OBSERVED USED, with UNKNOWN where there's no evidence?**

**Finding: yes, as a data model — but O2B can currently only ever
populate the first two states.**

| State | What it means | Can O2B populate this today? |
|---|---|---|
| INSTALLED | File/binary/package present on disk | Yes — this is what `inventory` already does |
| CONFIGURED | Present in a config file with correct shape (valid JSON, expected keys) | Yes — already implicit in every adapter's parsing (a malformed entry is skipped/flagged, not silently counted) |
| AVAILABLE | The underlying binary/service actually starts and responds to a trivial call | No — requires executing a process, which O2B does not and should not do by default (privacy-first, zero-network) |
| FUNCTIONALLY VERIFIED | A real, meaningful operation against it succeeded (the Super Prompt's own bar: `resolve-library-id` returning real docs, not just `Connected`) | No — same reason, and higher-risk (a "meaningful" call is task-specific, O2B has no task) |
| OBSERVED USED | Actually invoked during a real session | No — requires session-time hook data (the `experimental/session-observability` prototype), never enabled in Community by default |

This maps directly onto the honesty pattern O2B already uses for context
(`ESTIMATED` alwaysLoaded vs `UNKNOWN` loadedActive) — the same
`UNKNOWN`-by-default discipline should extend to capability state, not
just token counts.

**Recommendation**: worth building as a *reporting shape* now
(Community: every capability gets an explicit `state` field defaulting
to `configured`, with `available`/`functionallyVerified`/`observedUsed`
always `unknown` in Community) — this costs little (it's a schema/label
change on data O2B already has) and sets up a clean seam for Pro to fill
in the last three states later via opt-in active probing or session
observability, without redesigning the model then.

### 3. Tool Budget Analysis

Covered in concept matrix row 2 above. Summary: redundancy detection and
raw complexity counts are safely buildable now (static); "unnecessary"
in the sense of actually-unused requires usage evidence O2B doesn't
have, and asserting it without that evidence would violate the user's
explicit instruction not to assume "more tools = worse."

### 4. Agent/Skill Explosion

Covered in concept matrix row 3 above. Pairwise duplication/overlap:
already built (and validated against O2B's own catalog this session).
Cluster-level fragmentation: real idea, not yet defensible as MEASURED,
would need a validated methodology (not absolute count) before shipping.

### 5. Evidence Confidence

O2B's `Confidence` type already has 4 of the 5 states the user asked to
explore: `measured` / `heuristic` / `estimated` / `unknown`.
`functionallyVerified` is the one genuinely new state (see Hypothesis 2)
— everything else the user asked to "explore" already exists and is
enforced (no percentage-style fabricated confidence anywhere in the
codebase; this was explicitly checked during this session — a search for
fabricated confidence-percentage patterns across `packages/core/src`
found none).

### 6. Instruction Governance

Covered in concept matrix row 4 above. The Conflict Engine is the right
home for this — extending it with stale-rule detection and
precedence-order display is a natural, low-risk next increment; full
precedence *resolution* is higher-value but higher-risk (wrong precedence
claims are actively misleading) and needs harness-documentation research
first, not just implementation.

### 7. Environment Complexity

**Descriptive metrics, not a score**, per the user's explicit framing.
O2B already measures every one of the raw counts requested: MCP count,
skills, agents, hooks, plugins, instruction sources (all in
`InventorySnapshot`), always-loaded tokens (`ContextBreakdown`).
**Missing**: cross-harness duplicates (e.g. the same MCP server
configured separately for both Claude Code and Cursor — today each
harness's inventory is separate, never cross-referenced), and a
single "security-sensitive capability count" (e.g. how many configured
items can execute shell commands or reach the network — today this
exists implicitly across multiple scanner rules but isn't rolled into
one descriptive count next to the other complexity numbers).

**Recommendation**: add `crossHarnessDuplicates` and
`securitySensitiveCapabilityCount` as two more entries in the existing
descriptive breakdown — same shape as what's already there, explicitly
*not* a score, framed the same way O2B already frames the context
breakdown ("this describes complexity, it does not declare it good or
bad").

### 8. Session Observability Connection

The capabilities that would improve *most* if the local
`experimental/session-observability` prototype were ever activated (still
opt-in, still local-only, still unimplemented in Community per
`docs/PRO-DESIGN.md`):

1. **Capability state model** (Hypothesis 2) — `OBSERVED USED` is
   entirely gated on this; without it, that state is permanently
   `unknown`.
2. **Tool budget "unused tool" claims** (concept row 2) — currently must
   stay purely descriptive (redundancy, counts); session data is the
   only thing that could turn "this MCP server looks unused" from a
   guess into a MEASURED claim.
3. **`loadedActive` context cost** — already explicitly modeled as
   `[UNKNOWN]` in every `doctor` run today; this is the most direct,
   already-designed-for seam.
4. **Agent/skill activation overlap, validated** — session data could
   confirm whether two similar-description skills actually *do* compete
   for activation in practice, turning the current HEURISTIC
   similarity check into something empirically checked.

None of these should move from Community to "session-observability
required" by default — they'd remain fully functional in their current
static/heuristic form, with session observability as a strictly additive,
opt-in upgrade path to a higher confidence tier, consistent with the
existing UNKNOWN-by-default design.

### 9. Competitive Value

| Idea | Classification | Basis |
|---|---|---|
| Installed/Connected honesty labeling | POTENTIAL DIFFERENTIATOR | ECC is a content generator/provider — it has no structural incentive to audit whether *its own or others'* MCP servers actually work; `docs/COMPETITIVE-MATRIX.md` already establishes O2B occupies the "observer" role ECC structurally doesn't |
| Tool budget / redundancy detection | O2B DIFFERENT APPROACH | Already partially built (`redundant-mcp`); ECC's approach (per existing benchmark) is to provide curated content, not audit a user's accumulated config — different problem, not a head-to-head |
| Agent/skill fragmentation detection | POTENTIAL DIFFERENTIATOR | O2B already applies this rigor to its *own* catalog (documented in `docs/SKILLS-CATALOG-V0.3.md`); extending it to audit *any* environment's catalog, including one built by ECC itself, is structurally something ECC would not do to its own content |
| Instruction governance / precedence | ECC PARTIALLY DOES | ECC's own guidance documents a truth hierarchy *for session behavior*; it does not audit a real environment's *actual* instruction files for contradiction the way O2B's Conflict Engine already does and verified against a real dogfood — different layer, same underlying value |
| Capability state model (5-state) | NOT DIFFERENTIATED alone / POTENTIAL DIFFERENTIATOR combined with existing Confidence model | The general idea (installed≠available) is now widely understood industry-wide (it's explicit in this very Super Prompt, written by the user, not by O2B) — the differentiator isn't the idea, it's that O2B is the only tool in this comparison set that *structurally* refuses to claim a state it can't measure, everywhere, consistently |
| Environment complexity descriptive metrics | O2B DIFFERENT APPROACH | Already built, already the core of `doctor`; no direct ECC equivalent was found in the prior benchmark (`docs/SKILLS-BENCHMARK-ECC.md`) — ECC's skills describe how to *use* an environment well, not how to *measure* it |

No claim of "unique in the market" is made anywhere above beyond what
was directly checked against ECC's documented/observed behavior in this
repo's own prior research (`docs/COMPETITIVE-MATRIX.md`,
`docs/SKILLS-BENCHMARK-ECC.md`); no broader market research was
performed for this document, and none is claimed.

---

## TOP 5 future capabilities

Ranked by (value × defensibility), not by implementation ease alone.

### 1. Capability State labeling (INSTALLED/CONFIGURED explicit, others UNKNOWN by default)

- **WHY**: closes the exact gap the Super Prompt names directly
  ("installed ≠ available, connected ≠ functional") using O2B's own
  existing honesty discipline, with almost no new risk.
- **EVIDENCE REQUIRED**: none beyond what O2B already reads; this is a
  schema/labeling change on existing data.
- **IMPLEMENTATION COMPLEXITY**: low — extend existing inventory item
  shapes with a `state` field, default population logic, update report
  rendering.
- **TIER**: Community.
- **DEPENDENCIES**: none.
- **BETA VALIDATION NEEDED**: check whether testers currently misread
  "5 MCP servers" as "5 working MCP servers" — if the freeze-round
  feedback shows that confusion, it directly validates this as P1 for
  the *next* cycle.

### 2. Stale instruction / rule detection + precedence display

- **WHY**: directly extends the Conflict Engine (already O2B's most
  validated differentiator per the dogfood) into instruction governance,
  the area the user specifically asked to extend conceptually.
- **EVIDENCE REQUIRED**: current, verified Claude Code precedence
  documentation (must not be assumed/guessed) before shipping the
  precedence-display half; the stale-rule-glob half needs no external
  research, only filesystem matching already available.
- **IMPLEMENTATION COMPLEXITY**: low (staleness) to medium (precedence
  display, gated on documentation research).
- **TIER**: Community.
- **DEPENDENCIES**: none for staleness; harness documentation
  verification for precedence.
- **BETA VALIDATION NEEDED**: whether testers with `.claude/rules/`
  actually have stale/unreachable rules in practice — currently unknown,
  no real environment other than this session's own dogfood has been
  checked.

### 3. Environment complexity — cross-harness duplicates + security-sensitive capability count

- **WHY**: completes the existing descriptive-complexity breakdown
  (already built, already explicitly non-scored) with the two metrics
  the user asked about that aren't covered yet.
- **EVIDENCE REQUIRED**: none new — cross-references inventories O2B
  already collects per-harness.
- **IMPLEMENTATION COMPLEXITY**: low-medium (cross-harness matching
  needs a normalization step — e.g. matching an MCP server by command +
  args across two different config formats, which has real false-match
  risk and needs conservative matching rules).
- **TIER**: Community.
- **DEPENDENCIES**: none.
- **BETA VALIDATION NEEDED**: whether any of the 5 testers actually run
  more than one harness side-by-side (only then would cross-harness
  duplication be observable/valuable at all).

### 4. Tool budget — per-item context cost attribution

- **WHY**: turns the existing aggregate "always-loaded tokens" number
  into an actionable "which specific items are costing you the most,"
  directly serving the Super Prompt's tool-budget philosophy applied to
  environment state instead of session tool calls.
- **EVIDENCE REQUIRED**: none new — same token-estimation methodology
  already used, applied per-source instead of only in aggregate.
- **IMPLEMENTATION COMPLEXITY**: low — the aggregation logic already
  exists in `context/analyze.ts`; this decomposes it rather than adding
  a new data source.
- **TIER**: Community.
- **DEPENDENCIES**: none.
- **BETA VALIDATION NEEDED**: whether "my CLAUDE.md is huge" testers
  find a per-file breakdown actionable versus the current aggregate
  number — untested.

### 5. Agent/skill fragmentation clustering (beyond pairwise)

- **WHY**: the most conceptually novel idea in this document (not
  already built in any form) and the one with the clearest differentiation
  from ECC (which has no incentive to critique fragmentation of its own
  or a user's catalog) — but also the riskiest to get right.
- **EVIDENCE REQUIRED**: a validated methodology tested against several
  real (not synthetic) skill catalogs of varying legitimate specialization
  before shipping — the user's own instruction against "absolute count"
  applies with equal force against an undefended clustering heuristic.
- **IMPLEMENTATION COMPLEXITY**: medium-high — naive lexical clustering
  is cheap to build but has meaningfully higher false-positive risk than
  anything else in this list; doing it defensibly likely needs either a
  much larger validation set than O2B's own 8-skill catalog, or explicit
  framing as a low-confidence, opt-in-only signal.
- **TIER**: Community (opt-in, clearly labeled HEURISTIC) or deferred to
  Pro if validation can't clear the false-positive bar in Community's
  zero-tolerance-for-noise design goal.
- **DEPENDENCIES**: real-world skill catalogs to validate against —
  ideally from actual beta testers' environments (with their consent),
  which is itself a reason to defer this past round 1.
- **BETA VALIDATION NEEDED**: high — this is exactly the kind of idea
  that should wait for real tester environments (per the beta's own
  "accumulate evidence, don't build on one data point" policy) rather
  than being designed further from synthetic fixtures alone.

---

## Verdict

**DOES THE SUPER PROMPT REVEAL A NEW PRODUCT DIRECTION FOR O2B?**

# PARTIALLY

It does not reveal a new *direction* — O2B's existing direction
(privacy-first, read-only, evidence-graded environment auditing) already
structurally anticipates most of what the prompt cares about, because
both documents share the same underlying discipline ("don't claim more
certainty than you have"). What it reveals is a **vocabulary and a
checklist for extending the existing direction with more precision** —
several concrete, mostly low-risk increments to capability-state
labeling, instruction governance, and complexity description — rather
than a pivot.

**WHAT IS THE SINGLE MOST IMPORTANT NEW CAPABILITY?**

**Capability State labeling (#1 above): making "installed/configured"
vs. "available/functionally verified/observed used" an explicit,
UNKNOWN-by-default field on every inventory item, not just a documented
limitation.** It costs the least, risks the least (no new data source,
no new execution of third-party code), and it directly closes the exact
gap the user's own Super Prompt names as a recurring real-world failure
("installed ≠ available, connected ≠ functional") — while giving Pro a
clean, already-modeled seam to fill in later with real verification,
instead of needing a redesign when that day comes.

---

*No CLI, scanner, or skill files were modified for this document. No
beta tarball, version, or checksum changed. O2B remains frozen at
0.2.0-beta.1.*
