// THE CLAUDE APP SKIN (Gary Sheng, 2026-10-28, watching a case study: "it doesn't look enough like
// Claude Code. It should look a lot more like Claude Code. Right now, it looks like we're misleading
// people into thinking that we have a separate app."). The device draws the Claude app's Code
// session screen: a "‹ Code" back label, the session title with the Mac's name under it, the
// activity spinner and the "…" button; replies as plain text; tool calls as compact rows; a board
// as the app's Question card; the dark field with a stop square and the orange send. What is
// asserted is what a person would notice missing, and that no Supersuit or Pluma name sits in the
// device's own chrome (the conversation keeps whatever names the scenario has).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SimulatorPlayer, Board, Asked } from '../src/player.mjs';
import { CLAUDE_CSS, PLAYER_CSS, MAISON_CSS } from '../src/player-css.mjs';
import { boardScenario } from './fixtures.mjs';

const strip = (html) => html.replace(/<style>[\s\S]*?<\/style>/, '');
const iphone = (props = {}) => strip(renderToStaticMarkup(h(SimulatorPlayer, { scenario: boardScenario(), viewer: 'desktop', device: 'iphone', start: 'auto', ...props })));
const header = (html) => html.match(/<header class="ss-head"[^>]*>([\s\S]*?)<\/header>/)[1];

test('the iPhone draws the Claude app header: a Code back label, the session title, the Mac under it, the spinner and the more button', () => {
  const head = header(iphone());
  assert.match(head, /class="ss-cc-back"[^>]*>[\s\S]*?Code</, 'the back label reads Code');
  assert.match(head, /class="ss-titles"[^>]*><b>Releasing an album<\/b><small>MacBook Pro<\/small>/);
  assert.match(head, /class="ss-cc-spin[^"]*"/, 'the activity spinner');
  assert.match(head, /class="ss-cc-more"[^>]*aria-label="More"/, 'the … button');
  assert.doesNotMatch(head, /Pluma|Supersuit|Autoplay|ss-avatar/, 'no Supersuit chrome in the header');
});

test("the player's own controls and counter sit outside the device, not in the Claude app's screen", () => {
  const html = iphone();
  const phone = html.slice(html.indexOf('class="ss-phone"'));
  assert.doesNotMatch(phone, /type="checkbox"[^>]*\/>Autoplay/, 'Autoplay is outside the phone');
  assert.doesNotMatch(phone, /class="ss-counter/, 'the work counter is outside the phone');
  assert.match(html, /type="checkbox"[^>]*\/>Autoplay/, 'and still on the page');
  assert.match(html, /No work yet/);
});

test('a live board is the Question card, and the typed Other answer opens inside it', () => {
  const html = renderToStaticMarkup(h(Board, { ask: boardScenario().turns[0].steps[1].ask, person: 'Sam', onPick: () => {} }));
  assert.match(html, /^<div class="ss-sheet ss-qcard"/);
  assert.match(html, /class="ss-qlabel">Question</);
  assert.match(html, /Which cover should go out with it\?/);
  assert.match(html, /data-ss-target="opt-0"/);
});

test('an answered board stays in the conversation as a Question card with the answer under it', () => {
  const html = renderToStaticMarkup(h(Asked, { ask: boardScenario().turns[0].steps[1].ask, person: 'Sam', ms: 42000 }));
  assert.match(html, /^<div class="ss-asked ss-qcard"/);
  assert.match(html, /class="ss-qlabel">Question</);
  assert.match(html, /class="ss-a">The cage</, 'the chosen answer, without an arrow in front of it');
});

test('tool calls are compact rows with the diamond and the chevron', async () => {
  const { StepLine } = await import('../src/player.mjs');
  const html = renderToStaticMarkup(h(StepLine, { step: { label: 'Read the track list', ms: 4000 } }));
  assert.match(html, /class="ss-step ss-tool"/);
  assert.match(html, /class="ss-cc-glyph"/);
  assert.match(html, /class="ss-label">Read the track list</);
  assert.match(html, /class="ss-chev"/);
});

test('the composer is the dark field with a mic, and the round orange send', () => {
  const html = iphone({ autoplay: false });
  const footer = html.match(/<footer class="ss-composer">([\s\S]*?)<\/footer>/)[1];
  assert.match(footer, /class="ss-send"[^>]*aria-label="Send"/);
  assert.match(CLAUDE_CSS, /\.ss-send\{[^}]*background:#c6613f/, 'the send is the app orange');
  assert.match(CLAUDE_CSS, /\.ss-sim \.ss-phone\[data-cc\]\{[^}]*background:#151515/, 'the screen is the app night');
  assert.match(html, /class="ss-phone" data-cc="phone"/);
});

test('the skin is drawn for every host and every theme, after the theme so it wins', () => {
  const plain = renderToStaticMarkup(h(SimulatorPlayer, { scenario: boardScenario(), viewer: 'desktop' }));
  assert.ok(plain.includes(CLAUDE_CSS.slice(0, 80)), 'drawn by default');
  const dressed = renderToStaticMarkup(h(SimulatorPlayer, { scenario: boardScenario(), viewer: 'desktop', theme: 'maison' }));
  assert.ok(dressed.indexOf(CLAUDE_CSS.slice(0, 80)) > dressed.indexOf(MAISON_CSS.slice(0, 80)), 'after the Maison sheet');
  assert.ok(!PLAYER_CSS.includes('data-cc'), 'the base sheet is untouched');
  const mac = strip(renderToStaticMarkup(h(SimulatorPlayer, { scenario: boardScenario({ device: 'macbook' }), viewer: 'desktop' })));
  assert.match(mac, /class="ss-phone" data-cc="desk"/, 'the MacBook window draws the desktop app');
});
