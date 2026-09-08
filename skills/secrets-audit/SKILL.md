---
name: secrets-audit
description: Look for hardcoded secrets across agent/harness configuration files (CLAUDE.md, AGENTS.md, settings.json, .mcp.json). Use when reviewing a config change or before committing configuration files.
---

Scan the changed configuration files for hardcoded API keys, tokens, and
private key blocks (this overlaps with O2B's `secrets` scanner category).
Never reproduce a full secret found — describe its shape/location and the
remediation instead.
