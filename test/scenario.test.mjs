import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, FORMAT } from '../src/scenario.mjs';

const good = () => ({
  format: FORMAT,
  id: 'album',
  title: 'Releasing an album',
  persona: { name: 'Gary', role: 'musician', blurb: '' },
  source: { kind: 'session', sessionId: 's', date: '2026-09-14', illustrative: false },
  chapters: [{ title: 'Start', turn: 't1' }],
  turns: [
    { id: 't1', at: 0, human: { text: 'go', via: 'typed', choices: [] }, intervention: null, steps: [{ label: 'read 2 files', tool: 'Read', ms: 10, count: 2 }], replies: [{ text: 'done', at: 20 }], artifacts: ['a1'] },
  ],
  artifacts: [{ id: 'a1', kind: 'file', title: 'x.md', path: '~/x.md', turn: 't1' }],
  cuts: [],
});

test('a well-formed scenario has no problems', () => {
  assert.deepEqual(validate(good()), []);
});

test('each kind of defect is named', () => {
  const cases = [
    [(s) => { s.format = 'other/1'; }, /format/],
    [(s) => { delete s.title; }, /title/],
    [(s) => { s.turns = []; }, /at least one turn/],
    [(s) => { s.turns[0].human.text = ''; }, /t1.*text/],
    [(s) => { s.turns.push({ ...s.turns[0] }); }, /duplicate turn id t1/],
    [(s) => { s.turns[0].intervention = 'nudge'; }, /intervention/],
    [(s) => { s.turns[0].steps[0].ms = -1; }, /ms/],
    [(s) => { s.turns[0].artifacts = ['nope']; }, /unknown artifact nope/],
    [(s) => { s.artifacts[0].kind = 'video'; }, /kind/],
    [(s) => { s.chapters[0].turn = 't9'; }, /chapter.*t9/],
    [(s) => { s.source.kind = 'dream'; }, /source/],
    [(s) => { s.turns[0].human.via = 'telepathy'; }, /via/],
  ];
  for (const [breakIt, pattern] of cases) {
    const s = good();
    breakIt(s);
    const problems = validate(s);
    assert.ok(problems.some((p) => pattern.test(p)), `expected ${pattern} in ${JSON.stringify(problems)}`);
  }
});

test('a non-object is refused outright', () => {
  assert.match(validate(null)[0], /object/);
});
