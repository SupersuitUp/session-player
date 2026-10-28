// Gary, 2026-10-28: "make it much more clear that there's like a finger pressing buttons. And
// then when it's a none of the above choice, it should show like a simulation of someone typing
// out the none of the above choice." The gesture timeline is pure, so these run without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { tap, typeFrames, answerScript, pointerFor, normalizeSpeed, prefersReducedMotion } from '../src/gesture.mjs';
import { Board, OtherField, Pointer, SimulatorPlayer } from '../src/player.mjs';

const kinds = (steps) => steps.map((s) => s.kind);
const picked = { header: 'Cover', question: 'Which cover?', options: [{ label: 'Dancer' }, { label: 'Cage' }], answer: 'Cage', chosen: 1 };
const typed = { header: 'When', question: 'Release when?', options: [{ label: 'Today' }, { label: 'Next week' }], answer: 'Friday, after the mastering pass comes back', chosen: null };

test('every simulated tap travels to the control and presses it before the choice lands', () => {
  const s = tap('send', { at: 1400 });
  assert.deepEqual(kinds(s), ['travel', 'press', 'release', 'action', 'lift']);
  assert.ok(s.every((x) => x.target === 'send'));
  const act = s.find((x) => x.kind === 'action');
  assert.equal(act.at, 1400, 'the choice lands when it would have without the finger');
  assert.ok(s[0].at < s[1].at && s[1].at < act.at, 'travel, then press, then the choice');
  assert.ok(s[0].ms > 0 && s[1].ms > 0);
});

test('a picked option on a board is a finger tap on that option, then the pick', () => {
  const s = answerScript(picked, false, { lead: 1200 });
  assert.deepEqual(kinds(s), ['travel', 'press', 'release', 'action', 'lift']);
  assert.equal(s[0].target, 'opt-1');
  assert.equal(s.find((x) => x.kind === 'action').action, 'pick');
});

test('a typed answer taps Other, opens the field, types the exact text, then sends', () => {
  const s = answerScript(typed, false, { lead: 1200 });
  const order = s.filter((x) => x.kind !== 'lift').map((x) => `${x.kind}:${x.target}`);
  const first = (k) => order.indexOf(k);
  assert.ok(first('travel:opt-other') < first('press:opt-other'));
  assert.ok(first('press:opt-other') < first('open:opt-other'));
  assert.ok(first('open:opt-other') < first('type:other-field'));
  const types = s.filter((x) => x.kind === 'type');
  assert.equal(types[0].text, 'F', 'the first keystroke is one character');
  assert.equal(types.at(-1).text, typed.answer, 'it ends on the exact answer');
  for (let i = 1; i < types.length; i += 1) assert.ok(types[i].text.startsWith(types[i - 1].text) && types[i].at >= types[i - 1].at);
  const lastType = s.indexOf(types.at(-1));
  const sendTravel = s.findIndex((x) => x.kind === 'travel' && x.target === 'other-send');
  assert.ok(sendTravel > lastType, 'the finger goes to send only once the text is typed');
  assert.equal(s.find((x) => x.target === 'other-send' && x.kind === 'action').action, 'pick');
  assert.ok(!s.some((x) => x.kind === 'action' && x.action === 'pick' && x.target !== 'other-send'), 'the pick lands only on send');
});

test('typing runs at a human pace on the first line and never past ~4 s at 1x', () => {
  const short = typeFrames('Friday');
  assert.equal(short.length, 6);
  assert.ok(short.at(-1).at >= 200, 'a short answer is typed visibly, not pasted');
  const long = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');
  const f = typeFrames(long);
  assert.equal(f.at(-1).text, long);
  assert.ok(f.at(-1).at <= 4000, `300 words took ${f.at(-1).at} ms`);
  const fast = typeFrames(long, { speed: 2 });
  assert.ok(fast.at(-1).at <= f.at(-1).at / 2 + 1, 'the speed control scales it');
});

test('reduced motion skips the travel and types the answer at once', () => {
  const s = answerScript(typed, false, { lead: 1200, reduced: true });
  assert.ok(!s.some((x) => x.kind === 'travel'));
  assert.ok(s.some((x) => x.kind === 'press' && x.target === 'opt-other'), 'the press still shows, in place');
  const types = s.filter((x) => x.kind === 'type');
  assert.equal(types.length, 1);
  assert.equal(types[0].text, typed.answer);
  assert.ok(!tap('send', { at: 1400, reduced: true }).some((x) => x.kind === 'travel'));
  assert.equal(prefersReducedMotion(undefined, { matchMedia: () => ({ matches: true }) }), true);
  assert.equal(prefersReducedMotion(false, { matchMedia: () => ({ matches: true }) }), false);
});

test('the speed control scales the tap', () => {
  const one = tap('send', { at: 2000 });
  const two = tap('send', { at: 2000, speed: 2 });
  assert.equal(two[0].ms * 2, one[0].ms);
  assert.equal(normalizeSpeed('fast'), 1);
  assert.equal(normalizeSpeed(10), 4);
});

test('a finger on a phone, a pointer on a MacBook', () => {
  assert.equal(pointerFor('phone'), 'finger');
  assert.equal(pointerFor('iphone'), 'finger');
  assert.equal(pointerFor('macbook'), 'cursor');
  assert.equal(pointerFor('macbook-compact'), 'cursor');
  assert.match(renderToString(h(Pointer, { kind: 'finger', state: { x: 10, y: 20, visible: true, pressed: true } })), /ss-pointer ss-finger[^"]*ss-pressed/);
  assert.match(renderToString(h(Pointer, { kind: 'cursor', state: { x: 10, y: 20, visible: true } })), /ss-pointer ss-cursor/);
});

test('the board marks every control the hand can reach, and the Other field shows what is typed', () => {
  const html = renderToString(h(Board, { ask: { dismissed: false, questions: [typed] }, person: 'Gary', onPick: () => {} }));
  assert.match(html, /data-ss-target="opt-0"/);
  assert.match(html, /data-ss-target="opt-other"/);
  const field = renderToString(h(OtherField, { text: 'Friday, af', person: 'Gary' }));
  assert.match(field, /Friday, af/);
  assert.match(field, /data-ss-target="other-field"/);
  assert.match(field, /data-ss-target="other-send"/);
  assert.match(renderToString(h(SimulatorPlayer, { scenario: { format: 'supersuit-simulator/1', id: 'a', title: 't', persona: { name: 'Gary' }, source: { kind: 'session' }, turns: [{ id: 't1', at: 0, human: { text: 'go', via: 'typed' }, intervention: null, steps: [], replies: [], artifacts: [] }], artifacts: [] } })), /data-ss-target="send"/);
});

// The 0.3.x speed switch was retired in 0.5.0 (start.test.mjs): the hand's pace takes `speed` as a
// parameter, ready for a control if one returns, and no embed switch carries it.
test('no speed switch comes back with the hand', async () => {
  const { propsFromAttributes } = await import('../src/embed.mjs');
  assert.equal('speed' in propsFromAttributes({ src: '/s', speed: '2' }), false);
});

test('the board fixture answers its typed question by typing the recorded text', async () => {
  const { boardScenario } = await import('./fixtures.mjs');
  const [pickedQ, typedQ] = boardScenario().turns[0].steps[1].ask.questions;
  assert.equal(answerScript(pickedQ, false).find((x) => x.kind === 'travel').target, 'opt-1');
  assert.equal(answerScript(typedQ, false).filter((x) => x.kind === 'type').at(-1).text, typedQ.answer);
});
