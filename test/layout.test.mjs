// LAYOUT, measured in a real browser (SupersuitUp/session-player#2, seen 2026-10-28 on a live case
// study at 390x844 in 'Auto · this phone'): with no drawn device the session clock pill sat in the
// Claude-skin header, whose title is centred absolutely, so '9:03' was drawn over the session title
// and its 'MacBook Pro' line. Static markup cannot see overlap, so this renders the player into
// Chromium at the phone's size and compares boxes.
//
// Needs Playwright, which is not a dependency of the package: it is resolved with require(), so
// NODE_PATH pointing at a folder that has it works. Without it the test skips and says why.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SimulatorPlayer } from '../src/player.mjs';
import { boardScenario } from './fixtures.mjs';

let playwright = null;
try { playwright = createRequire(import.meta.url)('playwright'); } catch { /* skipped below */ }
const skip = playwright ? false : 'playwright is not installed (set NODE_PATH to a node_modules that has it)';

const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function boxes(props, viewport) {
  const html = renderToStaticMarkup(h(SimulatorPlayer, { scenario: boardScenario(), start: 'auto', ...props }));
  const browser = await playwright.chromium.launch();
  try {
    const page = await browser.newPage({ viewport });
    await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body style="margin:0;background:#111">${html}</body></html>`);
    return await page.evaluate(() => {
      const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { x: r.x, y: r.y, width: r.width, height: r.height } : null; };
      const clocks = [...document.querySelectorAll('.ss-timepill')].map(box).filter(Boolean);
      const head = document.querySelector('.ss-head');
      return {
        clocks,
        title: box(head?.querySelector('.ss-titles b')),
        subtitle: box(head?.querySelector('.ss-titles small')),
        titles: box(head?.querySelector('.ss-titles')),
      };
    });
  } finally { await browser.close(); }
}

test('real phone at 390 px: the session clock is visible and never drawn over the header title', { skip }, async () => {
  const b = await boxes({ viewer: 'phone' }, { width: 390, height: 844 });
  assert.ok(b.titles && b.title, 'the header title is on screen');
  assert.equal(b.clocks.length, 1, 'exactly one session clock is shown');
  const [clock] = b.clocks;
  assert.ok(!overlap(clock, b.titles), `clock ${JSON.stringify(clock)} overlaps the title block ${JSON.stringify(b.titles)}`);
  assert.ok(!overlap(clock, b.title) && !overlap(clock, b.subtitle), 'clock overlaps the title or the MacBook Pro line');
  assert.ok(clock.x >= 0 && clock.x + clock.width <= 390, 'the clock is inside the viewport');
});

test('forced MacBook on a phone at 390 px: the window header clock does not cover the title either', { skip }, async () => {
  const b = await boxes({ viewer: 'phone', device: 'macbook' }, { width: 390, height: 844 });
  assert.ok(b.title, 'the header title is on screen');
  for (const clock of b.clocks) assert.ok(!overlap(clock, b.title), `clock ${JSON.stringify(clock)} overlaps ${JSON.stringify(b.title)}`);
});
