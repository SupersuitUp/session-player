import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { SimulatorPlayer, Board } from '../src/player.mjs';
const await_board = () => ({ Board });

const sc = (id, name) => ({
  format: 'supersuit-simulator/1', id, title: `A day as ${name}`, persona: { name, role: 'founder' },
  source: { kind: 'session' }, chapters: [],
  turns: [{ id: 't1', at: 0, human: { text: 'Ship the album', via: 'typed', choices: [] }, intervention: null, steps: [{ label: 'download', tool: 'Bash', ms: 431000, count: 1, at: 431000 }], replies: [], artifacts: [] }],
  artifacts: [], cuts: [],
});

test('one scenario opens straight on the phone with the first command ready to send', () => {
  const html = renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Gary') }));
  assert.match(html, /tap to send/);
  assert.match(html, /Ship the album/);
  assert.match(html, /of work done for/);
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

test('a decision is drawn as the question board, with the chosen option marked', () => {
  const s = sc('a', 'Gary');
  s.turns[0].steps.push({ label: 'asked: Which cover?', tool: 'AskUserQuestion', ms: 40000, count: 1, at: 471000, ask: { dismissed: false, questions: [{ header: 'Cover', question: 'Which cover?', options: [{ label: 'Dancer', description: 'oil' }, { label: 'Cage', description: 'blue' }], answer: 'Dancer', chosen: 0 }] } });
  const { Board } = await_board();
  const html = renderToString(h(Board, { ask: s.turns[0].steps[1].ask, person: 'Gary', ms: 40000 }));
  assert.match(html, /Cover/);
  assert.match(html, /Which cover\?/);
  assert.match(html, /class="ss-opt ss-chosen"[^>]*>.*Dancer/s);
  assert.match(html, /Cage/);
  assert.match(html, /Gary chose/);
});

test('an answer typed outside the options shows as the person\'s own words, and a dismissed board says so', () => {
  const { Board } = await_board();
  const typed = renderToString(h(Board, { ask: { dismissed: false, questions: [{ question: 'When?', options: [{ label: 'Today' }], answer: 'Friday', chosen: null }] }, person: 'Gary', ms: 1000 }));
  assert.match(typed, /ss-opt ss-chosen ss-other/);
  assert.match(typed, /Friday/);
  const gone = renderToString(h(Board, { ask: { dismissed: true, questions: [{ question: 'Which?', options: [{ label: 'A' }], answer: null, chosen: null }] }, person: 'Gary', ms: 1000 }));
  assert.match(gone, /Gary closed this and typed instead/);
});
