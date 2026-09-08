---
name: git-workflow
description: Standard git hygiene for this repo — check status/diff before destructive commands, stage intentionally, write clear commit messages. Use before any git operation that changes history or working tree state.
---

Run `git status`/`git diff` before any command that could discard work
(`checkout`, `restore`, `reset`, `clean`). Stage specific files, not `-A`.
Never use `--no-verify` or force-push without explicit user authorization.
