import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convert, parseSession } from '../src/convert.mjs';
import { validate, FORMAT } from '../src/scenario.mjs';
import { session } from './fixtures.mjs';

const run = (s, opts) => convert(parseSession(s.jsonl()), { home: '/Users/someone', ...opts });

test('only what the person typed becomes a turn', () => {
  const s = session()
    .human('Upload the album to my website')
    .meta('Base directory for this skill: ...')
    .say('On it.')
    .notification('<summary>downloads done</summary>')
    .interrupt()
    .sidechain('a subagent prompt')
    .human('Add a neo soul one too');
  const sc = run(s);
  assert.deepEqual(sc.turns.map((t) => t.human.text), ['Upload the album to my website', 'Add a neo soul one too']);
  assert.equal(sc.format, FORMAT);
});

test('older sessions without an origin field still yield their human turns', () => {
  const s = session().legacyHuman('first ask').meta('skill body').legacyHuman('<command-name>/clear</command-name>').legacyHuman('second ask');
  assert.deepEqual(run(s).turns.map((t) => t.human.text), ['first ask', 'second ask']);
});

test('a turn right after an interrupt is marked as the person redirecting', () => {
  const s = session().human('go').tool('Bash', { command: 'x', description: 'Download the WAVs' }).interrupt().human('do the art at the same time');
  const sc = run(s);
  assert.equal(sc.turns[0].intervention, null);
  assert.equal(sc.turns[1].intervention, 'redirect');
});

test('tool work becomes named steps timed by wall clock since the last step, and runs of the same kind merge', () => {
  const s = session()
    .human('go')
    .tool('Read', { file_path: '/Users/someone/a.md' }, { took: 2 })
    .tool('Read', { file_path: '/Users/someone/b.md' }, { took: 3 })
    .tool('Read', { file_path: '/Users/someone/c.md' }, { took: 1 })
    .tool('Bash', { command: 'curl ...', description: 'Resolve the Suno share link' }, { took: 4 })
    .tool('Skill', { skill: 'publish-album-to-website' }, { took: 1 })
    .tool('Agent', { description: 'Render four covers', subagent_type: 'general-purpose' }, { took: 60 });
  const steps = run(s).turns[0].steps;
  assert.deepEqual(steps.map((x) => x.label), ['read 3 files', 'Resolve the Suno share link', 'used publish-album-to-website', 'Render four covers']);
  assert.equal(steps[0].count, 3);
  // Each tool_use lands 1 s after the previous event; its result `took` seconds later.
  // Real tools return in under a second and the time goes to the agent thinking between
  // them, so a step owns the whole gap since the previous step finished.
  assert.equal(steps[0].ms, 9000);
  assert.equal(steps[1].ms, 5000);
  assert.equal(steps[3].ms, 61000);
});

test('plumbing tools are not shown, and their time goes to the next real step', () => {
  const s = session()
    .human('go')
    .tool('ToolSearch', { query: 'x' }, { took: 2 })
    .tool('EnterWorktree', {}, { took: 2 })
    .tool('Bash', { command: 'x', description: 'Run the tests' }, { took: 1 })
    .tool('ExitWorktree', {}, { took: 3 });
  const steps = run(s).turns[0].steps;
  assert.deepEqual(steps.map((x) => x.label), ['Run the tests']);
  assert.equal(steps[0].ms, 12000);
});

test('chapters follow the session name, not the alternating automatic title', () => {
  const lines = session().human('one').jsonl().trim().split('\n').map((l) => JSON.parse(l));
  const named = (t) => ({ type: 'custom-title', customTitle: t, sessionId: 'sess-1' });
  const auto = (t) => ({ type: 'ai-title', aiTitle: t, sessionId: 'sess-1' });
  const two = session('2026-09-14T06:00:00.000Z').human('two').lines;
  const three = session('2026-09-14T07:00:00.000Z').human('three').lines;
  const sc = convert([named('Kingdom Free'), auto('Upload album'), ...lines, named('Kingdom Free'), auto('Upload album'), ...two, named('Release'), auto('Upload album'), ...three]);
  assert.deepEqual(sc.chapters.map((c) => [c.title, c.turn]), [['Kingdom Free', 't1'], ['Release', 't3']]);
});

test('a session with only automatic titles uses those for chapters', () => {
  const auto = (t) => ({ type: 'ai-title', aiTitle: t, sessionId: 'sess-1' });
  const sc = convert([auto('Upload album'), ...session().human('one').lines]);
  assert.deepEqual(sc.chapters, [{ title: 'Upload album', turn: 't1' }]);
});

test('paths the agent names in a reply become artifacts', () => {
  const s = session().human('where').say('Covers are at `/Users/someone/Desktop/kingdom-free/cover.png` and the masters in `/Users/someone/Desktop/kingdom-free`. Run `npm test` to check.');
  const sc = run(s);
  assert.deepEqual(sc.artifacts.map((a) => a.path), ['~/Desktop/kingdom-free/cover.png', '~/Desktop/kingdom-free']);
  assert.deepEqual(sc.artifacts.map((a) => a.title), ['cover.png', 'kingdom-free']);
});

test('files written and links shared become artifacts, home paths become ~', () => {
  const s = session()
    .human('ship it')
    .tool('Write', { file_path: '/Users/someone/site/album.md', content: 'x' })
    .tool('Write', { file_path: '/Users/someone/site/album.md', content: 'y' })
    .say('Live at https://garysheng.com/art/kingdom-free and submitted.');
  const sc = run(s);
  assert.deepEqual(sc.artifacts.map((a) => [a.kind, a.title]), [['file', 'album.md'], ['link', 'garysheng.com/art/kingdom-free']]);
  assert.equal(sc.artifacts[0].path, '~/site/album.md');
  assert.deepEqual(sc.turns[0].artifacts, sc.artifacts.map((a) => a.id));
});

test('replies are kept, and home paths in them are hidden', () => {
  const s = session().human('where is it').say('Staged under /Users/someone/Desktop/kingdom-free.');
  assert.deepEqual(run(s).turns[0].replies.map((r) => r.text), ['Staged under ~/Desktop/kingdom-free.']);
});

test('a long paste is collapsed and the cut is recorded', () => {
  const s = session().human('x'.repeat(2000));
  const sc = run(s);
  assert.ok(sc.turns[0].human.text.length < 400);
  assert.match(sc.turns[0].human.text, /pasted 2000 characters/);
  assert.equal(sc.cuts[0].reason, 'long paste collapsed');
});

test('credential-shaped strings are replaced everywhere and recorded as cuts', () => {
  const s = session()
    .human('use sk-proj-abcdefghijklmnopqrstuvwxyz123456 please')
    .tool('Bash', { command: 'x', description: 'export OPENAI_API_KEY=abcdefghijklmnopqrstuvwxyz0123456789' })
    .say('Token ghp_abcdefghijklmnopqrstuvwxyz0123456789AB set.');
  const sc = run(s);
  const all = JSON.stringify(sc.turns);
  assert.doesNotMatch(all, /sk-proj-abc|ghp_abc|abcdefghijklmnopqrstuvwxyz0123456789/);
  assert.ok(sc.cuts.filter((c) => c.reason === 'credential removed').length >= 3);
});

test('times run from the first turn, and chapters follow the session title', () => {
  const s = session().title('Kingdom Free').human('one').say('a', 5).title('Kingdom Free').title('Release').human('two', { after: 10 });
  const sc = run(s);
  assert.equal(sc.turns[0].at, 0);
  assert.equal(sc.turns[1].at, 15000);
  assert.deepEqual(sc.chapters, [{ title: 'Kingdom Free', turn: 't1' }, { title: 'Release', turn: 't2' }]);
});

test('the draft is a valid scenario with the source recorded and the operator as persona', () => {
  const s = session().human('one').say('done');
  const sc = run(s, { title: 'Releasing an album', persona: { name: 'Gary', role: 'musician' } });
  assert.deepEqual(validate(sc), []);
  assert.equal(sc.title, 'Releasing an album');
  assert.equal(sc.persona.name, 'Gary');
  assert.deepEqual(sc.source, { kind: 'session', sessionId: 'sess-1', date: '2026-09-14', illustrative: false });
});

test('a session nobody typed into is refused rather than drafted empty', () => {
  const s = session().meta('x').say('y');
  assert.throws(() => run(s), /no human turns/);
});

test('unparseable lines are skipped, not fatal', () => {
  const text = session().human('one').jsonl() + '{not json\n\n';
  assert.equal(convert(parseSession(text)).turns.length, 1);
});
