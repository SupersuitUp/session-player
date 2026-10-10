import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recast } from '../src/recast.mjs';
import { validate, FORMAT } from '../src/scenario.mjs';

const sc = () => ({
  format: FORMAT, id: 'album-release', title: 'Releasing Kingdom Free', persona: { name: 'Gary', role: 'musician' },
  source: { kind: 'session', sessionId: 'abc', date: '2026-09-14', illustrative: false },
  chapters: [{ title: 'Kingdom Free', turn: 't1' }],
  turns: [
    { id: 't1', at: 0, human: { text: 'Upload Kingdom Free to my website', raw: 'Upload kingdom free to my webiste', via: 'typed', choices: [] }, intervention: null,
      steps: [{ label: 'Render the Kingdom Free cover', tool: 'Bash', ms: 5, count: 1, at: 5 }, { label: 'asked: Is Kingdom Free the title?', tool: 'AskUserQuestion', ms: 9, count: 1, at: 14, ask: { dismissed: false, questions: [{ header: 'Title', question: 'Is Kingdom Free the title?', options: [{ label: 'Yes, Gary', description: 'Kingdom Free it is' }], answer: 'Yes, Gary', chosen: 0 }] } }],
      replies: [{ text: 'Kingdom Free is live on garysheng.com, Gary.', at: 20 }], artifacts: ['a1'] },
    { id: 't2', at: 30, human: { text: 'Now fix the save log for Wilson', via: 'typed', choices: [] }, intervention: null, steps: [], replies: [{ text: 'Done, Wilson has it.', at: 40 }], artifacts: ['a2'] },
  ],
  artifacts: [{ id: 'a1', kind: 'link', title: 'garysheng.com/art/kingdom-free', url: 'https://garysheng.com/art/kingdom-free', turn: 't1', at: 20 }, { id: 'a2', kind: 'file', title: 'log.md', turn: 't2', at: 40 }],
  cuts: [],
});

const spec = {
  id: 'slow-tide', title: 'Releasing an ambient lo-fi album', persona: { name: 'Maya', role: 'ambient producer' },
  keep: ['t1'],
  replace: [['Kingdom Free', 'Slow Tide'], ['kingdom-free', 'slow-tide'], ['garysheng.com', 'mayaito.com'], ['Gary', 'Maya']],
  forbid: ['Kingdom', 'garysheng', 'Gary', 'Wilson'],
};

test('a recast tells a different story from the same run, and says so', () => {
  const out = recast(sc(), spec);
  assert.deepEqual(validate(out), []);
  assert.equal(out.id, 'slow-tide');
  assert.equal(out.persona.name, 'Maya');
  assert.deepEqual(out.source, { kind: 'persona', sessionId: 'abc', date: '2026-09-14', illustrative: true, recastFrom: 'album-release' });
  assert.equal(out.turns[0].human.text, 'Upload Slow Tide to my website');
  assert.equal(out.turns[0].steps[0].label, 'Render the Slow Tide cover');
  assert.deepEqual(out.turns[0].steps[1].ask.questions[0], { header: 'Title', question: 'Is Slow Tide the title?', options: [{ label: 'Yes, Maya', description: 'Slow Tide it is' }], answer: 'Yes, Maya', chosen: 0 });
  assert.equal(out.turns[0].replies[0].text, 'Slow Tide is live on mayaito.com, Maya.');
  assert.equal(out.artifacts[0].url, 'https://mayaito.com/art/slow-tide');
  assert.equal(out.chapters[0].title, 'Slow Tide');
});

test('the timing, steps and decisions of the real run are kept exactly', () => {
  const out = recast(sc(), spec);
  assert.deepEqual(out.turns[0].steps.map((s) => [s.ms, s.at]), [[5, 5], [9, 14]]);
  assert.equal(out.turns[0].at, 0);
});

test('turns off the story are dropped with their artifacts, and the cut is recorded', () => {
  const out = recast(sc(), spec);
  assert.deepEqual(out.turns.map((t) => t.id), ['t1']);
  assert.deepEqual(out.artifacts.map((a) => a.id), ['a1']);
  assert.ok(out.cuts.some((c) => c.turn === 't2' && c.reason === 'turn dropped in recast'));
});

test('the original wording does not travel into a recast', () => {
  const out = recast(sc(), spec);
  assert.equal(out.turns[0].human.raw, undefined);
  assert.doesNotMatch(JSON.stringify(out), /kingdom|webiste/i);
});

test('a recast refuses to finish while a forbidden word survives, and names where', () => {
  assert.throws(() => recast(sc(), { ...spec, replace: spec.replace.filter(([a]) => a !== 'Gary') }), /forbidden "Gary" survives in t1/);
});

test('the source scenario is untouched', () => {
  const s = sc();
  recast(s, spec);
  assert.equal(s.title, 'Releasing Kingdom Free');
});

test('a forbidden word matches where a word starts, not inside another word', () => {
  const s = sc();
  s.turns[0].steps[0].label = 'Record the credentials step for the Christofuturist cover';
  assert.doesNotThrow(() => recast(s, { ...spec, forbid: [...spec.forbid, 'Eden'] }));
  assert.throws(() => recast(s, { ...spec, forbid: [...spec.forbid, 'Christ'] }), /forbidden "Christ"/);
});

test('a recast carries the close block, with its words recast too', () => {
  const s = sc();
  s.close = { outcome: 'Kingdom Free released.', edge: { total: 3, layers: { fueled: 0, encoded: 3, built: 0, retired: 0 } }, freed: [{ task: 'releasing Kingdom Free by hand', cadence: 'monthly' }] };
  const out = recast(s, spec);
  assert.equal(out.close.outcome, 'Slow Tide released.');
  assert.equal(out.close.freed[0].task, 'releasing Slow Tide by hand');
  assert.equal(out.close.edge.total, 3);
});

test('a recast can restate the close facts for the turns it keeps', () => {
  const s = sc();
  s.close = { outcome: 'Kingdom Free released.', edge: { total: 10, layers: { fueled: 0, encoded: 3, built: 7, retired: 0 } } };
  const out = recast(s, { ...spec, close: { edge: { total: 5, layers: { fueled: 0, encoded: 3, built: 2, retired: 0 } } } });
  assert.equal(out.close.edge.total, 5);
  assert.equal(out.close.outcome, 'Slow Tide released.');
});
