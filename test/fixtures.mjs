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
