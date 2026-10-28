// Builds synthetic Claude Code session lines, shaped like the real transcripts under
// ~/.claude/projects/. Real sessions never enter this repo; every test session is made here.

export function session(start = '2026-09-14T05:00:00.000Z') {
  let clock = Date.parse(start);
  let n = 0;
  const lines = [];
  const at = (s = 1) => new Date((clock += s * 1000)).toISOString();
  const base = (type, extra) => ({ type, uuid: `u${++n}`, sessionId: 'sess-1', isSidechain: false, ...extra });

  const api = {
    lines,
    title(t) { lines.push({ type: 'custom-title', customTitle: t, sessionId: 'sess-1' }); return api; },
    human(text, { after = 1, origin = { kind: 'human' }, promptSource = 'typed' } = {}) {
      lines.push(base('user', { timestamp: at(after), origin, promptSource, message: { role: 'user', content: text } }));
      return api;
    },
    // Older sessions carry no origin field at all.
    legacyHuman(text, after = 1) {
      lines.push(base('user', { timestamp: at(after), message: { role: 'user', content: text } }));
      return api;
    },
    meta(text, after = 1) {
      lines.push(base('user', { timestamp: at(after), isMeta: true, message: { role: 'user', content: text } }));
      return api;
    },
    interrupt(after = 1) {
      lines.push(base('user', { timestamp: at(after), message: { role: 'user', content: [{ type: 'text', text: '[Request interrupted by user]' }] } }));
      return api;
    },
    notification(body, after = 1) {
      lines.push(base('user', { timestamp: at(after), origin: { kind: 'task-notification' }, message: { role: 'user', content: `<task-notification>${body}</task-notification>` } }));
      return api;
    },
    say(text, after = 1) {
      lines.push(base('assistant', { timestamp: at(after), message: { role: 'assistant', content: [{ type: 'text', text }] } }));
      return api;
    },
    think(after = 1) {
      lines.push(base('assistant', { timestamp: at(after), message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'hm' }] } }));
      return api;
    },
    tool(name, input, { took = 2, after = 1, result = 'ok', toolUseResult = {} } = {}) {
      const id = `toolu_${++n}`;
      lines.push(base('assistant', { timestamp: at(after), message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] } }));
      lines.push(base('user', { timestamp: at(took), toolUseResult, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: result }] } }));
      return api;
    },
    humanWithImage(text, data = 'iVBORw0KGgo=', after = 1) {
      lines.push(base('user', { timestamp: at(after), origin: { kind: 'human' }, message: { role: 'user', content: [{ type: 'text', text }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data } }] } }));
      return api;
    },
    sidechain(text) {
      lines.push(base('user', { timestamp: at(1), isSidechain: true, origin: { kind: 'human' }, message: { role: 'user', content: text } }));
      return api;
    },
    jsonl() { return lines.map((l) => JSON.stringify(l)).join('\n') + '\n'; },
  };
  return api;
}

// A scenario with a board: one question answered by picking an option, one answered by typing
// (the AskUserQuestion "Other" answer: `chosen: null` with the typed text in `answer`). Used by
// the gesture tests and to look at the finger and the typing in a browser.
export function boardScenario({ device } = {}) {
  return {
    format: 'supersuit-simulator/1', id: 'board-demo', title: 'Releasing an album', persona: { name: 'Sam', role: 'musician' },
    source: { kind: 'session', date: '2026-10-28' }, chapters: [], ...(device ? { device } : {}),
    turns: [{
      id: 't1', at: 0, human: { text: 'Get the album ready to release', via: 'typed', choices: [] }, intervention: null,
      steps: [
        { label: 'Read the track list', tool: 'Read', ms: 4000, count: 1, at: 4000 },
        { label: 'Asked about the cover and the date', tool: 'AskUserQuestion', ms: 42000, count: 1, at: 46000, ask: { dismissed: false, questions: [
          { header: 'Cover', question: 'Which cover should go out with it?', options: [{ label: 'The dancer', description: 'oil, warm' }, { label: 'The cage', description: 'blue, cold' }], answer: 'The cage', chosen: 1 },
          { header: 'Date', question: 'When should it release?', options: [{ label: 'Today' }, { label: 'Next Friday' }], answer: 'Hold it until the mastering pass comes back, then the Friday after that', chosen: null },
        ] } },
        { label: 'Set up the release', tool: 'Bash', ms: 90000, count: 1, at: 136000 },
      ],
      replies: [{ text: 'The cage is the cover, and the release waits for mastering.', at: 140000 }], artifacts: [],
    }],
    artifacts: [], cuts: [],
  };
}
