// Gary (2026-10-11): "the demo needs a start demo button nonetheless." A session never starts on
// load: the device shows a Start demo card over its screen, with the Autoplay choice beside it.
// A host can opt into starting immediately with start: 'auto' (or ?start=auto).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { SimulatorPlayer, autoSendReady, startLine } from '../src/player.mjs';
import { propsFromAttributes } from '../src/embed.mjs';
import { page } from '../src/serve.mjs';

const sc = () => ({
  format: 'supersuit-simulator/1', id: 'a', title: 'A day as Dana', persona: { name: 'Dana' }, source: { kind: 'session' }, chapters: [],
  turns: [{ id: 't1', at: 0, human: { text: 'go Dana', via: 'typed', choices: [] }, intervention: null, steps: [{ label: 'x', ms: 120000 }], replies: [], artifacts: [] }],
  artifacts: [], cuts: [],
});
const markup = (props) => renderToString(h(SimulatorPlayer, { scenario: sc(), viewer: 'desktop', ...props })).replace(/<style>[\s\S]*?<\/style>/, '');

test('before it starts, the screen shows a Start demo card with the title, one line, and the Autoplay choice', () => {
  const html = markup({});
  assert.match(html, /class="ss-start"/);
  assert.match(html, /<button[^>]*class="ss-startbtn"[^>]*>[\s\S]*?Start demo<\/button>/);
  assert.match(html, /class="ss-start"[\s\S]*A day as Dana/);
  assert.match(html, /class="ss-start"[\s\S]*1 command from Dana, 2 min of work by Freeda/);
  assert.match(html, /class="ss-start"[\s\S]*<input type="checkbox" checked=""[^>]*\/>Autoplay/);
  // It sits inside the device's screen, not beside it.
  assert.ok(html.indexOf('class="ss-start"') > html.indexOf('class="ss-phone"'));
  assert.match(markup({ autoplay: false }), /class="ss-start"[\s\S]*You play Dana/);
});

test('a host can opt into starting immediately; nothing else can skip the card', () => {
  assert.doesNotMatch(markup({ start: 'auto' }), /class="ss-start"/);
  assert.match(markup({ start: 'manual' }), /class="ss-start"/);
  assert.match(markup({ start: 'yes please' }), /class="ss-start"/);
  assert.equal(propsFromAttributes({ src: '/s' }).start, undefined);
  assert.equal(propsFromAttributes({ src: '/s', start: 'auto' }).start, 'auto');
  assert.match(page({ embed: true }), /start: q\.get\('start'\) \?\? undefined/);
});

test('the highlights switches reach an embed by URL and by tag', () => {
  const p = page({ embed: true });
  assert.match(p, /speed: Number\(q\.get\('speed'\)\)/);
  assert.match(p, /highlights: q\.has\('highlights'\)/);
  assert.match(p, /moments: q\.has\('moments'\)/);
  assert.match(p, /maxSteps: Number\(q\.get\('steps'\)\)/);
  assert.match(p, /autoplay: q\.get\('autoplay'\) !== 'off'/);
  const t = propsFromAttributes({ src: '/s', speed: '3', highlights: '', moments: '', steps: '1' });
  assert.deepEqual([t.speed, t.highlights, t.moments, t.maxSteps], [3, true, true, 1]);
  const none = propsFromAttributes({ src: '/s' });
  assert.deepEqual([none.speed, none.highlights, none.moments, none.maxSteps], [undefined, false, false, undefined]);
});

test('autoplay never sends before Start is pressed', () => {
  assert.equal(autoSendReady({ auto: true, phase: 'ready', started: false }), false);
  assert.equal(autoSendReady({ auto: true, phase: 'ready', started: true }), true);
  assert.equal(autoSendReady({ auto: false, phase: 'ready', started: true }), false);
  assert.equal(autoSendReady({ auto: true, phase: 'working', started: true }), false);
});

test('the start line counts what was measured and nothing else', () => {
  assert.equal(startLine(sc(), 'Dana'), '1 command from Dana, 2 min of work by Freeda.');
});
