// Co-work: two operators' Plumas passing messages straight to each other. In a Claude Code
// transcript the two directions look nothing alike, so each needs its own reader:
//
// - INCOMING messages arrive as Monitor task notifications (a `user` line, or a `queued_command`
//   attachment when one lands mid-turn), whose <event> holds one JSON line per event:
//   {"type":"say","from":"host","text":"[1/3] For: ...","at":"..."}. A long message is split
//   by the sender into numbered parts, [1/3] [2/3] [3/3], sent spaced apart, so they arrive as
//   separate notifications (or, after a reconnect, several "held" lines in one).
// - OUTGOING messages are Bash calls running `cowork.mjs say "<text>"`, the text usually built
//   in a shell variable (`T='...'"'"'...'; ... say "$T"`) or staged in a file earlier.
//
// Without these the replay showed the co-work as bare "Monitor" steps and one-line command
// labels, which hid the conversation that is the whole point of a co-work demo.

// ---- outgoing: a small, honest reader for the shell the agent actually writes ----

const STOP = /[\s;&|<>()]/;

// `$NAME`, `${NAME}`, or `$(cat PATH)`. Anything else cannot be known from the transcript.
function expand(s, i, env) {
  if (s[i + 1] === '(') {
    let depth = 1;
    let j = i + 2;
    for (; j < s.length && depth; j++) { if (s[j] === '(') depth++; else if (s[j] === ')') depth--; }
    const inner = s.slice(i + 2, j - 1).trim();
    const m = inner.match(/^cat\s+(.+)$/s);
    const path = m ? word(m[1], 0, env).value : null;
    const content = path == null ? undefined : env.files.get(path);
    return { value: content == null ? null : content.replace(/\n+$/, ''), end: j };
  }
  const m = s.slice(i).match(/^\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))/);
  if (!m) return { value: '$', end: i + 1 };
  const v = env.vars.get(m[1] ?? m[2]);
  return { value: v ?? null, end: i + m[0].length };
}

// One shell word from s[i]: quotes, escapes and expansions resolved. `value` is null when any
// part of it cannot be resolved from what the transcript holds.
function word(s, i, env) {
  let out = '';
  let ok = true;
  const take = (r) => { if (r.value == null) ok = false; else out += r.value; return r.end; };
  while (i < s.length && !STOP.test(s[i])) {
    const c = s[i];
    if (c === "'") {
      const j = s.indexOf("'", i + 1);
      if (j < 0) return { value: null, end: s.length };
      out += s.slice(i + 1, j);
      i = j + 1;
    } else if (c === '"') {
      i += 1;
      while (i < s.length && s[i] !== '"') {
        if (s[i] === '\\' && '"\\$`\n'.includes(s[i + 1])) { if (s[i + 1] !== '\n') out += s[i + 1]; i += 2; }
        else if (s[i] === '$') i = take(expand(s, i, env));
        else out += s[i++];
      }
      i += 1;
    } else if (c === '\\') { out += s[i + 1] ?? ''; i += 2; }
    else if (c === '$') i = take(expand(s, i, env));
    else out += s[i++];
  }
  return { value: ok ? out : null, end: i };
}

// Walks one command statement by statement, tracking variables and the files it writes, and
// returns the text of every `cowork.mjs say` in it. `files` persists across a session's
// commands (a reply staged in one call is sent by a later one) and is updated in place.
export function shellSays(command, files = new Map()) {
  const s = String(command ?? '');
  const env = { vars: new Map(), files };
  const says = [];
  let i = 0;
  let words = [];
  let target = null;
  let heredoc = null;
  let body = null;
  const end = () => {
    if (words.length) {
      const [cmd, ...args] = words;
      if (target != null && cmd === 'printf' && /^%s(\\n)?$/.test(args[0] ?? '') && args[1] != null) files.set(target, args[1] + (args[0].endsWith('\\n') ? '\n' : ''));
      if (target != null && cmd === 'cat' && body != null) files.set(target, body);
      const at = words.findIndex((w) => typeof w === 'string' && /(^|\/)cowork\.mjs$/.test(w));
      if (at >= 0 && words[at + 1] === 'say') says.push(words[at + 2] ?? null);
    }
    words = []; target = null; heredoc = null; body = null;
  };
  while (i < s.length) {
    const c = s[i];
    if (c === '\n') {
      i += 1;
      if (heredoc) {
        const lines = [];
        while (i < s.length) {
          const nl = s.indexOf('\n', i);
          const line = s.slice(i, nl < 0 ? s.length : nl);
          i = nl < 0 ? s.length : nl + 1;
          if ((heredoc.strip ? line.replace(/^\t+/, '') : line) === heredoc.delim) break;
          lines.push(heredoc.strip ? line.replace(/^\t+/, '') : line);
        }
        body = lines.length ? `${lines.join('\n')}\n` : '';
      }
      end();
      continue;
    }
    if (c === ' ' || c === '\t') { i += 1; continue; }
    if (c === ';' || c === '|' || c === '&') { i += s[i + 1] === c ? 2 : 1; end(); continue; }
    if (c === '(' || c === ')') { i += 1; continue; }
    if (c === '<' && s[i + 1] === '<') {
      i += 2;
      const strip = s[i] === '-';
      if (strip) i += 1;
      while (s[i] === ' ') i += 1;
      const d = word(s, i, env);
      heredoc = { delim: d.value ?? '', strip };
      i = d.end;
      continue;
    }
    if (c === '>' || c === '<') {
      i += s[i + 1] === '>' ? 2 : 1;
      if (s[i] === '&') { i += 1; while (/\d/.test(s[i] ?? '')) i += 1; if (/^\d$/.test(words[words.length - 1] ?? '')) words.pop(); continue; }
      while (s[i] === ' ') i += 1;
      const t = word(s, i, env);
      if (c === '>') target = t.value;
      if (/^\d$/.test(words[words.length - 1] ?? '')) words.pop();
      i = t.end;
      continue;
    }
    // NAME=value at the head of a statement is an assignment.
    const asg = words.length === 0 && s.slice(i).match(/^([A-Za-z_]\w*)=/);
    if (asg) {
      const w = word(s, i + asg[0].length, env);
      if (w.value == null) env.vars.delete(asg[1]); else env.vars.set(asg[1], w.value);
      i = w.end;
      continue;
    }
    const w = word(s, i, env);
    words.push(w.value);
    i = w.end > i ? w.end : i + 1;
  }
  end();
  return says;
}

// The text one command sends with `cowork.mjs say`, or null when it sends nothing (or sends
// something the transcript cannot show, such as a file it never saw written).
export function decodeSay(command, files) {
  return shellSays(command, files)[0] ?? null;
}

// ---- incoming: the Monitor's notifications ----

function notificationBody(o) {
  if (o.type === 'user') {
    const c = o.message?.content;
    const text = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b.type === 'text').map((b) => b.text).join('\n') : '';
    return /<task-notification>/.test(text) ? text : null;
  }
  if (o.type === 'attachment' && o.attachment?.type === 'queued_command' && typeof o.attachment.prompt === 'string') {
    return /<task-notification>/.test(o.attachment.prompt) ? o.attachment.prompt : null;
  }
  return null;
}

// Every co-work event one transcript line carries, each with its raw line (for dedupe), or
// null when the line is not a task notification at all.
export function coworkEvents(o) {
  const body = notificationBody(o);
  if (!body) return null;
  const out = [];
  for (const [, ev] of body.matchAll(/<event>([\s\S]*?)<\/event>/g)) {
    for (const raw of ev.split('\n')) {
      const line = raw.trim();
      if (!line.startsWith('{')) continue;
      try {
        const e = JSON.parse(line);
        if (e && typeof e.type === 'string') out.push({ ...e, raw: line });
      } catch { /* a line that is not JSON is the Monitor talking (an expiry), not the peer */ }
    }
  }
  return out;
}

export function coworkPeer(o) {
  const body = notificationBody(o);
  return body?.match(/co-work messages from ([^"<\n]+)"/)?.[1]?.trim() ?? null;
}

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&amp;': '&' };
// The notification layer escapes markup in the event text; a reader should see what was sent.
export const unescapeEvent = (t) => String(t).replace(/&(lt|gt|quot|#39|apos|amp);/g, (m) => ENTITIES[m]);

const PART = /^\[(\d+)\/(\d+)\]\s?/;

// Joins the numbered parts of each incoming message, in order. `emit(text, line)` is called
// once per whole message, with the transcript line on which it completed. A part that never
// arrived is said in place, so a cut message never reads as a complete one.
export function partJoiner(emit) {
  let pending = null;
  const flush = () => {
    if (!pending) return;
    const { n, parts, line } = pending;
    const pieces = [];
    for (let k = 1; k <= n; k++) pieces.push(parts.has(k) ? parts.get(k) : `[part ${k} of ${n} did not arrive]`);
    pending = null;
    emit(pieces.join(' ').trim(), line);
  };
  return {
    push(text, line) {
      const t = unescapeEvent(text);
      const m = t.match(PART);
      if (!m) { flush(); emit(t.trim(), line); return; }
      const k = Number(m[1]);
      const n = Number(m[2]);
      const part = t.slice(m[0].length).trim();
      if (pending && (pending.n !== n || pending.parts.has(k) || k < pending.last)) flush();
      pending ??= { n, parts: new Map(), last: 0, line };
      pending.parts.set(k, part);
      pending.last = k;
      pending.line = line;
      if (k === n) flush();
    },
    flush,
  };
}
