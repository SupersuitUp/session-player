import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tidy } from '../src/tidy.mjs';
import { recast } from '../src/recast.mjs';
import { bundle } from '../src/bundle.mjs';
import { validate, FORMAT } from '../src/scenario.mjs';

const board = () => ({ dismissed: false, questions: [{ header: 'Cover', question: 'Which cover for Kingdom Free?', options: [{ label: '1 Chains to Gold Dust', description: '' }, { label: '4 Open Cage', description: '' }], answer: '4 Open Cage', chosen: 1 }] });
const sc = () => ({
  format: FORMAT, id: 'album', title: 'Kingdom Free', persona: { name: 'Gary' }, source: { kind: 'session' }, chapters: [],
  turns: [
    { id: 't1', at: 0, human: { text: 'make covers', via: 'typed', choices: [] }, intervention: null,
      steps: [{ label: 'Open the nine covers in Preview', tool: 'Bash', ms: 1, count: 1, at: 1 }, { label: 'asked: Which cover for Kingdom Free?', tool: 'AskUserQuestion', ms: 1, count: 1, at: 2, ask: board() }],
      replies: [], artifacts: [] },
    { id: 't2', at: 9, human: { text: 'this one', via: 'typed', choices: [], images: [{ id: 'pasted-t2-1', src: 'data:image/png;base64,iVBORw0KGgo=', caption: 'pasted' }] }, intervention: null, steps: [], replies: [], artifacts: [] },
  ],
  artifacts: [], cuts: [],
});

const fixes = { images: [
  { turn: 't1', step: 'Open the nine covers', id: 'gallery-1', src: '/art/chains.png', caption: 'Chains to Gold Dust' },
  { turn: 't1', step: 'Open the nine covers', id: 'gallery-2', src: '/art/cage.png', caption: 'Open Cage' },
  { turn: 't1', question: 'Which cover', option: 'Chains to Gold Dust', id: 'opt-chains', src: '/art/chains.png' },
  { turn: 't1', question: 'Which cover', option: 'Open Cage', id: 'opt-cage', src: '/art/cage.png' },
] };

test('a reviewer attaches images to a step, and to the options of a board', () => {
  const out = tidy(sc(), fixes);
  assert.deepEqual(out.turns[0].steps[0].images.map((i) => i.caption), ['Chains to Gold Dust', 'Open Cage']);
  assert.equal(out.turns[0].steps[1].ask.questions[0].options[1].image.src, '/art/cage.png');
  assert.deepEqual(validate(out), []);
  assert.throws(() => tidy(sc(), { images: [{ turn: 't1', step: 'no such step', id: 'x', src: '/a.png' }] }), /no step matching "no such step" in t1/);
  assert.throws(() => tidy(sc(), { images: [{ turn: 't1', question: 'Which cover', option: 'Nope', id: 'x', src: '/a.png' }] }), /no option matching "Nope"/);
});

test('recast swaps every image by id, and refuses while an original image survives', () => {
  const tidied = tidy(sc(), fixes);
  const spec = { id: 'noa', persona: { name: 'Noa' }, replace: [['Kingdom Free', 'Low Tide Tapes'], ['Gary', 'Noa']], forbid: [],
    images: { 'gallery-1': '/noa/rain.png', 'gallery-2': '/noa/heron.png', 'opt-chains': '/noa/rain.png', 'opt-cage': '/noa/heron.png', 'pasted-t2-1': '/noa/pick.png' } };
  const out = recast(tidied, spec);
  assert.deepEqual(out.turns[0].steps[0].images.map((i) => i.src), ['/noa/rain.png', '/noa/heron.png']);
  assert.equal(out.turns[0].steps[1].ask.questions[0].options[0].image.src, '/noa/rain.png');
  assert.equal(out.turns[1].human.images[0].src, '/noa/pick.png');
  const { 'pasted-t2-1': _, ...partial } = spec.images;
  assert.throws(() => recast(tidied, { ...spec, images: partial }), /image pasted-t2-1 from the original has no replacement/);
});

test('bundle copies every image into the scenario folder and points the scenario at it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sim-bundle-'));
  const png = join(dir, 'a.png');
  writeFileSync(png, Buffer.from('89504e470d0a1a0a', 'hex'));
  const s = tidy(sc(), { images: [{ turn: 't1', step: 'Open the nine', id: 'g1', src: png, caption: 'one' }] });
  const out = bundle(s, { dir, resize: false });
  const g = out.turns[0].steps[0].images[0].src;
  assert.match(g, /^assets\/album\/g1\.(png|jpg)$/);
  assert.ok(existsSync(join(dir, g)));
  const pasted = out.turns[1].human.images[0].src;
  assert.match(pasted, /^assets\/album\/pasted-t2-1\.png$/);
  assert.ok(existsSync(join(dir, pasted)));
  assert.throws(() => bundle(tidy(sc(), { images: [{ turn: 't1', step: 'Open the nine', id: 'g1', src: join(dir, 'missing.png') }] }), { dir, resize: false }), /missing\.png/);
});

test('a recast image can carry its own caption; otherwise the original caption is dropped', () => {
  const tidied = tidy(sc(), fixes);
  const images = { 'gallery-1': { src: '/noa/rain.png', caption: 'Rain Glass' }, 'gallery-2': '/noa/heron.png', 'opt-chains': '/noa/rain.png', 'opt-cage': '/noa/heron.png', 'pasted-t2-1': '/noa/pick.png' };
  const out = recast(tidied, { id: 'noa', replace: [['Kingdom Free', 'Low Tide Tapes'], ['Gary', 'Noa']], images });
  assert.deepEqual(out.turns[0].steps[0].images.map((i) => i.caption), ['Rain Glass', undefined]);
});

test('bundle writes a provenance recipe beside every image, carrying the source recipe when there is one', async () => {
  const { readFileSync: read } = await import('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'sim-recipe-'));
  const png = join(dir, 'cover.png');
  writeFileSync(png, Buffer.from('89504e470d0a1a0a', 'hex'));
  writeFileSync(`${png}.recipe.json`, JSON.stringify({ model: 'gpt-image', prompt: 'a heron at dusk', refs: [], timestamp: '2026-10-10T00:00:00Z' }));
  const s = tidy(sc(), { images: [{ turn: 't1', step: 'Open the nine', id: 'g1', src: png, caption: 'one' }] });
  const out = bundle(s, { dir, resize: false });
  const g = out.turns[0].steps[0].images[0].src;
  const r = JSON.parse(read(join(dir, `${g}.recipe.json`), 'utf8'));
  assert.equal(r.mode, 'derive');
  assert.equal(r.derivedFrom, png);
  assert.match(r.generator, /@supersuit\/session-player bundle/);
  assert.equal(r.source.prompt, 'a heron at dusk');
  assert.ok(r.timestamp);
  const pasted = JSON.parse(read(join(dir, `${out.turns[1].human.images[0].src}.recipe.json`), 'utf8'));
  assert.equal(pasted.mode, 'derive');
  assert.match(pasted.derivedFrom, /pasted/);
});

test('a recast renames every image to a neutral id, so no file name carries the original subject', () => {
  const tidied = tidy(sc(), fixes);
  const images = { 'gallery-1': '/noa/rain.png', 'gallery-2': '/noa/heron.png', 'opt-chains': '/noa/rain.png', 'opt-cage': '/noa/heron.png', 'pasted-t2-1': '/noa/pick.png' };
  const out = recast(tidied, { id: 'noa', replace: [['Kingdom Free', 'Low Tide Tapes'], ['Gary', 'Noa'], ['Chains to Gold Dust', 'Rain Glass'], ['Open Cage', 'Heron Shore']], forbid: ['chains', 'cage'], images });
  const ids = JSON.stringify(out).match(/"id":\s*"[^"]*"/g).join(' ');
  assert.doesNotMatch(ids, /chains|cage|gallery|opt|pasted/);
  // The same picture keeps one id wherever it appears, so bundle writes it once.
  assert.equal(out.turns[0].steps[0].images[0].id, out.turns[0].steps[1].ask.questions[0].options[0].image.id);
  assert.match(out.turns[0].steps[0].images[0].id, /^noa-image-\d+$/);
});
