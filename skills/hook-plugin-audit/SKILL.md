---
name: hook-plugin-audit
description: Audit installed hooks — including hooks bundled inside a plugin package's own hooks/hooks.json, not just settings.json — for risky commands (pipe-to-shell, recursive delete, eval of external input) and figure out which plugin/scope each one came from. Use when reviewing what a plugin actually does, before enabling a new plugin, or when a hook fires unexpectedly and its origin is unclear.
origin: O2B
version: 1.0.0
tags: [hooks, plugins, security, claude-code]
---

## Purpose

Answer "what hooks actually run in this session, and where did each
one come from" — a plugin's bundled hooks are just as active as the
ones in `settings.json`, but far less visible to a user reading their
own config.

## When to Activate

Before enabling a new plugin, when auditing security posture, or when
a hook's behavior is unexplained and `settings.json` alone doesn't
account for it.

## Inputs

`o2b doctor --json` (or `o2b scan` for the security-only view). Look
at `inventory.hooks` (each entry has `sourcePath` and `event`) and
`inventory.plugins` (each has `providedCapabilities`).

## Workflow

1. List every hook, grouped by `sourcePath`. A path under
   `plugins/cache/<plugin>/.../hooks/hooks.json` came from a plugin
   package, not from the user's own `settings.json`/
   `settings.local.json` — say so explicitly.
2. Cross-reference against `inventory.plugins`: a plugin with `hooks`
   in `providedCapabilities` is expected to contribute hooks; one
   without it but that still shows up as a hook source is worth a
   second look.
3. Check `riskFlags` on each hook (`skips-permission-checks`,
   `recursive-delete`, `pipe-to-shell`) and treat any hit as
   high-priority regardless of source.
4. For plugins, note whether they appear in `enabledPlugins` per the
   adapter's warnings — an installed-but-not-enabled plugin's hooks
   are dormant, not active; don't conflate the two.

## Evidence Requirements

Always cite `sourcePath` and `event` for every hook mentioned. Never
say "a plugin has a risky hook" without naming which plugin and
quoting the `riskFlags` the scanner actually set.

## Confidence / Uncertainty

Hook presence is `measured`. Whether a hook actually fires in a given
session is `unknown` — this skill audits what's *registered*, not
what's *invoked*.

## Safety Rules

Never suggest disabling, deleting, or modifying a hook file directly —
O2B is read-only and this skill only produces a report for the user to
act on themselves.

## Anti-Patterns

- Treating `settings.json`'s hooks as the complete picture when
  plugins are installed — this was the single largest gap found in
  O2B's own dogfood (2 hooks visible → 34 real, once plugin hooks were
  included).
- Assuming a risky-looking command is malicious without checking
  whether it's a documented, intentional part of the plugin (e.g. a
  legitimate installer script).

## Expected Output

A table: hook event, command (redacted if needed), source (settings.json
vs. which plugin), risk flags, and whether the owning plugin is enabled.

## Related O2B Skills

`environment-inventory`, `security-scan`.
