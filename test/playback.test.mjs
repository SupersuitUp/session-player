import { test } from 'node:test';
import assert from 'node:assert/strict';
import { condense, pace, summarize, script, duration } from '../src/playback.mjs';

const step = (label, ms, extra = {}) => ({ label, tool: 'Bash', ms, count: 1, ...extra });

test('condense keeps the longest steps in order and folds the rest into counted groups', () => {
  const steps = [step('a', 1000), step('b', 90000), step('c', 2000), step('d', 3000), step('e', 60000), step('f', 500)];
  const out = condense(steps, 2);
  assert.deepEqual(out.map((s) => s.label), ['1 quick step', 'b', '2 quick steps', 'e', '1 quick step']);
  assert.equal(out.reduce((n, s) => n + s.ms, 0), steps.reduce((n, s) => n + s.ms, 0));
  assert.equal(out[2].count, 2);
  assert.ok(out[2].group);
});

test('condense counts merged steps inside a group, and never hides a decision', () => {
  const steps = [step('read 12 files', 100, { count: 12 }), step('asked: Which cover?', 50, { ask: { questions: [{ question: 'Which cover?', options: [], answer: 'Dancer', chosen: null }], dismissed: false } }), step('big', 9000), step('small', 10)];
  const out = condense(steps, 1);
  assert.deepEqual(out.map((s) => s.label), ['12 quick steps', 'asked: Which cover?', 'big', '1 quick step']);
});

test('condense leaves a short turn alone', () => {
  const steps = [step('a', 1), step('b', 2)];
  assert.deepEqual(condense(steps, 5), steps);
});

test('pace grows with the real duration but stays watchable', () => {
  assert.ok(pace(0) >= 250);
  assert.ok(pace(60000) > pace(5000));
  assert.ok(pace(6 * 3600 * 1000) <= 1600);
});

test('duration reads like a person would say it', () => {
  assert.equal(duration(400), 'under a second');
  assert.equal(duration(42000), '42 s');
  assert.equal(duration(431000), '7 min');
  assert.equal(duration(2 * 3600000 + 13 * 60000), '2 h 13 min');
});

const scenario = () => ({
  persona: { name: 'Gary' },
  turns: [
    { id: 't1', at: 0, human: { text: 'go' }, intervention: null, steps: [step('download', 431000, { at: 431000 }), step('asked: Which cover?', 262000, { at: 700000, ask: { questions: [{ question: 'Which cover?', options: [], answer: 'Dancer', chosen: null }], dismissed: false } })], replies: [{ text: 'Six of eight', at: 300000 }], artifacts: ['a1'] },
    { id: 't2', at: 900000, human: { text: 'stop that' }, intervention: 'redirect', steps: [step('fix', 30000, { at: 930000 })], replies: [], artifacts: [] },
  ],
  artifacts: [{ id: 'a1', kind: 'link', title: 'garysheng.com/art', turn: 't1', at: 800000 }],
});

test('summarize counts the work the agent did and the moments the person stepped in', () => {
  const s = summarize(scenario());
  assert.equal(s.agentMs, 461000);
  assert.equal(s.steps, 2);
  assert.equal(s.decisions, 1);
  assert.equal(s.redirects, 1);
  assert.equal(s.commands, 2);
  assert.equal(s.artifacts, 1);
});

test('script plays each turn: the command, then steps, replies and artifacts in the order they happened', () => {
  const sc = script(scenario());
  assert.equal(sc.length, 2);
  assert.equal(sc[0].command.text, 'go');
  assert.deepEqual(sc[0].events.map((e) => e.kind), ['reply', 'step', 'step', 'artifact']);
  assert.equal(sc[0].events[3].artifact.title, 'garysheng.com/art');
  assert.ok(sc[0].events.every((e, i, a) => i === 0 || e.t >= a[i - 1].t));
  assert.equal(sc[1].command.intervention, 'redirect');
  assert.ok(sc[0].length > 0);
});

import { realPick, compare } from '../src/playback.mjs';

const q = (chosen, answer, options = ['Dancer', 'Cage']) => ({ question: 'Which?', options: options.map((label) => ({ label })), chosen, answer });

test('realPick names what the person really did on each kind of board', () => {
  assert.deepEqual(realPick(q(0, 'Dancer'), false), { kind: 'option', index: 0, label: 'Dancer' });
  assert.deepEqual(realPick(q(null, 'Friday'), false), { kind: 'other', index: null, label: 'Friday' });
  assert.deepEqual(realPick(q(null, null), true), { kind: 'dismissed', index: null, label: 'closed it and typed instead' });
});

test('compare tells the viewer whether they matched the real choice', () => {
  assert.deepEqual(compare(q(0, 'Dancer'), false, { kind: 'option', index: 0 }), { same: true, real: 'Dancer' });
  assert.deepEqual(compare(q(0, 'Dancer'), false, { kind: 'option', index: 1 }), { same: false, real: 'Dancer' });
  assert.deepEqual(compare(q(null, 'Friday'), false, { kind: 'other' }), { same: true, real: 'Friday' });
  assert.deepEqual(compare(q(null, null), true, { kind: 'option', index: 0 }), { same: false, real: 'closed it and typed instead' });
});

import { dictate } from '../src/playback.mjs';

test('dictate streams a command in word by word, ending on the whole command', () => {
  const frames = dictate('Add a jazzhop one too.');
  assert.deepEqual(frames, ['Add', 'Add a', 'Add a jazzhop', 'Add a jazzhop one', 'Add a jazzhop one too.']);
  assert.deepEqual(dictate('  '), ['']);
  // A long paste is not read out word by word forever.
  assert.ok(dictate('word '.repeat(300)).length <= 40);
  assert.equal(dictate('word '.repeat(300)).at(-1), 'word '.repeat(300).trim());
});

test('summarize reports how much idle time was taken out', () => {
  const sc = { turns: [{ steps: [{ label: 'a', ms: 600000, idleMs: 20000000 }, { label: 'b', ms: 0, idleMs: 600000, stalled: true }] }], artifacts: [] };
  assert.equal(summarize(sc).idleMs, 20600000);
});

test('condense never hides a step that showed the person images', () => {
  const steps = [step('a', 1), step('Open the nine covers in Preview', 2, { images: [{ id: 'x', src: 's' }] }), step('big', 9000), step('c', 3)];
  assert.ok(condense(steps, 1).some((s) => s.label === 'Open the nine covers in Preview'));
});
