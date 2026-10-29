// Renamed 2026-10-11 (Gary): @supersuit/simulator became @supersuit/session-player. The old CLI name
// stays as an alias so nothing scripted against it breaks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const workflows = new URL('../.github/workflows/', import.meta.url);

test('the package is @supersuit/session-player, with the old CLI name kept as an alias', () => {
  assert.equal(pkg.name, '@supersuit/session-player');
  assert.equal(pkg.bin['session-player'], 'bin/simulator.mjs');
  assert.equal(pkg.bin.simulator, 'bin/simulator.mjs');
  assert.match(pkg.repository.url, /SupersuitUp\/session-player\.git$/);
});

// Gary, 2026-10-28: "Why do we need session player on npm at all remove it". Its only installers
// are the two hosts that serve it (continental-works-site, supersuit-wiki), and they pin a commit of
// this repo with a github: dependency. So nothing may publish it to npm again, by tag or by hand.
test('the package is distributed from GitHub, never published to npm', () => {
  assert.equal(pkg.private, true, 'package.json must say "private": true so npm publish refuses');
  assert.equal(existsSync(new URL('publish.yml', workflows)), false, 'the npm publish workflow is gone');
  for (const f of existsSync(workflows) ? readdirSync(workflows) : []) {
    const wf = readFileSync(new URL(f, workflows), 'utf8');
    assert.doesNotMatch(wf, /npm publish|id-token: write/, `${f} must not publish to npm`);
  }
});
