---
name: mcp-review
description: Review configured MCP servers for pinning, inlined secrets, and redundancy against other installed servers. Use before adding or changing an MCP server configuration.
---

Check each MCP server entry for: an unpinned `npx -y` install, a secret
value inlined directly instead of referencing the environment, and name
overlap with another already-installed server (O2B's `redundant-mcp`
conflict). Recommend the smallest safe change.
