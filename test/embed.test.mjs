import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { PLAYER_CSS } from '../src/player-css.mjs';
import { SimulatorPlayer } from '../src/player.mjs';
import { propsFromAttributes } from '../src/embed.mjs';
import { createServer, page } from '../src/serve.mjs';

test('nothing in the player is fixed to the viewport, so it never covers the page that hosts it', () => {
  assert.doesNotMatch(PLAYER_CSS, /position:\s*fixed/);
  assert.match(PLAYER_CSS, /\.ss-sim\{[^}]*position:relative/);
});

const sc = (id, name) => ({ format: 'supersuit-simulator/1', id, title: `A day as ${name}`, persona: { name }, source: { kind: 'session' }, chapters: [],
  turns: [{ id: 't1', at: 0, human: { text: `go ${name}`, via: 'typed', choices: [] }, intervention: null, steps: [], replies: [], artifacts: [] }], artifacts: [], cuts: [] });

test('an embed can open one scenario from a list directly, skipping the picker, at a set height', () => {
  const html = renderToString(h(SimulatorPlayer, { scenarios: [sc('a', 'Dana'), sc('b', 'Marcus')], scenarioId: 'b', height: '560px' }));
  assert.match(html, /go Marcus/);
  assert.doesNotMatch(html, /Step into someone/);
  assert.match(html, /--ss-height:560px/);
});

test('the custom element reads its switches from attributes', () => {
  assert.deepEqual(propsFromAttributes({ src: '/s.json', scenario: 'b', artifacts: 'off', timeline: 'off', autoplay: '', height: '600px' }),
    { src: '/s.json', scenarioId: 'b', artifacts: false, timeline: false, autoplay: true, height: '600px', device: undefined, start: undefined });
  assert.deepEqual(propsFromAttributes({ src: '/s.json' }), { src: '/s.json', scenarioId: undefined, artifacts: true, timeline: true, autoplay: true, height: undefined, device: undefined, start: undefined });
});

test('the embed page is bare, for an iframe, and passes its query switches through', async () => {
  const html = page({ embed: true });
  assert.match(html, /scenarioId: q\.get\('scenario'\)/);
  assert.match(html, /body\{margin:0;padding:0;background:transparent\}/);
  const server = createServer({ scenarios: [sc('a', 'Dana')] });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/embed?scenario=a&timeline=off`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /background:transparent/);
  } finally { server.close(); }
});

test('the "made" button floats inside the conversation area, never over the composer', () => {
  const html = renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Dana') }));
  const wrap = html.indexOf('class="ss-log-wrap"');
  const handle = html.indexOf('class="ss-tray-handle"');
  const composer = html.indexOf('class="ss-composer"');
  assert.ok(wrap > -1 && handle > wrap && handle < composer, 'handle sits inside the log wrapper, before the composer');
  assert.doesNotMatch(PLAYER_CSS, /ss-tray-handle\{[^}]*bottom:84px/);
});

// Walks the rendered tags and returns the class chain of the first element whose class matches.
function ancestry(html, cls) {
  const stack = [];
  for (const t of html.replace(/<style>[\s\S]*?<\/style>/, '').matchAll(/<(\/?)(div|footer|header|aside|section|button|figure)([^>]*)>/g)) {
    if (t[1]) { stack.pop(); continue; }
    const c = (t[3].match(/class="([^"]*)"/) || [])[1] || '';
    if (c.split(' ').includes(cls)) return [...stack, c];
    stack.push(c);
  }
  return null;
}

test('the composer and the conversation both live inside the phone', () => {
  const html = renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Dana') }));
  for (const cls of ['ss-composer', 'ss-log', 'ss-tray-handle']) {
    const chain = ancestry(html, cls);
    assert.ok(chain && chain.includes('ss-phone'), `${cls} is not inside ss-phone: ${JSON.stringify(chain)}`);
  }
});
