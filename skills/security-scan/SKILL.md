---
name: security-scan
description: Run O2B's own security scanner (@o2b/scanner) over a project — secrets, permissions, hooks, MCP, and instruction-injection patterns. Use before shipping changes to agent/harness configuration.
---

Run `node <path-to-o2b>/packages/cli/bin/o2b.js scan <path>` (or `doctor`
for the full picture including conflicts and context). Report each finding
with its severity and confidence label. Never restate a secret in full —
only the redacted evidence the scanner already produced.
