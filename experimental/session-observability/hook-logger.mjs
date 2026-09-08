#!/usr/bin/env node
// EXPERIMENTAL — Fase D session-observability spike. NOT wired into any
// real Claude Code settings.json. Never install this in ~/.claude — see
// docs/SESSION-OBSERVABILITY-SPIKE.md for the investigation this
// prototype is based on and its explicit scope/limits.
//
// Reads ONE Claude Code hook event (JSON) from stdin, keeps only an
// explicit allowlist of fields, pseudonymizes session_id, computes
// `duration` when it can pair a PostToolUse with an in-memory-recorded
// PreToolUse (same process only — this is a spike, not a daemon), and
// appends one JSONL line to the file named by O2B_OBSERVABILITY_LOG.
//
// Allowed to persist: timestamp, hookEventName, toolName, agentType,
// sessionIdHash, durationMs.
// Never read or persisted, even if present in the input: prompt text,
// file contents, tool arguments/results, any credential-shaped value.

import { createHash } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_OUTPUT_KEYS = [
  'timestamp',
  'hookEventName',
  'toolName',
  'agentType',
  'sessionIdHash',
  'durationMs',
];

export function hashSessionId(sessionId) {
  if (!sessionId) return undefined;
  return createHash('sha256').update(String(sessionId)).digest('hex').slice(0, 16);
}

// In-memory only, per-process — a real implementation would need a
// small local state file to pair Pre/Post across separate hook
// invocations (each hook call is a fresh process); left as a documented
// next step rather than adding file-based state to a spike.
const pendingStarts = new Map();

export function transformHookEvent(input, nowMs = Date.now()) {
  const event = {
    timestamp: new Date(nowMs).toISOString(),
    hookEventName: input?.hook_event_name,
    toolName: input?.tool_name,
    agentType: input?.agent_type,
    sessionIdHash: hashSessionId(input?.session_id),
  };

  const pairKey = `${event.sessionIdHash}:${event.toolName}`;
  if (event.hookEventName === 'PreToolUse') {
    pendingStarts.set(pairKey, nowMs);
  } else if (event.hookEventName === 'PostToolUse' && pendingStarts.has(pairKey)) {
    event.durationMs = nowMs - pendingStarts.get(pairKey);
    pendingStarts.delete(pairKey);
  }

  // Strip undefined keys and anything not on the allowlist — defense in
  // depth even though we only ever set allowlisted keys above.
  const clean = {};
  for (const key of ALLOWED_OUTPUT_KEYS) {
    if (event[key] !== undefined) clean[key] = event[key];
  }
  return clean;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const logPath = process.env.O2B_OBSERVABILITY_LOG;
  if (!logPath) {
    console.error('O2B_OBSERVABILITY_LOG not set — refusing to guess a default path. Exiting without writing anything.');
    process.exit(1);
  }
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    console.error('hook-logger: invalid JSON on stdin, ignoring event.');
    process.exit(0);
  }
  const record = transformHookEvent(input);
  await appendFile(logPath, JSON.stringify(record) + '\n', 'utf8');
  process.exit(0);
}

// Only run main() when invoked directly as a script (not when a test
// imports this module just to reach the pure functions above). Compares
// normalized filesystem paths rather than raw URL strings, which is not
// reliable across platforms (Windows path separators, URL-encoding).
const isDirectRun = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isDirectRun) {
  main();
}
