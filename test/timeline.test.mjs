import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { timelineFill, Timeline } from '../src/player.mjs';

// Two turns: the first has three working steps and one decision, the second one step.
const sc = {
  format: 'supersuit-simulator/1', id: 'x', title: 'x', persona: { name: 'Maya' }, source: { kind: 'session' }, chapters: [], artifacts: [], cuts: [],
  turns: [
    { id: 't1', at: 0, human: { text: 'go', via: 'typed', choices: [] }, intervention: null, replies: [], artifacts: [],
      steps: [{ label: 'a', ms: 1000, count: 1, at: 1000 }, { label: 'b', ms: 3000, count: 1, at: 4000 }, { label: 'pick', ms: 2000, ask: { q: 'which?' }, at: 6000 }, { label: 'c', ms: 4000, count: 1, at: 10000 }] },
    { id: 't2', at: 20000, human: { text: 'next', via: 'typed', choices: [] }, intervention: null, replies: [], artifacts: [],
      steps: [{ label: 'd', ms: 5000, count: 1, at: 25000 }] },
  ],
};

test('the agent block of the current turn fills with every step, not only at the handoff', () => {
  assert.deepEqual(timelineFill(sc, { turnIndex: 0, turnWorkMs: 0, turnAskMs: 0 })[0], { agent: 0, ask: 0 });
  assert.deepEqual(timelineFill(sc, { turnIndex: 0, turnWorkMs: 1000, turnAskMs: 0 })[0], { agent: 0.125, ask: 0 });
  assert.deepEqual(timelineFill(sc, { turnIndex: 0, turnWorkMs: 4000, turnAskMs: 2000 })[0], { agent: 0.5, ask: 1 });
});

test('turns before the current one are full, turns after it are empty', () => {
  const f = timelineFill(sc, { turnIndex: 1, turnWorkMs: 2500, turnAskMs: 0 });
  assert.deepEqual(f[0], { agent: 1, ask: 1 });
  assert.deepEqual(f[1], { agent: 0.5, ask: 0 });
  assert.deepEqual(timelineFill(sc, { turnIndex: 0, turnWorkMs: 0, turnAskMs: 0 })[1], { agent: 0, ask: 0 });
});

test('a finished session is full everywhere, and fill never passes 1', () => {
  const f = timelineFill(sc, { turnIndex: 1, turnWorkMs: 99999, turnAskMs: 99999, done: true });
  assert.deepEqual(f, [{ agent: 1, ask: 1 }, { agent: 1, ask: 1 }]);
  assert.equal(timelineFill(sc, { turnIndex: 1, turnWorkMs: 99999, turnAskMs: 0 })[1].agent, 1);
});

test('the rendered bar shows the partial fill of the turn in progress', () => {
  const html = renderToString(h(Timeline, { sc, turnIndex: 0, turnWorkMs: 4000, turnAskMs: 0, person: 'Maya' }));
  assert.match(html, /ss-fill[^>]*width:50%/);
});
