// Device framing (Gary, 2026-10-11): on a desktop the demo sits inside a device, an iPhone by
// default or a MacBook when the real session ran in a terminal on a Mac; on a phone it IS the
// phone. A MacBook is never crammed into a phone: there it is a window at phone width, labelled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { resolveDevice, classifyViewer, normalizeMode, deviceFromSession, DEVICES, MODES } from '../src/device.mjs';
import { SimulatorPlayer } from '../src/player.mjs';
import { validate } from '../src/scenario.mjs';
import { propsFromAttributes } from '../src/embed.mjs';
import { page } from '../src/serve.mjs';
import { convert } from '../src/convert.mjs';
import { recast } from '../src/recast.mjs';

test('the modes and devices are closed sets', () => {
  assert.deepEqual(MODES, ['auto', 'iphone', 'macbook']);
  assert.deepEqual(DEVICES, ['iphone', 'macbook']);
  for (const v of [undefined, null, '', 'ipad', 'AUTO ', 'Macbook']) assert.equal(normalizeMode(v), v === 'Macbook' ? 'macbook' : 'auto', String(v));
  assert.equal(normalizeMode(' iPhone '), 'iphone');
});

test('mode resolution: every mode on every viewer for every scenario device', () => {
  const cases = [
    // mode, viewer, scenario device -> frame, label
    ['auto', 'phone', undefined, 'none', null],
    ['auto', 'phone', 'iphone', 'none', null],
    ['auto', 'phone', 'macbook', 'none', null],
    ['auto', 'desktop', undefined, 'iphone', 'Simulating an iPhone'],
    ['auto', 'desktop', 'iphone', 'iphone', 'Simulating an iPhone'],
    ['auto', 'desktop', 'macbook', 'macbook', 'Simulating a MacBook'],
    ['iphone', 'phone', undefined, 'none', null],
    ['iphone', 'phone', 'macbook', 'none', null],
    ['iphone', 'desktop', undefined, 'iphone', 'Simulating an iPhone'],
    ['iphone', 'desktop', 'macbook', 'iphone', 'Simulating an iPhone'],
    ['macbook', 'desktop', undefined, 'macbook', 'Simulating a MacBook'],
    ['macbook', 'desktop', 'iphone', 'macbook', 'Simulating a MacBook'],
    // The protection: a laptop is never drawn inside a phone.
    ['macbook', 'phone', undefined, 'macbook-compact', 'Simulating a MacBook'],
    ['macbook', 'phone', 'macbook', 'macbook-compact', 'Simulating a MacBook'],
  ];
  for (const [mode, viewer, device, frame, label] of cases) {
    assert.deepEqual(resolveDevice({ mode, viewer, device }), { frame, label }, `${mode} on ${viewer} for ${device}`);
  }
  // Anything unknown falls back to auto, and an unknown scenario device to the iPhone.
  assert.deepEqual(resolveDevice({ mode: 'ipad', viewer: 'desktop', device: 'watch' }), { frame: 'iphone', label: 'Simulating an iPhone' });
});

test('detection reads capability signals, not width alone', () => {
  const phone = { width: 390, coarse: true, hoverNone: true, maxTouchPoints: 5 };
  assert.equal(classifyViewer(phone), 'phone');
  // A narrow desktop window has a mouse: still a desktop.
  assert.equal(classifyViewer({ width: 390, coarse: false, hoverNone: false, maxTouchPoints: 0 }), 'desktop');
  assert.equal(classifyViewer({ width: 1440, coarse: false, hoverNone: false, maxTouchPoints: 0 }), 'desktop');
  // A phone turned sideways is still a phone.
  assert.equal(classifyViewer({ width: 844, height: 390, coarse: true, hoverNone: true, maxTouchPoints: 5 }), 'phone');
  // An iPad, including iPadOS reporting itself as a Mac with touch, is a desktop when it is wide.
  assert.equal(classifyViewer({ width: 1024, height: 1366, coarse: true, hoverNone: true, maxTouchPoints: 5 }), 'desktop');
  assert.equal(classifyViewer({ width: 1180, height: 820, coarse: false, hoverNone: false, maxTouchPoints: 5, platform: 'MacIntel' }), 'desktop');
  // ...and in a narrow split view it is held like a phone.
  assert.equal(classifyViewer({ width: 500, height: 1180, coarse: false, hoverNone: true, maxTouchPoints: 5, platform: 'MacIntel' }), 'phone');
  // A touchscreen laptop whose primary pointer is a trackpad is a desktop.
  assert.equal(classifyViewer({ width: 600, height: 800, coarse: false, hoverNone: false, maxTouchPoints: 10 }), 'desktop');
  assert.equal(classifyViewer({}), 'desktop');
});

const sc = (extra = {}) => ({
  format: 'supersuit-simulator/1', id: 'a', title: 'A day as Dana', persona: { name: 'Dana' }, source: { kind: 'session' }, chapters: [],
  turns: [{ id: 't1', at: 0, human: { text: 'go Dana', via: 'typed', choices: [] }, intervention: null, steps: [], replies: [], artifacts: [] }],
  artifacts: [], cuts: [], ...extra,
});
// The markup without the player's own stylesheet, which names every class.
const markup = (el) => renderToString(el).replace(/<style>[\s\S]*?<\/style>/, '');
const render = (props) => markup(h(SimulatorPlayer, { scenario: sc(), ...props }));

test('a scenario may record where it ran, and only as an iPhone or a MacBook', () => {
  assert.deepEqual(validate(sc()), []);
  assert.deepEqual(validate(sc({ device: 'macbook' })), []);
  assert.deepEqual(validate(sc({ device: 'iphone' })), []);
  assert.match(validate(sc({ device: 'ipad' })).join(), /device must be one of iphone, macbook/);
});

test('an old scenario on a phone renders exactly as before: no frame, no label', () => {
  const html = render({ viewer: 'phone' });
  assert.match(html, /ss-frame-none/);
  assert.doesNotMatch(html, /Simulating/);
  assert.doesNotMatch(html, /ss-iphone|ss-mac-lid|ss-window/);
  assert.match(html, /go Dana/);
});

test('on a desktop the demo sits in an iPhone, labelled outside the screen', () => {
  const html = render({ viewer: 'desktop' });
  assert.match(html, /ss-frame-iphone/);
  assert.match(html, /class="ss-iphone"/);
  assert.match(html, /Simulating an iPhone/);
  const label = html.indexOf('Simulating an iPhone');
  const screen = html.indexOf('class="ss-iphone"');
  assert.ok(label > -1 && label < screen, 'the label sits before the device, not inside its screen');
});

test('a MacBook scenario on a desktop is drawn in a MacBook: lid, menu bar clock, Claude Code window, base', () => {
  const html = markup(h(SimulatorPlayer, { scenario: sc({ device: 'macbook' }), viewer: 'desktop' }));
  assert.match(html, /ss-frame-macbook/);
  for (const cls of ['ss-mac-lid', 'ss-mac-base', 'ss-menubar', 'ss-clock', 'ss-window', 'ss-traffic']) assert.match(html, new RegExp(`class="${cls}`), cls);
  assert.match(html, /Claude Code/);
  assert.match(html, /Simulating a MacBook/);
  assert.match(html, /go Dana/);
});

test('forcing a MacBook on a phone never draws a laptop: a window at phone width, with a persistent label', () => {
  const html = markup(h(SimulatorPlayer, { scenario: sc({ device: 'macbook' }), viewer: 'phone', device: 'macbook' }));
  assert.match(html, /ss-frame-macbook-compact/);
  assert.match(html, /class="ss-simpill"[^>]*>Simulating a MacBook/);
  assert.match(html, /class="ss-window/);
  assert.doesNotMatch(html, /ss-mac-lid|ss-mac-base|ss-menubar/);
});

test('an embedder can force a device, and the viewer can switch it on the demo itself', () => {
  assert.match(render({ viewer: 'desktop', device: 'macbook' }), /ss-frame-macbook/);
  assert.match(render({ viewer: 'desktop', device: 'iphone' }), /ss-frame-iphone/);
  const html = render({ viewer: 'desktop' });
  assert.match(html, /role="radiogroup" aria-label="Simulated device"/);
  for (const name of ['Auto', 'iPhone', 'MacBook']) assert.match(html, new RegExp(`role="radio"[^>]*>${name}<`), name);
  assert.match(html, /role="radio" aria-checked="true"[^>]*>Auto</);
});

test('the frame parts are decoration, hidden from screen readers', () => {
  const html = markup(h(SimulatorPlayer, { scenario: sc({ device: 'macbook' }), viewer: 'desktop' }));
  assert.match(html, /class="ss-mac-base" aria-hidden="true"/);
  assert.match(html, /class="ss-traffic" aria-hidden="true"/);
  assert.match(render({ viewer: 'desktop' }), /class="ss-island" aria-hidden="true"/);
});

test('the URL, the custom element and the served page all carry the device', () => {
  assert.equal(propsFromAttributes({ src: '/s.json', device: 'macbook' }).device, 'macbook');
  assert.equal(propsFromAttributes({ src: '/s.json' }).device, undefined);
  assert.match(page({ embed: true }), /device: q\.get\('device'\)/);
});

// The promote flow converts the real session, so the converter records where it ran when the
// transcript says so: typed into an interactive terminal (or the desktop app) on a Mac.
const line = (o) => JSON.stringify({ sessionId: 's', timestamp: '2026-01-01T00:00:00Z', ...o });
const humanLine = (entrypoint, promptSource, cwd = '/Users/someone/work') => line({ type: 'user', entrypoint, promptSource, cwd, origin: { kind: 'human' }, message: { content: 'ship it' } });

test('the converter marks a Mac terminal session as a MacBook, and leaves anything it cannot tell unset', () => {
  const parse = (s) => s.split('\n').map((l) => JSON.parse(l));
  assert.equal(deviceFromSession(parse([humanLine('cli', 'typed'), humanLine('cli', 'queued')].join('\n'))), 'macbook');
  assert.equal(deviceFromSession(parse(humanLine('claude-desktop', 'sdk'))), 'macbook');
  // Remote Control and the SDK: could be the phone or a browser, so not determinable.
  assert.equal(deviceFromSession(parse(humanLine('sdk-cli', 'sdk'))), undefined);
  // A terminal that is not a Mac is not a MacBook.
  assert.equal(deviceFromSession(parse(humanLine('cli', 'typed', '/home/someone/work'))), undefined);
  assert.equal(convert(parse(humanLine('cli', 'typed'))).device, 'macbook');
  assert.equal('device' in convert(parse(humanLine('sdk-cli', 'sdk'))), false);
  assert.equal(convert(parse(humanLine('sdk-cli', 'sdk')), { device: 'iphone' }).device, 'iphone');
});

test('a recast keeps where the real session ran', () => {
  const out = recast(sc({ device: 'macbook' }), { id: 'b', title: 'B', persona: { name: 'Bo' }, forbid: [] });
  assert.equal(out.device, 'macbook');
});
