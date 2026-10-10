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
