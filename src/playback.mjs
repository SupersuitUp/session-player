// Turns a scenario into something watchable. A real session runs for hours and hundreds of
// steps; a viewer gives it minutes. Nothing here changes what happened: condensed steps keep
// their total time and count, and every decision the person made stays visible.

const isAsk = (s) => Boolean(s.ask);
// Decisions and anything the person was shown always stay visible.
const isKept = (s) => isAsk(s) || Boolean(s.images?.length);

export function condense(steps, max = 5) {
  if (steps.length <= max + 1) return steps;
  const keep = new Set(
    steps.map((s, i) => [s, i]).filter(([s]) => !isKept(s)).sort((a, b) => b[0].ms - a[0].ms).slice(0, max).map(([, i]) => i),
  );
  const out = [];
  let group = null;
  steps.forEach((s, i) => {
    if (keep.has(i) || isKept(s)) {
      if (group) out.push(group);
      group = null;
      out.push(s);
      return;
    }
    group ??= { label: '', tool: 'group', ms: 0, count: 0, group: true, at: s.at };
    group.ms += s.ms;
    group.count += s.count ?? 1;
    group.at = s.at;
  });
  if (group) out.push(group);
  for (const s of out) if (s.group) s.label = `${s.count} quick step${s.count === 1 ? '' : 's'}`;
  return out;
}

// Playback time for a step, from its real time: log-scaled so a seven-minute download reads
// as longer than a two-second read without making anyone wait seven minutes.
export function pace(ms) {
  return Math.round(Math.min(1600, 280 + 300 * Math.log10(1 + ms / 1000)));
}

export function duration(ms) {
  if (ms < 1000) return 'under a second';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(ms / 3600000);
  const rest = Math.round((ms - h * 3600000) / 60000);
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

export function summarize(sc) {
  const all = sc.turns.flatMap((t) => t.steps);
  return {
    commands: sc.turns.length,
    steps: all.filter((s) => !isAsk(s)).reduce((n, s) => n + (s.count ?? 1), 0),
    agentMs: all.filter((s) => !isAsk(s)).reduce((n, s) => n + s.ms, 0),
    decisions: all.filter(isAsk).length,
    redirects: sc.turns.filter((t) => t.intervention).length,
    artifacts: (sc.artifacts ?? []).length,
    idleMs: all.reduce((n, s) => n + (s.idleMs ?? 0), 0),
  };
}

// One entry per turn: the command the viewer sends, then the events that follow it in the
// order they really happened, each with a playback offset `t`. `length` is the turn's
// playback time.
export function script(sc, { maxSteps = 5 } = {}) {
  const byId = new Map((sc.artifacts ?? []).map((a) => [a.id, a]));
  return sc.turns.map((turn) => {
    const steps = condense(turn.steps, maxSteps);
    const items = [
      ...steps.map((s) => ({ kind: 'step', real: s.at ?? turn.at, step: s })),
      ...turn.replies.map((r) => ({ kind: 'reply', real: r.at, reply: r })),
      ...turn.artifacts.map((id) => byId.get(id)).filter(Boolean).map((a) => ({ kind: 'artifact', real: a.at ?? turn.at, artifact: a })),
    ].map((e, i) => ({ ...e, i }));
    // Stable by real time; within one instant, steps before replies before artifacts.
    const rank = { step: 0, reply: 1, artifact: 2 };
    items.sort((a, b) => a.real - b.real || rank[a.kind] - rank[b.kind] || a.i - b.i);
    let t = 0;
    const events = items.map(({ i, ...e }) => {
      const at = t;
      t += e.kind === 'step' ? pace(e.step.ms) : e.kind === 'reply' ? 900 : 500;
      return { ...e, t: at };
    });
    return { id: turn.id, command: { text: turn.human.text, intervention: turn.intervention, images: turn.human.images }, events, length: t };
  });
}

// What the person really did on one question of a board.
export function realPick(q, dismissed) {
  if (dismissed) return { kind: 'dismissed', index: null, label: 'closed it and typed instead' };
  if (q.chosen != null) return { kind: 'option', index: q.chosen, label: q.options[q.chosen]?.label ?? q.answer };
  return { kind: 'other', index: null, label: q.answer ?? '' };
}

// The viewer's pick against the real one. A recording has one path, so a different pick is
// answered with what really happened, never with an invented branch.
export function compare(q, dismissed, pick) {
  const real = realPick(q, dismissed);
  const same = pick.kind === real.kind && (real.kind !== 'option' || pick.index === real.index);
  return { same, real: real.label };
}

// Frames for "saying" a command: words appear the way dictation lands, ending on the whole
// command. Long pastes advance in larger jumps so no command takes more than ~40 frames.
export function dictate(text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const step = Math.max(1, Math.ceil(words.length / 40));
  const frames = [];
  for (let n = step; n < words.length; n += step) frames.push(words.slice(0, n).join(' '));
  frames.push(String(text).trim());
  return frames;
}
