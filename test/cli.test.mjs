import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { session } from './fixtures.mjs';

const BIN = fileURLToPath(new URL('../bin/simulator.mjs', import.meta.url));
// Run from a temp dir: the CLI must work from outside its repo, as the README says.
const dir = mkdtempSync(join(tmpdir(), 'simulator-'));
const cli = (...a) => spawnSync(process.execPath, [BIN, ...a], { cwd: dir, encoding: 'utf8' });

test('--help works and no command is a usage error', () => {
  assert.equal(cli('--help').status, 0);
  assert.match(cli('--help').stdout, /simulator convert/);
  assert.equal(cli().status, 2);
  assert.equal(cli('frobnicate').status, 2);
});

test('convert writes a scenario that validate accepts', () => {
  const src = join(dir, 's.jsonl');
  writeFileSync(src, session().human('go').tool('Write', { file_path: '/tmp/x.md' }).say('done').jsonl());
  const out = join(dir, 's.json');
  const r = cli('convert', src, '--out', out, '--title', 'A run', '--json');
  assert.equal(r.status, 0, r.stderr);
  const summary = JSON.parse(r.stdout);
  assert.equal(summary.turns, 1);
  assert.equal(summary.artifacts, 1);
  assert.equal(JSON.parse(readFileSync(out, 'utf8')).title, 'A run');
  assert.equal(cli('validate', out).stdout.trim(), 'valid');
});

test('validate exits 1 and names the problem', () => {
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, JSON.stringify({ format: 'nope' }));
  const r = cli('validate', bad);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /format/);
});

test('a session with no human turns is refused with exit 1', () => {
  const src = join(dir, 'empty.jsonl');
  writeFileSync(src, session().meta('x').jsonl());
  const r = cli('convert', src);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no human turns/);
});

test('tidy applies fixes from a file and refuses a rewrite', () => {
  const src = join(dir, 't.jsonl');
  writeFileSync(src, session().human('ckise').jsonl());
  const sc = join(dir, 't.json');
  assert.equal(cli('convert', src, '--out', sc).status, 0);
  writeFileSync(join(dir, 'fix.json'), JSON.stringify({ t1: 'close' }));
  const out = join(dir, 't2.json');
  assert.equal(cli('tidy', sc, '--fixes', join(dir, 'fix.json'), '--out', out).status, 0);
  assert.equal(JSON.parse(readFileSync(out, 'utf8')).turns[0].human.text, 'close');
  writeFileSync(join(dir, 'bad.json'), JSON.stringify({ t1: 'please shut the whole session down now' }));
  assert.equal(cli('tidy', sc, '--fixes', join(dir, 'bad.json')).status, 1);
});
