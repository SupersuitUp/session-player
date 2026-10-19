// THE MAISON THEME (0.10.0, Gary Sheng 2026-10-19: "case study player needs refinement of beauty").
// theme: 'maison' dresses the player in the Continental Works house (continental-works-universe
// canon/craft/the-maison.json): night, marble, bronze, ink, mist, travertine. What is asserted is what
// would fail silently: a text pair below 4.5:1, the default sheet changing for hosts that never asked,
// Claude Code's terminal repainted in marble, and the mic leaving the text field.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PLAYER_CSS, MAISON_CSS } from '../src/player-css.mjs';
import { SimulatorPlayer } from '../src/player.mjs';
import { propsFromAttributes } from '../src/embed.mjs';
import { readFileSync } from 'node:fs';
const scenario = {
  format: 'supersuit-simulator/1', id: 'a', title: 'A day as Dana', persona: { name: 'Dana' }, source: { kind: 'session' }, chapters: [],
  turns: [{ id: 't1', at: 0, human: { text: 'go Dana', via: 'typed', choices: [] }, intervention: null, steps: [{ label: 'x', ms: 120000 }], replies: [], artifacts: [] }],
  artifacts: [], cuts: [],
};

const TOKENS = { night: '#17171a', marble: '#f4f1ec', bronze: '#a8834f', ink: '#1c1a17', mist: '#d8d1c4', travertine: '#e8e0d2' };
const lum = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const token = (name) => MAISON_CSS.match(new RegExp(`--ss-${name}:(#[0-9a-f]{6})`, 'i'))[1].toLowerCase();

test('the theme uses the canon hexes, and every text pair reads at 4.5:1', () => {
  for (const [name, hex] of Object.entries(TOKENS)) assert.equal(token(name), hex, `--ss-${name}`);
  const pairs = [
    ['bronze-text', 'marble'], ['bronze-text', 'travertine'], ['muted', 'marble'], ['ink', 'marble'],
    ['marble', 'night'], ['mist', 'night'], ['night', 'bronze'],
  ];
  for (const [fg, bg] of pairs) assert.ok(contrast(token(fg), token(bg)) >= 4.5, `${fg} on ${bg}: ${contrast(token(fg), token(bg)).toFixed(2)}`);
  // bronze itself is not a text colour on marble: the reason --ss-bronze-text exists
  assert.ok(contrast(TOKENS.bronze, TOKENS.marble) < 4.5);
});

test('no Ascent colour survives in the theme', () => {
  // The terminal restore carries Claude Code's own colours, one of which is also an Ascent hex; it is checked below.
  const house = MAISON_CSS.split('\n').filter((l) => !l.includes('.ss-maison .ss-term')).join('\n');
  for (const gone of [/#A12A5E/i, /#265E72/i, /#E9A23B/i, /#69B1B5/i, /#EED79E/i, /#F6E7C5/i, /#FBF5E7/i]) assert.doesNotMatch(house, gone);
  assert.match(MAISON_CSS, /\.ss-maison \.ss-mac-screen\{background:radial-gradient\([^;]*var\(--ss-night\)/, 'the MacBook wallpaper is the house night, not the ribbon');
});

test('only a host that asks gets the theme; the default sheet is unchanged', () => {
  const plain = renderToStaticMarkup(h(SimulatorPlayer, { scenario, viewer: 'desktop' }));
  assert.doesNotMatch(plain, /ss-maison/);
  const dressed = renderToStaticMarkup(h(SimulatorPlayer, { scenario, viewer: 'desktop', theme: 'maison' }));
  assert.match(dressed, /class="ss-sim ss-maison"/);
  assert.ok(dressed.includes('.ss-sim.ss-maison{'), 'the theme sheet is drawn');
  assert.ok(!PLAYER_CSS.includes('ss-maison'), 'the default sheet never names the theme');
  assert.equal(propsFromAttributes({ theme: 'maison' }).theme, 'maison', 'the tag passes theme');
  assert.match(readFileSync(new URL('../src/loader.js', import.meta.url), 'utf8'), /theme: 'theme'/, 'the loader passes theme to the embed');
  assert.match(readFileSync(new URL('../src/serve.mjs', import.meta.url), 'utf8'), /theme: q\.get\('theme'\)/, 'the embed page reads ?theme=');
});

test("Claude Code's terminal keeps its own colours inside the theme", () => {
  const terminal = PLAYER_CSS.split('\n').filter((l) => /^(\.ss-sim )?\.ss-term[ .]/.test(l) && !/ss-start/.test(l));
  assert.ok(terminal.length > 30, 'the terminal rules were found');
  for (const l of terminal) {
    const restored = l.replace(/(^|,)(\.ss-sim )?\.ss-term/g, (_, sep, sim) => `${sep}${sim ? '.ss-sim' : ''}.ss-maison .ss-term`);
    assert.ok(MAISON_CSS.includes(restored), `not restored: ${l.slice(0, 60)}`);
  }
  // the restore comes after the screen rules, so it wins
  assert.ok(MAISON_CSS.indexOf('.ss-maison .ss-term .ss-phone{') > MAISON_CSS.indexOf('.ss-maison .ss-phone{'));
});

test('the mic is inside the text field, beside the message, not beside the send button', () => {
  const html = renderToStaticMarkup(h(SimulatorPlayer, { scenario, viewer: 'desktop', start: 'auto', autoplay: false }));
  const field = html.match(/<div class="ss-field">([\s\S]*?)<\/div>/);
  assert.ok(field, 'the composer has a field');
  assert.match(field[1], /class="ss-chip"/);
  assert.match(field[1], /class="ss-mic[^"]*"[^>]*aria-label="Say it out loud"/);
  assert.doesNotMatch(html, /\u{1F3A4}/u, 'the mic is a drawn glyph, not an emoji');
  assert.match(PLAYER_CSS, /\.ss-sim \.ss-mic\{position:absolute;right:6px;bottom:6px/);
});
