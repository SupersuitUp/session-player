// 0.6.0 (Gary, 2026-10-11): the player sits on any site. Transparent around the device unless a
// host asks for a colour; one <script> tag mounts <session-player>, sized to its content.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { SimulatorPlayer, backgroundFor, reportToHost, MESSAGE } from '../src/player.mjs';
import { PLAYER_CSS } from '../src/player-css.mjs';
import { propsFromAttributes } from '../src/embed.mjs';
import { page, createServer } from '../src/serve.mjs';

const sc = { format: 'supersuit-simulator/1', id: 'a', title: 'A day as Dana', persona: { name: 'Dana' }, source: { kind: 'session' }, chapters: [],
  turns: [{ id: 't1', at: 0, human: { text: 'go', via: 'typed', choices: [] }, intervention: null, steps: [{ label: 'x', ms: 1000 }], replies: [], artifacts: [] }], artifacts: [], cuts: [] };
const root = (props) => renderToString(h(SimulatorPlayer, { scenario: sc, viewer: 'desktop', ...props })).match(/<div class="ss-sim"[^>]*>/)[0];

test('transparent by default: nothing is painted outside the device', () => {
  assert.doesNotMatch(root({}), /background/);
  const rule = PLAYER_CSS.match(/\.ss-sim\{[^}]*\}/)[0];
  assert.doesNotMatch(rule, /background/, 'the root rule paints nothing');
  assert.doesNotMatch(page({ embed: true }), /body\{[^}]*background:(?!transparent)/);
});

test('a host can ask for a background: a colour, or the theme', () => {
  assert.match(root({ background: 'theme' }), /background:var\(--ss-cream\)/);
  assert.match(root({ background: '#ffffff' }), /background:#ffffff/);
  assert.equal(backgroundFor('transparent'), undefined);
  assert.equal(backgroundFor('red;position:fixed'), undefined, 'a colour, never a declaration');
  assert.equal(backgroundFor('url(x)'), undefined);
  assert.equal(propsFromAttributes({ src: '/s', background: 'theme' }).background, 'theme');
  assert.equal(propsFromAttributes({ src: '/s', bg: '#000' }).background, '#000');
  assert.match(page({ embed: true }), /background: q\.get\('bg'\) \?\? undefined/);
});

test('inside an iframe the player reports its height to the host, and only there', () => {
  const posted = [];
  let observed;
  class RO { constructor(cb) { this.cb = cb; } observe(el) { observed = el; } disconnect() {} }
  const parent = { postMessage: (m, o) => posted.push([m, o]) };
  let height = 612.2;
  const el = { getBoundingClientRect: () => ({ height }) };
  const stop = reportToHost(el, { parent }, RO);
  assert.equal(observed, el);
  assert.deepEqual(posted[0], [{ type: MESSAGE.height, height: 613 }, '*']);
  assert.equal(typeof stop, 'function');
  const top = {}; top.parent = top;
  const none = [];
  reportToHost(el, top, RO);
  assert.equal(none.length, 0, 'a top-level page posts nothing');
});

// A blank page, as small as a DOM gets: enough to run the loader as a browser would.
function blankPage(scriptSrc) {
  const defined = {}, listeners = {};
  class HTMLElement { constructor() { this.attrs = {}; this.children = []; this.style = {}; } getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; } appendChild(c) { this.children.push(c); } }
  const iframes = [];
  const document = {
    currentScript: { src: scriptSrc, getAttribute: () => null },
    createElement: (t) => { const f = { tag: t, style: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, contentWindow: {}, events: [], dispatchEvent(e) { this.events.push(e); } }; iframes.push(f); return f; },
    getElementsByTagName: () => iframes,
  };
  const window = { innerHeight: 900, addEventListener: (t, f) => { listeners[t] = f; }, customElements: { get: (n) => defined[n], define: (n, c) => { defined[n] = c; } } };
  window.window = window;
  const ctx = vm.createContext({ window, document, HTMLElement, URL, location: { href: 'https://example.org/blog/post' }, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } } });
  vm.runInContext(readFileSync(new URL('../src/loader.js', import.meta.url), 'utf8'), ctx);
  return { defined, listeners, iframes };
}

test('one <script> tag on a blank page mounts <session-player> as an iframe of the embed page, with the defaults', () => {
  const { defined, iframes } = blankPage('https://continentalworks.ai/simulator/embed.js');
  assert.ok(defined['session-player'], 'the tag is defined');
  const el = new defined['session-player']();
  el.attrs = { scenario: 'phone-rescue', background: 'theme' };
  el.connectedCallback();
  el.connectedCallback();
  assert.equal(iframes.length, 1, 'mounted once');
  const u = new URL(iframes[0].src);
  assert.equal(u.origin + u.pathname, 'https://continentalworks.ai/simulator/embed');
  assert.equal(u.searchParams.get('scenario'), 'phone-rescue');
  assert.equal(u.searchParams.get('bg'), 'theme');
  assert.equal(u.searchParams.get('height'), '760px', 'the device height comes from the host window');
  for (const k of ['autoplay', 'start', 'device']) assert.equal(u.searchParams.get(k), null, `${k} keeps the player default`);
  assert.match(iframes[0].style.cssText, /background:transparent/);
  assert.match(iframes[0].style.cssText, /width:100%/);
});

test('the iframe takes the height the player reports, and passes the end of a session on', () => {
  const { defined, listeners, iframes } = blankPage('https://continentalworks.ai/simulator/embed.js');
  const el = new defined['session-player']();
  el.attrs = { scenario: 'x' };
  el.connectedCallback();
  const f = iframes[0];
  listeners.message({ source: {}, data: { type: MESSAGE.height, height: 400 } });
  assert.notEqual(f.style.height, '400px', 'another window cannot resize it');
  listeners.message({ source: f.contentWindow, data: { type: MESSAGE.height, height: 812.4 } });
  assert.equal(f.style.height, '813px');
  listeners.message({ source: f.contentWindow, data: { type: MESSAGE.done, scenario: 'x' } });
  assert.equal(f.events.at(-1).type, 'session-player:done');
  listeners.message({ source: f.contentWindow, data: 'not ours' });
});

test('the local server serves the loader at /embed.js', async () => {
  const server = createServer({ scenarios: [sc] });
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/embed.js`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /customElements\.define\('session-player'/);
  server.close();
});
