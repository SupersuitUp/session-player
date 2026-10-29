// The session clock: every simulated device shows the session's time, its start plus the
// work done so far, never the viewer's now; a real phone gets it as a small pill in the header;
// and the MacBook window's tighter text lives in the player's own sheet, scoped to a whole laptop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { SimulatorPlayer, FEATURES } from '../src/player.mjs';
import { PLAYER_CSS } from '../src/player-css.mjs';
import { sessionStart, sessionTime, menuBarText, statusText, normalizeClock } from '../src/clock.mjs';
import { validate } from '../src/scenario.mjs';
import { propsFromAttributes } from '../src/embed.mjs';

const sc = (source = {}, device) => ({
  format: 'supersuit-simulator/1', id: 'a', title: 'Rescue', persona: { name: 'Dana' }, ...(device ? { device } : {}),
  source: { kind: 'session', date: '2026-10-10', ...source }, chapters: [],
  turns: [{ id: 't1', at: 0, human: { text: 'Fix it', via: 'typed' }, intervention: null, steps: [{ label: 'fix', ms: 120000, count: 1 }], replies: [], artifacts: [] }],
  artifacts: [], cuts: [],
});
const parts = (d) => [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()];

test('a session starts at its recorded startedAt, else nine in the morning on its date, never the viewer now', () => {
  assert.deepEqual(parts(sessionStart(sc())), [2026, 9, 10, 9, 0], 'no time of day recorded');
  assert.deepEqual(parts(sessionStart(sc({ startedAt: '2026-10-10T14:03:00' }))), [2026, 9, 10, 14, 3], 'a recorded start wins');
  assert.deepEqual(parts(sessionStart(sc({ startedAt: 'not a time' }))), [2026, 9, 10, 9, 0], 'an unreadable start is ignored, not shown as Invalid Date');
  assert.equal(sessionStart({ turns: [] }).getHours(), 9, 'no date at all: still a fixed morning');
  assert.equal(statusText(sessionTime(sc(), 13 * 60000)), '9:13', 'it moves with the work done');
  assert.equal(menuBarText(sessionTime(sc({ startedAt: '2026-10-10T14:03:00' }), 120000)), 'Sat Oct 10  2:05 PM');
  assert.equal(statusText(sessionTime(sc(), NaN)), '9:00');
  assert.equal(normalizeClock('WALL'), 'wall');
  assert.equal(normalizeClock(undefined), 'session');
  assert.equal(normalizeClock('sideways'), 'session');
});

test('a real phone draws no device, so the session time sits as a pill in the counter above the screen, never in the header', () => {
  const html = renderToString(h(SimulatorPlayer, { scenario: sc(), viewer: 'phone' }));
  assert.match(html, /class="ss-timepill"[^>]*>9:00</);
  assert.match(html, /class="ss-counter ss-out"[\s\S]*?class="ss-timepill"[\s\S]*?<\/div>/, 'the pill is in the counter');
  assert.doesNotMatch(html.match(/<header class="ss-head"[\s\S]*?<\/header>/)[0], /ss-timepill/, 'and not over the centred title (session-player#2)');
  assert.doesNotMatch(html, /class="ss-status-time"|class="ss-clock"/);
  const timed = renderToString(h(SimulatorPlayer, { scenario: sc({ startedAt: '2026-10-10T14:03:00' }), viewer: 'phone' }));
  assert.match(timed, /class="ss-timepill"[^>]*>2:03</, 'source.startedAt reaches the phone');
});

test('the drawn iPhone and the MacBook show the session time in their own bars', () => {
  const iphone = renderToString(h(SimulatorPlayer, { scenario: sc({ startedAt: '2026-10-10T14:03:00' }), viewer: 'desktop' }));
  assert.match(iphone, /class="ss-status-time"[^>]*>2:03</);
  assert.doesNotMatch(iphone, /class="ss-timepill"/, 'the status bar already shows it');
  const mac = renderToString(h(SimulatorPlayer, { scenario: sc({}, 'macbook'), viewer: 'desktop' }));
  assert.match(mac, /class="ss-clock"[^>]*>Sat Oct 10  9:00 AM</);
  assert.match(mac, /class="ss-timepill"/, 'drawn for the lidless MacBook; the sheet hides it inside a whole laptop');
  const compact = renderToString(h(SimulatorPlayer, { scenario: sc(), viewer: 'phone', device: 'macbook' }));
  assert.match(compact, /class="ss-timepill"[^>]*>9:00</, 'the phone-width window has no menu bar either');
});

test("clock: 'wall' keeps the viewer's own time, for a host that wants it", () => {
  const html = renderToString(h(SimulatorPlayer, { scenario: sc(), viewer: 'phone', clock: 'wall' }));
  const shown = html.match(/class="ss-timepill"[^>]*>([^<]+)</)[1];
  assert.equal(shown, statusText(new Date()));
  assert.equal(propsFromAttributes({ src: '/s', clock: 'wall' }).clock, 'wall');
  assert.equal(propsFromAttributes({ src: '/s' }).clock, undefined);
});

test('the player says what it does itself, so a host can stop doing it from outside', () => {
  assert.deepEqual({ ...FEATURES }, { sessionClock: true, phoneClock: true, macbookText: true });
});

test('startedAt, when a scenario carries one, must be a date and time', () => {
  assert.deepEqual(validate(sc({ startedAt: '2026-10-10T14:03:00' })), []);
  assert.deepEqual(validate(sc()), []);
  assert.match(validate(sc({ startedAt: 'tea time' })).join('\n'), /source\.startedAt must be a date and time/);
  assert.match(validate(sc({ startedAt: 1760100000 })).join('\n'), /source\.startedAt/);
});

test("the MacBook window's tighter text holds only in a whole laptop, and never reaches a phone", () => {
  assert.match(PLAYER_CSS, /\.ss-sim\{[^}]*container:ss-sim ss-player\/inline-size/, 'the root carries a name the window inside it does not');
  const css = PLAYER_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const m = css.match(/@container ss-player \(min-width:560px\)\{\n([\s\S]*?)\n\}\n/);
  assert.ok(m, 'the MacBook rules sit inside the width the player draws a whole laptop at');
  assert.match(m[1], /\.ss-mac \.ss-term \.ss-phone[^{]*\{[^}]*font-size:clamp\(10\.5px,1\.3cqw,12px\)/);
  assert.match(m[1], /\.ss-mac \.ss-timepill\{display:none\}/, 'the menu bar shows the time in a whole laptop');
  const rules = m[1].split('}').filter((r) => r.includes('{'));
  assert.ok(rules.length > 20);
  for (const r of rules) {
    for (const s of r.split('{')[0].split(',').map((x) => x.trim())) assert.match(s, /^(\.ss-sim )?\.ss-mac /, `${s} would also restyle the phone`);
  }
  assert.match(css, /\.ss-timepill\{[^}]*border-radius:999px[^}]*font-variant-numeric:tabular-nums/);
});
