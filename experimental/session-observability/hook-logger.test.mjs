// Run with: node --test experimental/session-observability/hook-logger.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashSessionId, transformHookEvent } from './hook-logger.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(here, 'hook-logger.mjs');

test('hashSessionId never returns the raw session id', () => {
  const hashed = hashSessionId('real-session-id-12345');
  assert.notEqual(hashed, 'real-session-id-12345');
  assert.equal(hashed.length, 16);
});

test('transformHookEvent only ever produces allowlisted keys', () => {
  const input = {
    session_id: 'sess-1',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    prompt: 'this must never appear in the output',
    file_contents: 'nor this',
    cwd: '/nor/this/either',
  };
  const out = transformHookEvent(input);
  const allowed = new Set(['timestamp', 'hookEventName', 'toolName', 'agentType', 'sessionIdHash', 'durationMs']);
  for (const key of Object.keys(out)) assert.ok(allowed.has(key), `unexpected key: ${key}`);
  assert.equal(JSON.stringify(out).includes('this must never appear'), false);
  assert.equal(JSON.stringify(out).includes('/nor/this/either'), false);
});

test('pairs PreToolUse -> PostToolUse into a computed durationMs', () => {
  const session = 'sess-pairing-test';
  const pre = transformHookEvent({ session_id: session, hook_event_name: 'PreToolUse', tool_name: 'Read' }, 1000);
  assert.equal(pre.durationMs, undefined);
  const post = transformHookEvent({ session_id: session, hook_event_name: 'PostToolUse', tool_name: 'Read' }, 1250);
  assert.equal(post.durationMs, 250);
});

test('refuses to write anywhere when O2B_OBSERVABILITY_LOG is unset', () => {
  const result = spawnSync(process.execPath, [scriptPath], {
    input: JSON.stringify({ session_id: 'x', hook_event_name: 'SessionStart' }),
    encoding: 'utf8',
    env: { ...process.env, O2B_OBSERVABILITY_LOG: '' },
  });
  assert.notEqual(result.status, 0);
});

test('end-to-end: writes exactly one sanitized JSONL line to the sandbox log path it is given', () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'o2b-observability-spike-'));
  const logPath = path.join(tmpDir, 'events.jsonl');
  const result = spawnSync(process.execPath, [scriptPath], {
    input: JSON.stringify({
      session_id: 'sandbox-session',
      hook_event_name: 'SessionStart',
      prompt: 'must never be written to disk',
    }),
    encoding: 'utf8',
    env: { ...process.env, O2B_OBSERVABILITY_LOG: logPath },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(logPath));
  const line = readFileSync(logPath, 'utf8').trim();
  const record = JSON.parse(line);
  assert.equal(record.hookEventName, 'SessionStart');
  assert.equal(JSON.stringify(record).includes('must never be written'), false);
});
