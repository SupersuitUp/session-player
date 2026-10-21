// The player's accent is the sixth stripe of the Continental Works ribbon. Source of truth:
// continental-works-universe canon/craft/the-ascent.json. On 2026-10-12 Gary changed that stripe
// from tomato #DB371F to mulberry #A12A5E (it was raspberry #C22D55 for about an hour that
// evening) and renamed the token with it ("Update color name and update Abu and propagate across
// all surfaces"). This file pins the new accent and refuses every form of the old ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER_CSS } from '../src/player-css.mjs';

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('the accent is mulberry, defined once on .ss-sim and used by name', () => {
  assert.match(PLAYER_CSS, /\.ss-sim\{[^}]*--ss-mulberry:#A12A5E;/);
  assert.equal(PLAYER_CSS.match(/--ss-mulberry:/g).length, 1, 'defined once');
  assert.ok(PLAYER_CSS.match(/var\(--ss-mulberry\)/g).length >= 10, 'the rules that drew in the accent still do');
  assert.match(PLAYER_CSS, /\.ss-sim \.ss-startbtn\{[^}]*background:var\(--ss-mulberry\);color:#fff/, 'the Start button');
  // The mic is a glyph inside the text field since 0.10.0, so mulberry is its colour, not a fill.
  assert.match(PLAYER_CSS, /\.ss-sim \.ss-mic\{[^}]*color:var\(--ss-mulberry\)/, 'the mic');
  assert.match(PLAYER_CSS, /\.ss-kicker\{[^}]*color:var\(--ss-mulberry\)/, 'kickers');
  assert.match(PLAYER_CSS, /\.ss-dot\{[^}]*background:var\(--ss-mulberry\)/, 'dots');
});

test('nothing of tomato, deep red or the hour of raspberry survives', () => {
  for (const gone of [/tomato/i, /#DB371F/i, /#D63219/i, /#C22D55/i, /219,\s*55,\s*31/, /214,\s*50,\s*25/, /194,\s*45,\s*85/, /#efc2b8/i]) {
    assert.doesNotMatch(PLAYER_CSS, gone, `still drawing the old sixth stripe: ${gone}`);
  }
  // No var() may name a custom property the sheet does not define: a half-renamed property
  // draws nothing and reports nothing.
  const defined = new Set([...PLAYER_CSS.matchAll(/(--ss-[a-z-]+):/g)].map((m) => m[1]));
  for (const [, name, fallback] of PLAYER_CSS.matchAll(/var\((--ss-[a-z-]+)(,)?/g)) {
    assert.ok(defined.has(name) || fallback, `${name} is used and never defined`);
  }
});

test('the MacBook wallpaper ends on the sixth stripe', () => {
  assert.match(PLAYER_CSS, /\.ss-mac-screen\{[^}]*linear-gradient\([^)]*#E9A23B 88%,#A12A5E 100%\)/);
});

test('white on mulberry reads as body text, and mulberry reads on the cream surfaces', () => {
  assert.ok(contrast('#FFFFFF', '#A12A5E') >= 4.5, 'white on the Start button');
  assert.ok(contrast('#A12A5E', '#FBF5E7') >= 4.5, 'kickers and names on paper');
  assert.ok(contrast('#A12A5E', '#FFFAF0') >= 4.5, 'kickers on the close card');
});

test('on the dark terminal no accent text is mulberry, which would sit near 2.4:1 there', () => {
  assert.ok(contrast('#A12A5E', '#1A1918') < 3, 'the reason this rule exists');
  const term = PLAYER_CSS.match(/\.ss-term \.ss-who,[^{]*\{color:#d97757\}/);
  assert.ok(term, 'the terminal accent rule');
  for (const sel of ['.ss-term .ss-who', '.ss-term .ss-redirect', '.ss-term .ss-panel h3 span']) assert.ok(term[0].includes(sel), `${sel} uses the terminal accent`);
  assert.match(PLAYER_CSS, /\.ss-term \.ss-startbtn\{background:#d97757\}/);
  assert.match(PLAYER_CSS, /\.ss-term \.ss-mic\{color:#d97757\}/);
});
