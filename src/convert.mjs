// Drafts a scenario from a Claude Code session transcript (~/.claude/projects/<dir>/<id>.jsonl).
//
// The hard part is telling what the PERSON typed from everything else that arrives as a
// "user" line: tool results, skill bodies, task notifications, peer-session messages and
// interrupt markers. Get that wrong and the replay shows the agent talking to itself.
//
// This drafts; it does not publish. Anonymizing people is the promote skill's job. What the
// converter guarantees is a floor: no credential-shaped string and no home path survives,
// and every edit it makes is written to `cuts`, so nothing is staged silently.

import { FORMAT } from './scenario.mjs';

const LONG_PASTE = 600;
const PASTE_KEEP = 280;

export function parseSession(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* a torn line is skipped, never fatal */ }
  }
  return out;
}

const blocks = (m) => (typeof m?.content === 'string' ? [{ type: 'text', text: m.content }] : Array.isArray(m?.content) ? m.content : []);
const textOf = (m) => blocks(m).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
const isInterrupt = (o) => o.type === 'user' && /^\[Request interrupted by user/.test(textOf(o.message));

function isHuman(o) {
  if (o.type !== 'user' || o.isSidechain || o.isMeta || o.toolUseResult !== undefined) return false;
  if (blocks(o.message).some((b) => b.type === 'tool_result')) return false;
  const text = textOf(o.message);
  if (!text) return false;
  if (o.origin) return o.origin.kind === 'human';
  // Sessions recorded before Claude Code wrote `origin`: anything machine-made starts with a tag or a bracket.
  return !/^[<[]/.test(text);
}

// Credential shapes, and env-style assignments whose value looks like a secret.
const SECRETS = [
  /\b(sk-[A-Za-z0-9_-]{20,})/g,
  /\b(gh[pousr]_[A-Za-z0-9]{30,})/g,
  /\b(AIza[0-9A-Za-z_-]{30,})/g,
  /\b(xox[abprs]-[A-Za-z0-9-]{10,})/g,
  /\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*=(["']?)([A-Za-z0-9_\-./+]{16,})\1/g,
];

// Contact details: a scenario is shown to strangers, and an agent session is full of them
// (every text-message approval names a number). Dates (2026-10-10), versions (4.259.1) and
// counts (1,000) do not match: a phone needs 10 digits in 3-3-4 groups.
const CONTACTS = [
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email removed]'],
  [/(?<![\w.-])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![\w-]|\.\d)/g, '[phone removed]'],
  [/(?<![\w.-])\+\d{11,15}(?![\w-])/g, '[phone removed]'],
];

function cleaner(home, cuts) {
  const homeRe = home ? new RegExp(home.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : null;
  return (text, turn, where) => {
    let s = String(text ?? '');
    if (homeRe) s = s.replace(homeRe, '~');
    for (const [re, mark] of CONTACTS) {
      s = s.replace(re, () => {
        cuts.push({ turn, what: where, reason: 'contact detail removed' });
        return mark;
      });
    }
    for (const re of SECRETS) {
      s = s.replace(re, (m) => {
        cuts.push({ turn, what: where, reason: 'credential removed' });
        const eq = m.indexOf('=');
        return eq > 0 && /[A-Z]/.test(m[0]) ? `${m.slice(0, eq + 1)}[removed]` : '[removed]';
      });
    }
    return s;
  };
}

const base = (p) => String(p).split('/').filter(Boolean).pop() ?? String(p);

function stepFor(name, input = {}) {
  switch (name) {
    case 'Read': return { kind: 'read', label: `read ${base(input.file_path)}` };
    case 'Write': return { kind: 'write', label: `wrote ${base(input.file_path)}` };
    case 'Edit': case 'MultiEdit': case 'NotebookEdit': return { kind: 'edit', label: `edited ${base(input.file_path ?? input.notebook_path)}` };
    case 'Grep': case 'Glob': return { kind: 'search', label: 'searched the files' };
    case 'Skill': return { kind: `skill:${input.skill}`, label: `used ${input.skill}` };
    case 'Agent': case 'Task': return { kind: `agent:${input.description}`, label: input.description || 'ran an agent' };
    case 'Bash': return { kind: `bash:${input.description ?? input.command}`, label: input.description || 'ran a command' };
    case 'WebFetch': case 'WebSearch': return { kind: 'web', label: 'read the web' };
    case 'AskUserQuestion': return { kind: 'ask', label: 'asked a question' };
    default: return { kind: `tool:${name}`, label: name.replace(/^mcp__[^_]+__/, '').replace(/_/g, ' ') };
  }
}

const PLURAL = { read: (n) => `read ${n} files`, write: (n) => `wrote ${n} files`, edit: (n) => `edited ${n} files`, search: (n) => `searched the files ${n} times`, web: (n) => `read ${n} web pages` };

function merge(steps) {
  const out = [];
  for (const s of steps) {
    const last = out[out.length - 1];
    if (last && last.kind === s.kind) { last.count += 1; last.ms += s.ms; last.at = s.at; continue; }
    out.push({ ...s, count: 1 });
  }
  return out.map(({ kind, ...s }) => (s.count > 1 && PLURAL[kind] ? { ...s, label: PLURAL[kind](s.count) } : s));
}

const URL_RE = /https:\/\/[^\s)>\]"'`]+/g;
// A path the agent names in backticks is something it is pointing the person at.
const PATH_RE = /`((?:~|\/)[^`\s]*\/[^`\s]+)`/g;
// What a viewer counts as "made": a page, a picture, a sound, a document. Code, config and
// folders are how the work got done, and they already show as steps. Counting every file
// written put a session's tooling in the "made" list (Gary, 2026-10-10: "This session
// definitely didn't make all these files").
const DELIVERABLE = /\.(md|pdf|docx?|pptx?|key|xlsx?|csv|html?|png|jpe?g|gif|webp|svg|heic|wav|mp3|m4a|aac|flac|mp4|mov|webm|epub)$/i;

// Tools that are harness plumbing rather than work a viewer would recognize. They are not
// shown; their time is carried into the next real step so the clock still adds up.
const PLUMBING = new Set(['ToolSearch', 'EnterWorktree', 'ExitWorktree', 'TaskOutput', 'TaskStop', 'TodoWrite', 'ListAgents', 'ScheduleWakeup']);

export function convert(lines, opts = {}) {
  const home = opts.home ?? process.env.HOME ?? '';
  const cuts = [];
  const clean = cleaner(home, cuts);

  const results = new Map();
  const resultText = new Map();
  for (const o of lines) {
    if (o.type !== 'user') continue;
    for (const b of blocks(o.message)) {
      if (b.type !== 'tool_result') continue;
      results.set(b.tool_use_id, Date.parse(o.timestamp));
      resultText.set(b.tool_use_id, typeof b.content === 'string' ? b.content : (b.content ?? []).map((c) => c.text ?? '').join('\n'));
    }
  }

  const turns = [];
  const chapters = [];
  const artifacts = [];
  const seenArtifact = new Map();
  // Claude Code writes two title streams that alternate line by line: the session's name
  // (custom-title) and an automatic one (ai-title). Chapters follow the name when the
  // session has one, else the automatic title; mixing them flips the chapter every line.
  const titleType = lines.some((o) => o.type === 'custom-title') ? 'custom-title' : 'ai-title';
  let title = null;
  let pendingTitle = null;
  let cursor = null;
  let carry = 0;
  let interrupted = false;
  let start = null;
  let raw = [];
  let sessionId = null;

  const addArtifact = (turn, a, at) => {
    const key = a.path ?? a.url;
    if (seenArtifact.has(key)) return;
    const id = `a${artifacts.length + 1}`;
    seenArtifact.set(key, id);
    artifacts.push({ id, ...a, turn: turn.id, at });
    turn.artifacts.push(id);
  };
  const flush = () => {
    const t = turns[turns.length - 1];
    if (carry && raw.length) raw[raw.length - 1].ms += carry;
    if (t) t.steps = merge(raw);
    raw = [];
    carry = 0;
  };

  for (const o of lines) {
    if (o.isSidechain) continue;
    sessionId ??= o.sessionId ?? null;
    if (o.type === 'custom-title' || o.type === 'ai-title') {
      if (o.type !== titleType) continue;
      const t = o.customTitle ?? o.aiTitle;
      if (t && t !== title) { title = t; pendingTitle = t; }
      continue;
    }
    if (isInterrupt(o)) { interrupted = true; continue; }

    if (isHuman(o)) {
      flush();
      const ts = Date.parse(o.timestamp);
      start ??= ts;
      cursor = ts;
      const id = `t${turns.length + 1}`;
      let text = clean(textOf(o.message), id, 'human');
      if (text.length > LONG_PASTE) {
        cuts.push({ turn: id, what: 'human', reason: 'long paste collapsed' });
        text = `${text.slice(0, PASTE_KEEP).trimEnd()} [pasted ${text.length} characters]`;
      }
      turns.push({ id, at: ts - start, human: { text, via: o.promptSource === 'voice' ? 'spoken' : 'typed', choices: [] }, intervention: interrupted ? 'redirect' : null, steps: [], replies: [], artifacts: [] });
      if (pendingTitle) { chapters.push({ title: pendingTitle, turn: id }); pendingTitle = null; }
      interrupted = false;
      continue;
    }

    const turn = turns[turns.length - 1];
    if (!turn || o.type !== 'assistant') continue;
    interrupted = false;
    const ts = Date.parse(o.timestamp);
    for (const b of blocks(o.message)) {
      if (b.type === 'text' && b.text.trim()) {
        const text = clean(b.text.trim(), turn.id, 'reply');
        turn.replies.push({ text, at: ts - start });
        cursor = Math.max(cursor, ts);
        for (const url of text.match(URL_RE) ?? []) addArtifact(turn, { kind: 'link', title: url.replace(/^https:\/\//, '').replace(/[.,;:]+$/, ''), url: url.replace(/[.,;:]+$/, '') }, ts - start);
        for (const [, path] of text.matchAll(PATH_RE)) if (DELIVERABLE.test(path)) addArtifact(turn, { kind: 'file', title: base(path), path }, ts - start);
      } else if (b.type === 'tool_use') {
        // Real tools return in well under a second; the time goes to the agent thinking
        // before it calls them. So a step owns the whole gap since the previous step ended.
        const end = Math.max(results.get(b.id) ?? ts, ts);
        const ms = Math.max(0, end - cursor) + carry;
        cursor = end;
        carry = 0;
        if (PLUMBING.has(b.name)) { carry = ms; continue; }
        const { kind, label } = stepFor(b.name, b.input);
        const step = { kind, label: clean(label, turn.id, 'step'), tool: b.name, ms, at: end - start };
        if (b.name === 'AskUserQuestion') {
          // The agent stopped and the person decided: the clearest human-in-the-loop moment
          // a session has, so both the question and the answer are kept.
          const question = clean(b.input?.questions?.[0]?.question ?? '', turn.id, 'step');
          const answer = clean(resultText.get(b.id)?.match(/"[^"]*"="([^"]*)"/)?.[1] ?? '', turn.id, 'step');
          Object.assign(step, { kind: `ask:${b.id}`, label: question ? `asked: ${question}` : 'asked a question', ask: { question, answer } });
        }
        raw.push(step);
        if (b.name === 'Write' && DELIVERABLE.test(b.input?.file_path ?? '')) addArtifact(turn, { kind: 'file', title: base(b.input.file_path), path: clean(b.input.file_path, turn.id, 'artifact') }, ts - start);
      }
    }
  }
  flush();
  if (turns.length === 0) throw new Error('no human turns in this session: nothing to draft');

  const first = lines.find((o) => o.timestamp && !o.isSidechain);
  return {
    format: FORMAT,
    id: opts.id ?? `session-${(sessionId ?? 'unknown').slice(0, 8)}`,
    title: opts.title ?? title ?? turns[0].human.text.slice(0, 60),
    persona: { name: 'the operator', role: '', blurb: '', ...opts.persona },
    source: { kind: 'session', sessionId, date: first ? first.timestamp.slice(0, 10) : null, illustrative: false },
    chapters,
    turns,
    artifacts,
    cuts,
  };
}
