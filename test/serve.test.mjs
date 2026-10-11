import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/serve.mjs';

test('the server gives the page, the scenarios and the player modules, and nothing else', async () => {
  const server = createServer({ scenarios: [{ id: 'a', title: 'Releasing an album' }] });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    const html = await home.text();
    assert.match(html, /<title>Releasing an album<\/title>/);
    assert.match(html, /importmap/);
    assert.deepEqual(await (await fetch(base + '/scenarios.json')).json(), [{ id: 'a', title: 'Releasing an album' }]);
    const mod = await fetch(base + '/src/player.mjs');
    assert.equal(mod.status, 200);
    assert.match(mod.headers.get('content-type'), /javascript/);
    for (const bad of ['/src/../package.json', '/src/%2e%2e%2fpackage.json', '/package.json', '/src/nope.mjs']) {
      assert.equal((await fetch(base + bad)).status, 404, bad);
    }
  } finally {
    server.close();
  }
});

test('the server serves a scenario\'s bundled images, and nothing outside assets', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'sim-serve-'));
  mkdirSync(join(root, 'assets', 'album'), { recursive: true });
  writeFileSync(join(root, 'assets', 'album', 'g1.jpg'), 'jpg');
  writeFileSync(join(root, 'secret.jpg'), 'no');
  const server = createServer({ scenarios: [], assetsRoot: root });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const ok = await fetch(base + '/assets/album/g1.jpg');
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'image/jpeg');
    for (const bad of ['/assets/../secret.jpg', '/assets/album/../../secret.jpg', '/secret.jpg', '/assets/album/nope.jpg']) assert.equal((await fetch(base + bad)).status, 404, bad);
  } finally { server.close(); }
});

test('a page with no title of its own is the Supersuit Session demo, the name readers see (renamed 2026-10-11)', async () => {
  const { page } = await import('../src/serve.mjs');
  const html = page();
  assert.match(html, /<title>Supersuit Session demo<\/title>/);
  assert.doesNotMatch(html, /Supersuit Simulator/);
});
