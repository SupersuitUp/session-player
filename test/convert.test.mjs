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

test('deliverables become artifacts: pages, media and documents, never code or folders', () => {
  const s = session()
    .human('ship it')
    .tool('Write', { file_path: '/Users/someone/site/album.md', content: 'x' })
    .tool('Write', { file_path: '/Users/someone/site/album.md', content: 'y' })
    .tool('Write', { file_path: '/Users/someone/tool/write-checkpoint.mjs', content: 'z' })
    .say('Live at https://garysheng.com/art/kingdom-free and the cover is `/Users/someone/Desktop/kingdom-free/cover.png`. Masters in `/Users/someone/Desktop/kingdom-free` and `/Users/someone/Downloads`; runner is `/Users/someone/x/run.mjs`.');
  const sc = run(s);
  assert.deepEqual(sc.artifacts.map((a) => [a.kind, a.title]), [['file', 'album.md'], ['link', 'garysheng.com/art/kingdom-free'], ['file', 'cover.png']]);
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

test('a question board is kept whole: every question, its options, and what the person chose', () => {
  const questions = [
    { header: 'Cover', question: 'Which cover?', multiSelect: false, options: [{ label: 'Dancer (Recommended)', description: 'oil, warm' }, { label: 'Cage', description: 'blue' }] },
    { header: 'Date', question: 'Release when?', multiSelect: false, options: [{ label: 'Today', description: '' }, { label: 'Next week', description: '' }] },
  ];
  const s = session()
    .human('ship it')
    .tool('AskUserQuestion', { questions }, { took: 40, result: 'Your questions have been answered: ...', toolUseResult: { questions, answers: { 'Which cover?': 'Dancer (Recommended)', 'Release when?': 'Friday, after the video' } } });
  const step = run(s).turns[0].steps[0];
  assert.equal(step.label, 'asked: Which cover?');
  assert.equal(step.ms, 41000);
  assert.equal(step.ask.dismissed, false);
  assert.deepEqual(step.ask.questions.map((q) => [q.header, q.question, q.options.length, q.answer, q.chosen]), [
    ['Cover', 'Which cover?', 2, 'Dancer (Recommended)', 0],
    ['Date', 'Release when?', 2, 'Friday, after the video', null],
  ]);
  assert.equal(step.ask.questions[0].options[0].description, 'oil, warm');
});

test('older sessions without a structured result still recover the answer from the text', () => {
  const questions = [{ question: 'Which cover?', options: [{ label: 'Dancer' }, { label: 'Cage' }] }];
  const s = session().human('go').tool('AskUserQuestion', { questions }, { result: 'User has answered your questions: "Which cover?"="Dancer". You can now continue.' });
  assert.deepEqual(run(s).turns[0].steps[0].ask.questions[0].chosen, 0);
});

test('a board the person dismissed to type something else is marked dismissed', () => {
  const questions = [{ header: 'Cover', question: 'Which cover?', options: [{ label: 'Dancer' }, { label: 'Cage' }] }];
  const s = session().human('go').tool('AskUserQuestion', { questions }, { result: "The user doesn't want to proceed with this tool use.", toolUseResult: 'User rejected tool use' }).interrupt().human('i dont love these');
  const step = run(s).turns[0].steps[0];
  assert.equal(step.ask.dismissed, true);
  assert.equal(step.ask.questions[0].answer, null);
});

test('contact details inside a board are removed too', () => {
  const questions = [{ question: 'To Gary, iMessage (+1 630 555 0142): live now. Send that?', options: [{ label: 'Send', description: 'to 630-555-0142' }] }];
  const s = session().human('go').tool('AskUserQuestion', { questions }, { toolUseResult: { questions, answers: { [questions[0].question]: 'Send' } } });
  const all = JSON.stringify(run(s).turns[0].steps[0]);
  assert.ok(!all.includes('555'), all);
  assert.equal(run(s).turns[0].steps[0].ask.questions[0].chosen, 0);
});

test('steps and artifacts carry when they happened, so a replay can interleave them with replies', () => {
  const s = session()
    .human('go')
    .tool('Bash', { command: 'x', description: 'Download the masters' }, { took: 10 })
    .say('Six of eight down.', 2)
    .tool('Write', { file_path: '/tmp/cover.md' }, { took: 1 });
  const t = run(s).turns[0];
  assert.deepEqual(t.steps.map((x) => x.at), [11000, 15000]);
  assert.equal(t.replies[0].at, 13000);
  assert.equal(run(s).artifacts[0].at, 14000);
});

test('phone numbers and email addresses never survive into a scenario', () => {
  const s = session()
    .human('text me at 630-555-0142 or someone@example.com')
    .tool('AskUserQuestion', { questions: [{ question: 'To Gary, iMessage (+1 630 555 0142):\n\nkingdom free is live\n\nSend that?' }] }, { result: 'User has answered your questions: "q"="Freeda sends it".' })
    .tool('Bash', { command: 'x', description: 'Text (917) 555-0317 the link' })
    .say('Sent to +16305550142 and cc wilson@example.org. Version 4.259.1, commit 2026-10-10, 1,000 steps.');
  const sc = run(s);
  const all = JSON.stringify(sc);
  for (const leak of ['555-0142', '555 0142', '5550142', '555-0317', 'someone@example.com', 'wilson@example.org']) assert.ok(!all.includes(leak), leak);
  // Versions, dates and counts are not phone numbers.
  assert.match(all, /4\.259\.1/);
  assert.match(all, /2026-10-10/);
  assert.match(all, /1,000 steps/);
  assert.ok(sc.cuts.filter((c) => c.reason === 'contact detail removed').length >= 5);
});

test('idle time is removed: a hang counts at most 10 minutes, a timed-out command counts as no work', () => {
  const s = session()
    .human('go')
    .tool('Bash', { command: 'x', description: 'Download every take' }, { took: 7 * 60 })
    .tool('Bash', { command: 'x', description: 'Download again' }, { took: 600, result: 'Command did not complete within its 600s timeout and was moved to the background', toolUseResult: { timedOutAfterMs: 600000 } })
    .tool('Bash', { command: 'x', description: 'Check the Downloads folder' }, { took: 6 * 3600 })
    .tool('Bash', { command: 'x', description: 'Stage the masters' }, { after: 20 * 60, took: 5 });
  const sc = run(s);
  const ms = sc.turns[0].steps.map((x) => Math.round(x.ms / 1000));
  assert.deepEqual(ms, [7 * 60 + 1, 0, 600, 3 * 60 + 5]);
  assert.equal(sc.turns[0].steps[1].stalled, true);
  const idle = sc.turns[0].steps.reduce((n, x) => n + (x.idleMs ?? 0), 0);
  assert.equal(Math.round(idle / 1000), 601 + (6 * 3600 + 1 - 600) + (20 * 60 - 180));
  assert.ok(sc.cuts.some((c) => c.reason === 'idle time removed'));
});

test('a decision that sat unanswered counts at most 5 minutes of the person deciding', () => {
  const questions = [{ question: 'Which cover?', options: [{ label: 'A' }] }];
  const s = session().human('go').tool('AskUserQuestion', { questions }, { took: 13 * 60, toolUseResult: { questions, answers: { 'Which cover?': 'A' } } });
  const step = run(s).turns[0].steps[0];
  assert.equal(Math.round(step.ms / 1000), 300);
});

test('an image the person pasted is kept with their command', () => {
  const sc = run(session().humanWithImage('[Image #1] this one is good'));
  assert.equal(sc.turns[0].human.text, '[Image #1] this one is good');
  assert.deepEqual(sc.turns[0].human.images, [{ id: 'pasted-t1-1', src: 'data:image/png;base64,iVBORw0KGgo=', caption: 'pasted by the operator' }]);
});

test('a session that opens with a slash command shows the command the person typed, not its tags', () => {
  const s = session().human('<command-message>cw:triage</command-message>\n<command-name>/cw:triage</command-name>\n<command-args>the open queue</command-args>');
  assert.equal(run(s).turns[0].human.text, '/cw:triage the open queue');
  const bare = session().human('<command-message>freedom:initialize-session</command-message>\n<command-name>/freedom:initialize-session</command-name>');
  assert.equal(run(bare).turns[0].human.text, '/freedom:initialize-session');
});

test('usage-limit and API error notices are the harness talking, so they are not kept as replies', () => {
  const s = session().human('go').say("You've hit your weekly limit · resets Sep 27 at 5pm (America/New_York)").say('Done, all four fixed.');
  const lines = s.lines;
  lines.push({ type: 'assistant', sessionId: 'sess-1', isApiErrorMessage: true, timestamp: new Date(Date.parse(lines.at(-1).timestamp) + 1000).toISOString(), message: { role: 'assistant', content: [{ type: 'text', text: 'API Error: 529 overloaded' }] } });
  const sc = run(s);
  assert.deepEqual(sc.turns[0].replies.map((r) => r.text), ['Done, all four fixed.']);
  assert.ok(sc.cuts.some((c) => c.reason === 'harness notice dropped'));
});
