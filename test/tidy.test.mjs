import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tidy } from '../src/tidy.mjs';
import { validate, FORMAT } from '../src/scenario.mjs';

const sc = (...texts) => ({
  format: FORMAT, id: 's', title: 'x', persona: { name: 'Gary' }, source: { kind: 'session' }, chapters: [],
  turns: texts.map((text, i) => ({ id: `t${i + 1}`, at: i, human: { text, via: 'typed', choices: [] }, intervention: null, steps: [], replies: [], artifacts: [] })),
  artifacts: [], cuts: [],
});

test('a typo fix shows the clean text, keeps the original, and records the cut', () => {
  const out = tidy(sc('Why don’t you work on the album art simkltaneouslf', 'ckise'), { t1: 'Why don’t you work on the album art simultaneously?', t2: 'close' });
  assert.equal(out.turns[0].human.text, 'Why don’t you work on the album art simultaneously?');
  assert.equal(out.turns[0].human.raw, 'Why don’t you work on the album art simkltaneouslf');
  assert.equal(out.turns[1].human.text, 'close');
  assert.deepEqual(out.cuts.map((c) => [c.turn, c.reason]), [['t1', 'typo fixed'], ['t2', 'typo fixed']]);
  assert.deepEqual(validate(out), []);
});

test('a "fix" that rewrites what the person said is refused', () => {
  assert.throws(() => tidy(sc('Guess if didn’t work'), { t1: 'Please check whether the download failed and retry it' }), /t1.*changes too much/);
});

test('a fix for a turn that does not exist is refused', () => {
  assert.throws(() => tidy(sc('go'), { t9: 'go' }), /unknown turn t9/);
});

test('local screenshot paths become [screenshot] with no fix needed', () => {
  const out = tidy(sc("i dont love these - '/var/folders/xm/abc/T/TemporaryItems/Screenshot.png' this one is good", "'~/Desktop/Screenshot 10.png' more painterly"), {});
  assert.equal(out.turns[0].human.text, 'i dont love these - [screenshot] this one is good');
  assert.equal(out.turns[1].human.text, '[screenshot] more painterly');
  assert.equal(out.cuts.filter((c) => c.reason === 'local path replaced').length, 2);
});

test('tidy does not modify the scenario it is given', () => {
  const s = sc('ckise');
  tidy(s, { t1: 'close' });
  assert.equal(s.turns[0].human.text, 'ckise');
  assert.equal(s.cuts.length, 0);
});
