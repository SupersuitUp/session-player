// Renamed 2026-10-11 (Gary): @supersuit/simulator became @supersuit/session-player. The old CLI name
// stays as an alias so nothing scripted against it breaks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const wf = readFileSync(new URL('../.github/workflows/publish.yml', import.meta.url), 'utf8');

test('the package is @supersuit/session-player, with the old CLI name kept as an alias', () => {
  assert.equal(pkg.name, '@supersuit/session-player');
  assert.equal(pkg.bin['session-player'], 'bin/simulator.mjs');
  assert.equal(pkg.bin.simulator, 'bin/simulator.mjs');
  assert.match(pkg.repository.url, /SupersuitUp\/session-player\.git$/);
});

test('the publish guard checks the package it publishes', () => {
  assert.match(wf, /npm view "@supersuit\/session-player@\$PKG"/);
  assert.doesNotMatch(wf, /npm view "@supersuit\/simulator@/);
});
