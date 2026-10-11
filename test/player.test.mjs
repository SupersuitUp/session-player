import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { SimulatorPlayer, Board, Asked } from '../src/player.mjs';

const sc = (id, name) => ({
  format: 'supersuit-simulator/1', id, title: `A day as ${name}`, persona: { name, role: 'founder' },
  source: { kind: 'session' }, chapters: [],
  turns: [{ id: 't1', at: 0, human: { text: 'Ship the album', via: 'typed', choices: [] }, intervention: null, steps: [{ label: 'download', tool: 'Bash', ms: 431000, count: 1, at: 431000 }], replies: [], artifacts: [] }],
  artifacts: [], cuts: [],
});

test('one scenario opens straight on the phone with the first command ready to send', () => {
  assert.match(renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Gary') })), /sending on autoplay/);
  const html = renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Gary'), autoplay: false }));
  assert.match(html, /tap to send/);
  assert.match(html, /Ship the album/);
  assert.match(html, /No work yet/);
  assert.match(html, /Made for/);
  assert.match(html, /ss-timeline/);
});

test('several scenarios open on the persona picker', () => {
  const html = renderToString(h(SimulatorPlayer, { scenarios: [sc('a', 'Dana'), sc('b', 'Marcus')] }));
  assert.match(html, /Step into someone/);
  assert.match(html, /Dana/);
  assert.match(html, /Marcus/);
  assert.doesNotMatch(html, /tap to send/);
});

test('the artifacts panel and the timeline can be switched off for a limited embed', () => {
  const html = renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Gary'), artifacts: false, timeline: false }));
  assert.doesNotMatch(html, /Made for|class="ss-tray-handle"|class="ss-panel"/);
  assert.doesNotMatch(html, /class="ss-timeline"/);
});

test('a recast scenario says on screen that it is illustrative', () => {
  const s = sc('a', 'Maya');
  s.source = { kind: 'persona', illustrative: true };
  assert.match(renderToString(h(SimulatorPlayer, { scenario: s })), /Illustrative: recast from a real session/);
  assert.doesNotMatch(renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Gary') })), /Illustrative/);
});

const two = (extra = {}) => ({ dismissed: false, questions: [
  { header: 'Cover', question: 'Which cover?', options: [{ label: 'Dancer', description: 'oil' }, { label: 'Cage', description: 'blue' }], answer: 'Dancer', chosen: 0 },
  { header: 'Date', question: 'Release when?', options: [{ label: 'Today' }, { label: 'Next week' }, { label: 'Later' }], answer: 'Today', chosen: 0 },
], ...extra });

test('the live board shows one question at a time, with a tab for each and the real pick hidden', () => {
  const html = renderToString(h(Board, { ask: two(), person: 'Gary', onPick: () => {} }));
  assert.equal((html.match(/<button[^>]*class="ss-opt/g) ?? []).length, 2);
  assert.match(html, /Which cover\?/);
  assert.doesNotMatch(html, /Release when\?/);
  assert.match(html, /class="ss-tab ss-tab-now"[^>]*>Cover/);
  assert.match(html, /class="ss-tab"[^>]*>Date/);
  assert.doesNotMatch(html, /ss-chosen/);
});

test('a dismissed board offers typing something else, and a typed answer is offered as Other', () => {
  const gone = renderToString(h(Board, { ask: { dismissed: true, questions: [{ question: 'Which?', options: [{ label: 'A' }], answer: null, chosen: null }] }, person: 'Gary', onPick: () => {} }));
  assert.match(gone, /Type something else/);
  const typed = renderToString(h(Board, { ask: { dismissed: false, questions: [{ question: 'When?', options: [{ label: 'Today' }], answer: 'Friday', chosen: null }] }, person: 'Gary', onPick: () => {} }));
  assert.match(typed, /Other/);
  assert.doesNotMatch(typed, /Friday/);
});

test('once answered, the conversation keeps a compact record: each question and what was chosen', () => {
  const html = renderToString(h(Asked, { ask: two(), person: 'Gary', ms: 40000 }));
  assert.match(html, /Which cover\?/);
  assert.match(html, /Dancer/);
  assert.match(html, /Release when\?/);
  assert.match(html, /Today/);
  assert.doesNotMatch(html, /Cage|Next week/);
  assert.match(html, /Gary chose/);
  const gone = renderToString(h(Asked, { ask: { dismissed: true, questions: [{ question: 'Which?', options: [{ label: 'A' }], answer: null, chosen: null }] }, person: 'Gary', ms: 1000 }));
  assert.match(gone, /Gary closed this and typed instead/);
});

test('the record notes where the viewer chose differently', () => {
  const html = renderToString(h(Asked, { ask: two(), person: 'Gary', ms: 1000, picks: { 0: { kind: 'option', index: 1 }, 1: { kind: 'option', index: 0 } } }));
  assert.match(html, /You picked Cage/);
});

test('before any work the counter says so, rather than "under a second"', () => {
  const html = renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Gary') }));
  assert.match(html, /No work yet/);
  assert.doesNotMatch(html, /under a second/);
});

test('images show: a gallery on a step, a thumbnail on a board option, and on a pasted command', () => {
  const s = sc('a', 'Gary');
  s.turns[0].human.images = [{ id: 'p', src: 'assets/a/p.png', caption: 'pasted' }];
  const html = renderToString(h(SimulatorPlayer, { scenario: s, autoplay: false }));
  assert.match(html, /tap to send/);
  const live = renderToString(h(Board, { ask: { dismissed: false, questions: [{ question: 'Which?', options: [{ label: 'Rain', image: { src: 'assets/a/rain.png' } }], answer: 'Rain', chosen: 0 }] }, person: 'Gary', onPick: () => {} }));
  assert.match(live, /<img[^>]*src="assets\/a\/rain.png"/);
});

test('the close card celebrates with measured numbers only, and never claims time saved', async () => {
  const { CloseCard } = await import('../src/player.mjs');
  const s = sc('a', 'Gary');
  s.close = { outcome: 'Album released.', edge: { total: 3, layers: { fueled: 0, encoded: 3, built: 0, retired: 0 }, sentence: 'You earned 3 edge points this session: 3 encoded.' }, freed: [{ task: 'releasing an album to streaming by hand', cadence: 'several times a month' }] };
  s.artifacts = [{ id: 'a1', kind: 'link', title: 'The album page', turn: 't1' }];
  const html = renderToString(h(CloseCard, { sc: s, person: 'Gary', onReplay: () => {} }));
  assert.match(html, /Album released\./);
  assert.match(html, /7 min/);             // Freeda's measured work in the fixture
  assert.match(html, /1 command/);
  assert.match(html, /3 edge points/);
  assert.match(html, /encoded/);
  assert.match(html, /permanently freed/);
  assert.match(html, /releasing an album to streaming by hand/);
  assert.match(html, /The album page/);
  assert.doesNotMatch(html, /saved/i);
});

test('a close card without edge or freed data leaves those lines out rather than inventing them', async () => {
  const { CloseCard } = await import('../src/player.mjs');
  const html = renderToString(h(CloseCard, { sc: sc('a', 'Gary'), person: 'Gary', onReplay: () => {} }));
  assert.doesNotMatch(html, /edge points|freed/);
  assert.match(html, /of work/);
});

test('one obvious Play: the Start card button is the big Play, and nothing else is a Play', () => {
  const html = renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Theo'), speed: 3, highlights: true })).replace(/<style>[\s\S]*?<\/style>/, '');
  // Wilson's big pulsing Play is the Start demo button (Gary's Start card), not a second control.
  assert.match(html, /<button[^>]*class="ss-startbtn"[^>]*><span class="ss-startplay" aria-hidden="true">\u25B6<\/span>Start demo<\/button>/);
  assert.equal((html.match(/\u25B6/g) ?? []).length, 1, 'exactly one Play glyph on the screen');
  assert.doesNotMatch(html, /aria-label="(Play|Pause)"/);
  // The header keeps Autoplay, on by default; the composer keeps Send and the mic.
  assert.match(html, /class="ss-auto"[\s\S]*?Autoplay/);
  assert.match(html, /aria-label="Say it out loud"/);
  assert.match(html, /aria-label="Send"/);
  // A host that opts into starting at once shows no Start card and still no extra Play.
  const auto = renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Theo'), start: 'auto', highlights: true })).replace(/<style>[\s\S]*?<\/style>/, '');
  assert.doesNotMatch(auto, /ss-startplay/);
  assert.doesNotMatch(auto, /\u25B6/);
});

test('the close card lists what Freeda handled when the scenario names it', async () => {
  const { CloseCard } = await import('../src/player.mjs');
  const one = { ...sc('a', 'Theo'), close: { outcome: 'Phone sorted.', handled: ['Searched six inboxes', 'Grabbed a same-day slot'] } };
  const html = renderToString(h(CloseCard, { sc: one, person: 'Theo', highlights: true, onReplay: () => {} }));
  assert.match(html, /What Freeda handled for Theo/);
  assert.match(html, /Grabbed a same-day slot/);
});

test('moments show one screen: the line small, where Freeda landed large, what is handled so far', async () => {
  const { Moment } = await import('../src/player.mjs');
  const plan = [{ command: { text: 'Is my phone covered?' }, events: [] }, { command: { text: 'Next' }, events: [] }];
  const log = [{ kind: 'command', key: 'c0' }, { kind: 'reply', key: '0-3', reply: { text: 'Your phone is covered.' } }];
  const made = [{ id: 'a1', kind: 'other', title: 'Coverage found', turnIndex: 0 }, { id: 'a2', kind: 'link', title: 'att.com', turnIndex: 0 }];
  const html = renderToString(h(Moment, { plan, turn: 0, log, made, person: 'Theo', phase: 'working' }));
  assert.match(html, /1 of 2/);
  assert.match(html, /class="ss-mbig"[^>]*>Your phone is covered\./);
  assert.match(html, /Coverage found/);
  assert.doesNotMatch(html, /att\.com/);
});

test('a moment never squeezes its lines: each part keeps its height, and the screen scrolls before it clips mid-line', async () => {
  const { PLAYER_CSS } = await import('../src/player-css.mjs');
  assert.match(PLAYER_CSS, /\.ss-moment>\*\{flex:none\}/);
  assert.match(PLAYER_CSS, /\.ss-moment\{[^}]*overflow-y:auto/);
});

test('in moments the composer does not repeat the line the moment already shows', () => {
  const strip = (x) => x.replace(/<style>[\s\S]*?<\/style>/, '');
  const one = { ...sc('a', 'Theo'), turns: [{ ...sc('a', 'Theo').turns[0], human: { text: 'Is my phone covered?', via: 'typed', choices: [] } }] };
  assert.doesNotMatch(strip(renderToString(h(SimulatorPlayer, { scenario: one, moments: true, start: 'auto' }))), /class="ss-chip"[^>]*>[\s\S]*?Is my phone covered\?/);
  assert.match(strip(renderToString(h(SimulatorPlayer, { scenario: one, start: 'auto' }))), /class="ss-chip"[^>]*>[\s\S]*?Is my phone covered\?/);
});
