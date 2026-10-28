// The Supersuit Simulator player: a phone you step into. The viewer sends each command
// (tap it, or hold the mic to "say" it), watches the work play out, and sees what got made
// collect beside the conversation. Plain React.createElement so it needs no build step.
//
// Switches: autoplay, artifacts, timeline, maxSteps, device (auto, iphone, macbook), clock
// (session, the default, or wall), and
// `scenarios` (more than one shows the persona picker). Mobile first; the side panel appears
// when the container is wide enough. On a desktop the demo is drawn inside a device (device.mjs).

import { createElement as h, createContext, useContext, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { script, summarize, duration, realPick, compare, dictate } from './playback.mjs';
import { PLAYER_CSS, MAISON_CSS, CLAUDE_CSS } from './player-css.mjs';
import { resolveDevice, normalizeMode, readViewer, watchViewer, autoHint, deviceToast, autoplayToast, choiceToast } from './device.mjs';
import { normalizeClock, sessionTime, menuBarText, statusText } from './clock.mjs';
import { tap, answerScript, run, pointerFor, prefersReducedMotion } from './gesture.mjs';

// What this player does itself, for a host page that used to do it from outside and should stop
// once the copy it serves has it: the session clock on every device, the phone's time
// pill, and the MacBook window's tighter text.
export const FEATURES = Object.freeze({ sessionClock: true, phoneClock: true, macbookText: true });

const plain = (s) => String(s).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/^#+\s*/gm, '');
const initial = (name = '?') => name.trim().charAt(0).toUpperCase();

// The agent's name in every line the player writes itself. A prop (`agent`) so a host can name
// its own agent; recorded scenario text is never rewritten, since it is a record of a real session.
export const DEFAULT_AGENT = 'Pluma';
const AgentName = createContext(DEFAULT_AGENT);
const useAgent = () => useContext(AgentName);

// The hand the replay uses when it answers for the person (gesture.mjs): `step` moves the pointer,
// `speed` scales it, `reduced` drops the travel. Without a provider (a board rendered on its own)
// nothing is drawn and the choices still land.
const Gesture = createContext({ step: null, speed: 1, reduced: false });

// The pointer itself: a fingertip on a phone, the arrow on a MacBook, pinned to the control it is
// pressing, with a ripple on each press. Positions come from the controls' own boxes.
const FINGER = h('svg', { className: 'ss-finger-art', viewBox: '0 0 40 112', width: 40, height: 112, 'aria-hidden': true },
  h('path', { d: 'M7 24C7 8 33 8 33 24L34.5 112H5.5Z', fill: '#e8b796', stroke: 'rgba(60,35,20,.35)', strokeWidth: 1.2 }),
  h('path', { d: 'M12.5 21C12.5 12 27.5 12 27.5 21L27 33C23.5 36 16.5 36 13 33Z', fill: '#f6dccb', stroke: 'rgba(60,35,20,.25)', strokeWidth: 1 }),
  h('path', { d: 'M11 64Q20 67 29 64M12 70Q20 72.5 28 70', fill: 'none', stroke: 'rgba(60,35,20,.28)', strokeWidth: 1.2, strokeLinecap: 'round' }));
const CURSOR = h('svg', { className: 'ss-cursor-art', viewBox: '0 0 16 24', width: 18, height: 27, 'aria-hidden': true },
  h('path', { d: 'M1 1V18.5L5.4 14.3L8.5 21.6L11.5 20.3L8.5 13.2H14.6Z', fill: '#111', stroke: '#fff', strokeWidth: 1.3, strokeLinejoin: 'round' }));

export function Pointer({ kind = 'finger', state }) {
  if (!state) return null;
  const { x = 0, y = 0, ms = 0, visible = false, pressed = false, ripple = 0 } = state;
  return h('div', {
    className: `ss-pointer ss-${kind}${visible ? ' ss-on' : ''}${pressed ? ' ss-pressed' : ''}`, 'aria-hidden': true,
    style: { transform: `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`, transitionDuration: `${ms}ms, 180ms` },
  },
  h('span', { className: 'ss-touch' }),
  ripple > 0 && h('span', { key: ripple, className: 'ss-ripple' }),
  kind === 'cursor' ? CURSOR : FINGER);
}

function usePointer(hostRef, kind) {
  const [state, setState] = useState({ x: 0, y: 0, ms: 0, visible: false, pressed: false, ripple: 0 });
  const cur = useRef(state);
  const set = (patch) => { cur.current = { ...cur.current, ...patch }; setState(cur.current); };
  const locate = (target) => {
    const host = hostRef.current;
    const el = host?.querySelector(`[data-ss-target="${target}"]`);
    if (!el) return null;
    const a = host.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    // A wide row is pressed toward its start, where a thumb lands; a button at its centre.
    const x = b.width > 120 ? b.left - a.left + Math.min(b.width * 0.3, 90) : b.left - a.left + b.width / 2;
    return { x, y: b.top - a.top + b.height / 2 };
  };
  const enter = () => {
    const r = hostRef.current?.getBoundingClientRect();
    return r ? (kind === 'cursor' ? { x: r.width * 0.62, y: r.height * 0.55 } : { x: r.width * 0.78, y: r.height + 30 }) : { x: 0, y: 0 };
  };
  const step = (s) => {
    const p = s.target ? locate(s.target) : null;
    if (s.kind === 'travel') {
      if (!p) return;
      if (!cur.current.visible) {
        set({ ...enter(), ms: 0, visible: true });
        const go = typeof requestAnimationFrame === 'function' ? (f) => requestAnimationFrame(() => requestAnimationFrame(f)) : (f) => setTimeout(f, 16);
        go(() => set({ ...p, ms: Math.max(0, s.ms - 32) }));
      } else set({ ...p, ms: s.ms });
    } else if (s.kind === 'press') {
      set({ ...(!cur.current.visible && p ? { ...p, ms: 0 } : {}), visible: true, pressed: true, ripple: cur.current.ripple + 1 });
    } else if (s.kind === 'release') set({ pressed: false });
    else if (s.kind === 'lift') { if (kind !== 'cursor') set({ visible: false, pressed: false }); }
    else if (s.kind === 'hide') set({ visible: false, pressed: false });
  };
  return [state, step];
}

// What the person typed into the board's Other field, as they type it.
export function OtherField({ text = '', person }) {
  const box = useRef(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [text]);
  return h('div', { className: 'ss-otherfield', 'data-ss-target': 'other-field' },
    h('small', null, `${person} is typing their own answer`),
    h('div', { className: 'ss-otherbox' },
      h('div', { className: 'ss-othertext', ref: box }, text, h('span', { className: 'ss-caret' })),
      h('span', { className: 'ss-othersend', 'data-ss-target': 'other-send', 'aria-hidden': true }, '\u2191')));
}

// Images the person saw. Tap one to see it full screen; tap again to close.
function Gallery({ images, strip = false }) {
  const [open, setOpen] = useState(null);
  if (!images?.length) return null;
  return h('div', { className: strip ? 'ss-strip' : 'ss-gallery' },
    images.map((im, i) => h('button', { key: im.id ?? i, className: 'ss-thumb', onClick: () => setOpen(i), 'aria-label': im.caption ?? 'image' },
      h('img', { src: im.src, alt: im.caption ?? '', loading: 'lazy' }),
      im.caption && !strip && h('span', null, im.caption))),
    open != null && h('button', { className: 'ss-lightbox', onClick: () => setOpen(null), 'aria-label': 'Close' },
      h('img', { src: images[open].src, alt: images[open].caption ?? '' }),
      images[open].caption && h('span', null, images[open].caption)));
}

function Reply({ text }) {
  const agent = useAgent();
  const [open, setOpen] = useState(false);
  const t = plain(text);
  const long = t.length > 360;
  return h('div', { className: 'ss-reply' },
    h('span', { className: 'ss-who' }, agent),
    h('p', null, long && !open ? `${t.slice(0, 320).trimEnd()}…` : t),
    long && h('button', { className: 'ss-more', onClick: () => setOpen(!open) }, open ? 'less' : 'more'));
}

// A decision, as the native question board: pinned to the bottom of the phone in place of
// the composer, one question at a time, a tab per question. The viewer picks; the pick is
// answered with what the person really chose, then the next question, then the replay goes
// on along the real path (a recording has one path, so no branch is ever invented).
export function Board({ ask, person, auto = false, onPick, images, onToast }) {
  const agent = useAgent();
  const gesture = useContext(Gesture);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState({});
  // The Other field while an answer is being typed into it: { text }.
  const [typing, setTyping] = useState(null);
  const cancel = useRef(null);
  useEffect(() => () => cancel.current?.(), []);
  const q = ask.questions[idx];
  const mine = picks[idx];
  const real = realPick(q, ask.dismissed);
  const verdict = mine && compare(q, ask.dismissed, mine);

  useEffect(() => {
    if (!mine) return undefined;
    const id = setTimeout(() => {
      if (idx + 1 < ask.questions.length) setIdx(idx + 1); else onPick?.(picks);
    }, 1300);
    return () => clearTimeout(id);
  }, [mine, idx]);
  // Play an answer script: the pointer moves for every tap, the Other field opens and fills, and
  // the pick lands only at the end.
  const play = (steps, pick) => run(steps, (s) => {
    if (s.kind === 'open') setTyping({ text: '' });
    else if (s.kind === 'type') setTyping({ text: s.text });
    else if (s.kind === 'action') { if (s.action === 'pick') { setTyping(null); setPicks((p) => (p[idx] ? p : { ...p, [idx]: pick })); } }
    else gesture.step?.(s);
  });
  useEffect(() => {
    if (!auto || mine) return undefined;
    const stop = play(answerScript(q, ask.dismissed, { speed: gesture.speed, reduced: gesture.reduced, lead: 1200 }), real);
    return () => { stop(); gesture.step?.({ kind: 'hide' }); };
  }, [auto, idx, mine]);

  const choose = (pick) => {
    if (picks[idx] || typing) return;
    onToast?.(choiceToast(person, compare(q, ask.dismissed, pick)));
    // The viewer tapped Other: the field opens and the real answer types itself, then it is sent.
    if (pick.kind === 'other' && real.kind === 'other') {
      cancel.current = play(answerScript(q, ask.dismissed, { speed: gesture.speed, reduced: gesture.reduced, lead: 0, finger: false }), pick);
      return;
    }
    setPicks((p) => (p[idx] ? p : { ...p, [idx]: pick }));
  };
  const same = (a, b) => a.kind === b.kind && (a.kind !== 'option' || a.index === b.index);
  const row = (key, pick, label, description, image) => {
    if (key === 'other' && typing) return h(OtherField, { key, text: typing.text, person });
    const isReal = mine && same(pick, real);
    const isMine = mine && same(pick, mine);
    const cls = `ss-opt${isReal ? ' ss-chosen' : ''}${isMine && !isReal ? ' ss-yours' : ''}`;
    const target = typeof key === 'number' ? `opt-${key}` : key === 'other' ? 'opt-other' : 'dismiss';
    return h('button', { key, className: cls, disabled: Boolean(mine), 'data-ss-target': target, onClick: () => choose(pick) },
      h('span', { className: 'ss-onum' }, isReal ? '\u2713' : typeof key === 'number' ? key + 1 : '\u2026'),
      image && h('img', { className: 'ss-oimg', src: image.src, alt: '' }),
      h('span', null, h('b', null, label), description && h('small', null, description)));
  };
  return h('div', { className: 'ss-sheet ss-qcard', role: 'dialog', 'aria-label': `${agent} is asking` },
    h('span', { className: 'ss-qlabel' }, 'Question'),
    ask.questions.length > 1 && h('div', { className: 'ss-tabs' }, ask.questions.map((qq, qi) => h('span', {
      key: qi, className: `ss-tab${qi === idx ? ' ss-tab-now' : ''}${picks[qi] ? ' ss-tab-done' : ''}`,
    }, qq.header || `Question ${qi + 1}`))),
    h('p', { className: 'ss-q' }, plain(q.question)),
    idx === 0 && h(Gallery, { images, strip: true }),
    h('div', { className: 'ss-opts' },
      q.options.map((o, oi) => row(oi, { kind: 'option', index: oi }, o.label, o.description, o.image)),
      real.kind === 'other' && row('other', { kind: 'other' }, mine ? plain(q.answer) : 'Other', mine ? `typed by ${person}` : 'type your own answer'),
      real.kind === 'dismissed' && row('dismiss', { kind: 'dismissed' }, 'Type something else', 'close this and say what you want')),
    h('p', { className: `ss-verdict${verdict?.same ? ' ss-same' : ''}` },
      !verdict ? 'Your call.' : verdict.same ? `Same call as ${person}.` : `${person} ${real.kind === 'dismissed' ? '' : 'chose '}${verdict.real} in the real session, so that is where this goes.`));
}

// The record a board leaves in the conversation once it is answered: each question and what
// was chosen, compact, the way the native transcript shows an answered question.
export function Asked({ ask, person, ms, picks = {} }) {
  return h('div', { className: 'ss-asked ss-qcard' },
    ask.questions.map((q, qi) => {
      const real = realPick(q, ask.dismissed);
      const mine = picks[qi];
      const v = mine && compare(q, ask.dismissed, mine);
      const mineLabel = mine && (mine.kind === 'option' ? q.options[mine.index]?.label : mine.kind === 'other' ? 'Other' : 'to type something else');
      return h('div', { key: qi, className: 'ss-aq' },
        qi === 0 && h('span', { className: 'ss-qlabel' }, 'Question'),
        h('p', { className: 'ss-q' }, plain(q.question)),
        h('p', { className: 'ss-a' }, real.index != null && q.options[real.index]?.image && h('img', { className: 'ss-aimg', src: q.options[real.index].image.src, alt: '' }), real.kind === 'dismissed' ? 'Closed it' : plain(real.label)),
        v && !v.same && h('p', { className: 'ss-mine' }, `You picked ${mineLabel}`));
    }),
    h('div', { className: 'ss-bfoot' },
      h('span', { className: 'ss-tag' }, ask.dismissed ? `${person} closed this and typed instead` : `${person} chose`),
      h('span', { className: 'ss-dur' }, duration(ms))));
}

function Step({ step, person, picks, live }) {
  if (step.ask) return live ? null : h(Fragment, null, h(Gallery, { images: step.images }), h(Asked, { ask: step.ask, person, ms: step.ms, picks }));
  if (step.images?.length) return h(Fragment, null, h(StepLine, { step }), h(Gallery, { images: step.images }));
  return h(StepLine, { step });
}

// A tool call, the way the Claude app lists one: a diamond, the step, a chevron. The real duration
// stays in the row (its title, and visible where the skin has room) since the replay is timed by it.
const DIAMOND = h('svg', { viewBox: '0 0 14 14', width: 14, height: 14, 'aria-hidden': true },
  h('path', { d: 'M7 1.2 12.8 7 7 12.8 1.2 7Z', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinejoin: 'round' }));
const CHEVRON = h('svg', { viewBox: '0 0 8 14', width: 8, height: 14, 'aria-hidden': true },
  h('path', { d: 'M1.5 1.5 6.5 7l-5 5.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }));
export function StepLine({ step }) {
  const took = step.stalled ? 'timed out' : duration(step.ms);
  return h('div', { className: `ss-step ss-tool${step.group ? ' ss-group' : ''}`, title: took },
    h('span', { className: 'ss-cc-glyph' }, DIAMOND),
    h('span', { className: 'ss-label' }, step.label),
    h('span', { className: 'ss-dur' }, took),
    h('span', { className: 'ss-chev' }, CHEVRON));
}

function ArtifactCard({ a }) {
  return h('div', { className: 'ss-artifact' },
    h('span', { className: `ss-kind ss-${a.kind}` }, a.kind === 'link' ? 'page' : a.kind === 'other' ? 'done' : 'file'),
    h('span', { className: 'ss-atitle' }, a.title));
}

// How full each turn's two blocks are: turns before the current one are full, turns after it
// empty, and the current one fills step by step with the work (and decisions) already played.
// A session with a hundred steps in one turn used to sit still until the next command.
export function timelineFill(sc, { turnIndex = 0, turnWorkMs = 0, turnAskMs = 0, done = false } = {}) {
  const frac = (n, d) => (d > 0 ? Math.min(1, Math.max(0, n / d)) : 0);
  return sc.turns.map((t, i) => {
    if (done || i < turnIndex) return { agent: 1, ask: 1 };
    if (i > turnIndex) return { agent: 0, ask: 0 };
    const work = t.steps.filter((s) => !s.ask).reduce((n, s) => n + s.ms, 0);
    const ask = t.steps.filter((s) => s.ask).reduce((n, s) => n + s.ms, 0);
    return { agent: frac(turnWorkMs, work), ask: frac(turnAskMs, ask) };
  });
}

// Who the timeline outlines: the person while they give the command, the decision while a board
// waits on them, the agent while it works, nobody once it is over. The outline used to stay on the
// person's block for the whole turn, agent's work included.
export function timelineActor({ phase, waiting = null }) {
  if (phase === 'ready' || phase === 'saying') return 'human';
  if (phase === 'working') return waiting ? 'ask' : 'agent';
  return null;
}

const fillBar = (f) => f > 0 && h('span', { className: 'ss-fill', style: { width: `${Math.round(f * 1000) / 10}%` } });

export function Timeline({ sc, turnIndex, turnWorkMs = 0, turnAskMs = 0, done = false, actor = null, person }) {
  const now = (i, who) => (!done && i === turnIndex && actor === who ? ' ss-now' : '');
  const agent = useAgent();
  const fill = timelineFill(sc, { turnIndex, turnWorkMs, turnAskMs, done });
  const rows = sc.turns.map((t) => {
    const work = t.steps.filter((s) => !s.ask).reduce((n, s) => n + s.ms, 0);
    const ask = t.steps.filter((s) => s.ask).reduce((n, s) => n + s.ms, 0);
    return { id: t.id, work, ask };
  });
  // Square-root widths: honest in order, without one overnight wait flattening the rest.
  const w = (ms) => Math.sqrt(ms / 1000);
  const total = rows.reduce((n, r) => n + w(r.work) + w(r.ask) + 2, 0) || 1;
  return h('div', { className: 'ss-timeline', 'aria-label': 'Who did what, in time' },
    h('div', { className: 'ss-track' }, rows.map((r, i) => h(Fragment, { key: r.id },
      h('span', { className: `ss-seg ss-human${now(i, 'human')}`, style: { width: `${(2 / total) * 100}%` }, title: `${person}: command ${i + 1}` }),
      r.ask > 0 && h('span', { className: `ss-seg ss-ask${now(i, 'ask')}`, style: { width: `${(w(r.ask) / total) * 100}%` }, title: `${person} deciding, ${duration(r.ask)}` }, fillBar(fill[i].ask)),
      h('span', { className: `ss-seg ss-agent${now(i, 'agent')}`, style: { width: `${(w(r.work) / total) * 100}%` }, title: `${agent} working, ${duration(r.work)}` }, fillBar(fill[i].agent))))),
    h('div', { className: 'ss-legend' },
      h('span', null, h('i', { className: 'ss-human' }), person),
      h('span', null, h('i', { className: 'ss-ask' }), 'deciding'),
      h('span', null, h('i', { className: 'ss-agent' }), `${agent} working`)));
}

function Picker({ scenarios, onPick }) {
  return h('div', { className: 'ss-picker' },
    h('h2', null, 'Step into someone’s day'),
    scenarios.map((s, i) => h('button', { key: s.id, className: 'ss-persona', onClick: () => onPick(i) },
      h('span', { className: 'ss-avatar' }, initial(s.persona?.name)),
      h('span', null, h('b', null, s.persona?.name), s.persona?.role ? ` · ${s.persona.role}` : '', h('br'), h('small', null, s.title)))));
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The one line under the title on the Start card: measured counts only.
export function startLine(sc, person, agent = DEFAULT_AGENT) {
  const t = summarize(sc);
  return `${plural(t.commands, 'command')} from ${person}, ${duration(t.agentMs)} of work by ${agent}.`;
}

// Autoplay sends the next command only once the viewer has pressed Start.
export function autoSendReady({ auto, phase, started }) {
  return Boolean(auto && started && phase === 'ready');
}

// The celebration at the close: what the session took off the person, in numbers that were
// measured. The agent's work against the person's own attention, the things made, the edge
// points the counter printed, and any chore the workflow catalog says is now off their hands.
// Never "time saved": nobody measured the version where they did it by hand.
export function CloseCard({ sc, person, onReplay, onBack }) {
  const agent = useAgent();
  const t = summarize(sc);
  const close = sc.close ?? {};
  const edge = close.edge;
  const layers = edge ? ['fueled', 'encoded', 'built', 'retired'].filter((k) => edge.layers?.[k]) : [];
  return h('div', { className: 'ss-close-wrap' },
    h('div', { className: 'ss-close', role: 'dialog', 'aria-label': 'Session closed' },
      h('div', { className: 'ss-burst', 'aria-hidden': true }, Array.from({ length: 14 }, (_, i) => h('i', { key: i, style: { '--i': i } }))),
      h('span', { className: 'ss-kicker' }, 'Session closed'),
      h('h3', null, close.outcome ?? sc.title),
      h('div', { className: 'ss-split' },
        h('div', null, h('b', null, duration(t.agentMs)), h('small', null, `of work by ${agent}`), h('small', null, plural(t.steps, 'step'))),
        h('div', null, h('b', null, plural(t.commands, 'command')), h('small', null, `from ${person === 'You' ? 'you' : person}`),
          h('small', null, t.decisions ? `${plural(t.decisions, 'decision')}, ${duration(t.decisionMs)} deciding` : 'no decisions needed'))),
      (close.freed ?? []).map((f, i) => h('p', { key: i, className: 'ss-freed' }, `You permanently freed yourself from ${f.task}: ${f.cadence}.`)),
      edge && edge.total > 0 && h('div', { className: 'ss-edge' },
        h('b', null, plural(edge.total, 'edge point')), ' earned',
        h('span', { className: 'ss-layers' }, layers.map((k) => h('span', { key: k }, `${edge.layers[k]} ${k}`)))),
      sc.artifacts?.length > 0 && h('div', { className: 'ss-close-made' },
        h('small', null, `${plural(sc.artifacts.length, 'thing')} made`),
        h('ul', null, sc.artifacts.slice(0, 6).map((a) => h('li', { key: a.id }, a.title)))),
      t.idleMs > 60000 && h('p', { className: 'ss-idle' }, `${duration(t.idleMs)} of idle time (hangs, timeouts, nobody at the keyboard) is not counted.`),
      h('div', { className: 'ss-close-actions' },
        h('button', { className: 'ss-chip', onClick: onReplay }, 'Play again'),
        onBack && h('button', { className: 'ss-chip ss-ghost', onClick: onBack }, 'Step into someone else'))));
}

// The space around the device is transparent unless a host asks for a colour (0.6.0, Gary,
// 2026-10-11: "render with NO background colour ... so it sits on any site"). 'theme' is the
// player's own cream; anything else is a CSS colour. The device frame and the screen keep theirs.
export function backgroundFor(bg) {
  if (bg == null) return undefined;
  const v = String(bg).trim();
  if (!v || v === 'transparent' || v === 'none') return undefined;
  if (v === 'theme') return 'var(--ss-cream)';
  // A colour, never a declaration: no semicolons, braces or url().
  return /^[#a-zA-Z0-9(),.%\s-]+$/.test(v) && !/url\(/i.test(v) ? v : undefined;
}

// Inside an iframe, tell the host page how tall the player is and when a session ends, so an
// embed can size itself to its content (the loader does) and offer what comes next.
export const MESSAGE = { height: 'session-player:height', done: 'session-player:done' };
export function reportToHost(el, win = typeof window === 'undefined' ? undefined : window, RO = typeof ResizeObserver === 'undefined' ? undefined : ResizeObserver) {
  if (!el || !win || !win.parent || win.parent === win || !RO) return () => {};
  let last = 0;
  const post = () => {
    const height = Math.ceil(el.getBoundingClientRect().height);
    if (height > 0 && height !== last) { last = height; win.parent.postMessage({ type: MESSAGE.height, height }, '*'); }
  };
  const ro = new RO(post);
  ro.observe(el);
  post();
  return () => ro.disconnect();
}
const tellHost = (msg) => { if (typeof window !== 'undefined' && window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); };

export function SimulatorPlayer({ scenario, scenarios, scenarioId, height, autoplay = true, artifacts = true, timeline = true, maxSteps = 5, device, viewer, start: startMode, background, theme, agent = DEFAULT_AGENT, clock, reducedMotion }) {
  const root = useRef(null);
  useEffect(() => reportToHost(root.current), []);
  const list = scenarios ?? (scenario ? [scenario] : []);
  // An embed may name one scenario from a list and skip the picker.
  const start = scenarioId != null ? Math.max(0, list.findIndex((s) => s.id === scenarioId)) : list.length > 1 ? null : 0;
  const [pick, setPick] = useState(start);
  // The device mode starts where the embedder put it and the viewer may switch it.
  const [mode, setMode] = useState(() => normalizeMode(device));
  useEffect(() => { setMode(normalizeMode(device)); }, [device]);
  // What the viewer is holding: read now (so nothing flashes), then again on resize or rotation.
  // `viewer` forces it, for tests and for hosts that already know.
  const [seen, setSeen] = useState(() => viewer ?? readViewer());
  useEffect(() => (viewer ? undefined : watchViewer(setSeen)), [viewer]);
  const sc = pick == null ? null : list[pick];
  const bg = backgroundFor(background);
  const style = height || bg ? { ...(height ? { '--ss-height': height } : {}), ...(bg ? { background: bg } : {}) } : undefined;
  return h(AgentName.Provider, { value: agent || DEFAULT_AGENT }, h('div', { className: theme === 'maison' ? 'ss-sim ss-maison' : 'ss-sim', ref: root, style },
    // The Claude app skin comes last, so it wins over the base sheet and any theme on the screen.
    h('style', null, (theme === 'maison' ? PLAYER_CSS + MAISON_CSS : PLAYER_CSS) + CLAUDE_CSS),
    sc ? h(Run, { key: sc.id, sc, autoplay, start: startMode, artifacts, timeline, maxSteps, mode, setMode, viewer: viewer ?? seen, clock: normalizeClock(clock), reducedMotion, onBack: list.length > 1 && scenarioId == null ? () => setPick(null) : null })
      : h(Picker, { scenarios: list, onPick: setPick })));
}

// The mic in the composer: a drawn glyph in the field's own colour, not an emoji, which arrives in
// whatever colour and size the viewer's platform paints it.
const MIC_GLYPH = h('svg', { viewBox: '0 0 12 18', width: 12, height: 18, 'aria-hidden': true },
  h('rect', { x: 3, y: 0.5, width: 6, height: 11, rx: 3, fill: 'currentColor' }),
  h('path', { d: 'M1 8a5 5 0 0 0 10 0M6 13v4', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }));

// The Claude app's own marks, drawn: the back chevron, the more button, the send arrow.
const BACK_GLYPH = h('svg', { className: 'ss-cc-chev', viewBox: '0 0 12 20', width: 12, height: 20, 'aria-hidden': true },
  h('path', { d: 'M10 2 2 10l8 8', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }));
const MORE_GLYPH = h('svg', { viewBox: '0 0 24 24', width: 24, height: 24, 'aria-hidden': true },
  h('circle', { cx: 12, cy: 12, r: 10.5, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }),
  [7.5, 12, 16.5].map((x) => h('circle', { key: x, cx: x, cy: 12, r: 1.5, fill: 'currentColor' })));
const SEND_GLYPH = h('svg', { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true },
  h('path', { d: 'M8 13.5V2.5M3 7.5l5-5 5 5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }));
// The machine the session's Code tab names under its title. Never the real Mac's name, which is
// private; every MacBook Pro reads as one.
const DEVICE_NAME = 'MacBook Pro';

const MODE_NAMES = { auto: 'Auto', iphone: 'iPhone', macbook: 'MacBook' };

// The small switch on the demo itself, outside the device: Auto / iPhone / MacBook.
function DeviceSwitch({ mode, setMode, hint, onToast }) {
  return h('div', { className: 'ss-devswitch', role: 'radiogroup', 'aria-label': 'Simulated device' },
    Object.entries(MODE_NAMES).map(([m, name]) => h('button', {
      key: m, role: 'radio', 'aria-checked': mode === m, type: 'button', className: 'ss-devopt', onClick: () => { setMode(m); onToast?.(m); },
    }, name, m === 'auto' && mode === 'auto' && hint ? h('small', { className: 'ss-devhint' }, ` · ${hint}`) : null)));
}

// One quiet message at a time, over the demo rather than in its flow, read out politely.
function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (text) => {
    clearTimeout(timer.current);
    setToast({ text, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3200);
  };
  return [toast, show];
}

// The viewer's own time, for a host that asks for clock: 'wall' (what the player always showed before the session clock).
function useNow(on) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { if (!on) return undefined; const id = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(id); }, [on]);
  return now;
}

function StatusBar({ now }) {
  return h('div', { className: 'ss-status', 'aria-hidden': true },
    h('span', { className: 'ss-status-time' }, statusText(now)),
    h('span', { className: 'ss-island', 'aria-hidden': true }),
    h('span', { className: 'ss-status-icons' },
      h('svg', { viewBox: '0 0 18 12', width: 18, height: 12 }, [0, 1, 2, 3].map((i) => h('rect', { key: i, x: i * 4.6, y: 9 - i * 3, width: 3.2, height: 3 + i * 3, rx: 0.8 }))),
      h('svg', { viewBox: '0 0 16 12', width: 16, height: 12 }, h('path', { d: 'M8 11.2 5.6 8.6a3.4 3.4 0 0 1 4.8 0L8 11.2Zm-4.3-4.6L2 4.8a8.5 8.5 0 0 1 12 0l-1.7 1.8a6 6 0 0 0-8.6 0Z' })),
      h('svg', { viewBox: '0 0 27 12', width: 27, height: 12 },
        h('rect', { x: 0.5, y: 0.5, width: 23, height: 11, rx: 3.2, fill: 'none', stroke: 'currentColor', opacity: 0.45 }),
        h('rect', { x: 2, y: 2, width: 17, height: 8, rx: 1.8 }),
        h('rect', { x: 24.6, y: 4, width: 1.6, height: 4, rx: 0.8, opacity: 0.45 }))));
}

function MenuBar({ now }) {
  return h('div', { className: 'ss-menubar' },
    h('span', { className: 'ss-menu-mark', 'aria-hidden': true }),
    h('b', null, 'Claude'),
    ['File', 'Edit', 'View', 'Window', 'Help'].map((m) => h('span', { key: m, className: 'ss-menu-item', 'aria-hidden': true }, m)),
    h('span', { className: 'ss-menu-right' },
      h('svg', { viewBox: '0 0 16 12', width: 15, height: 11, 'aria-hidden': true }, h('path', { d: 'M8 11.2 5.6 8.6a3.4 3.4 0 0 1 4.8 0L8 11.2Zm-4.3-4.6L2 4.8a8.5 8.5 0 0 1 12 0l-1.7 1.8a6 6 0 0 0-8.6 0Z' })),
      h('span', { className: 'ss-clock' }, menuBarText(now))));
}

function TitleBar() {
  return h('div', { className: 'ss-titlebar' },
    h('span', { className: 'ss-traffic', 'aria-hidden': true }, h('i'), h('i'), h('i')),
    h('span', { className: 'ss-wtitle' }, 'Claude Code'));
}

function Run({ sc, autoplay, start, artifacts: showArtifacts, timeline, maxSteps, onBack, mode = 'auto', setMode, viewer = 'desktop', clock = 'session', speed = 1, reducedMotion }) {
  const { frame, label } = resolveDevice({ mode, viewer, device: sc.device });
  // The hand that taps for the person on Autoplay: a finger, or a pointer on a MacBook.
  const phoneRef = useRef(null);
  const pointerKind = pointerFor(frame);
  const [pointer, pointerStep] = usePointer(phoneRef, pointerKind);
  const [reduced] = useState(() => prefersReducedMotion(reducedMotion));
  const gesture = useMemo(() => ({ step: pointerStep, speed, reduced }), [speed, reduced, pointerKind]);
  const plan = useMemo(() => script(sc, { maxSteps }), [sc, maxSteps]);
  const totals = useMemo(() => summarize(sc), [sc]);
  const person = sc.persona?.name ?? 'You';
  const agent = useAgent();
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState('ready'); // ready | saying | working | done
  useEffect(() => { if (phase === 'done') tellHost({ type: MESSAGE.done, scenario: sc.id }); }, [phase, sc.id]);
  const [log, setLog] = useState([]);
  const [made, setMade] = useState([]);
  const [work, setWork] = useState({ ms: 0, steps: 0 });
  // What of the current turn has played, for the timeline to fill as it goes.
  const [turnPlayed, setTurnPlayed] = useState({ work: 0, ask: 0 });
  const [auto, setAuto] = useState(autoplay);
  const [toast, showToast] = useToast();
  // The devices' clocks: the session's time (its start plus the work the counter shows), unless
  // the host asked for the viewer's own.
  const wall = useNow(clock === 'wall');
  const now = clock === 'wall' ? wall : sessionTime(sc, work.ms);
  // Nothing plays on load: the viewer presses Start (a host may opt in with start: 'auto').
  const [started, setStarted] = useState(start === 'auto');
  const toggleAuto = (on) => { setAuto(on); showToast(autoplayToast(on)); };
  const [tray, setTray] = useState(false);
  const timers = useRef([]);
  const logRef = useRef(null);

  const chapter = useMemo(() => {
    let c = null;
    for (const ch of sc.chapters ?? []) if (sc.turns.findIndex((t) => t.id === ch.turn) <= turn) c = ch.title;
    return c;
  }, [sc, turn]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }); }, [log]);

  const [closed, setClosed] = useState(false);
  const [waiting, setWaiting] = useState(null); // key of the board waiting on the viewer
  const [answers, setAnswers] = useState({});
  const resumeRef = useRef(null);

  // Events play one after another; a board stops the clock until the viewer picks.
  const playFrom = (ti, i, delay) => {
    const p = plan[ti];
    if (i >= p.events.length) {
      timers.current.push(setTimeout(() => {
        if (ti + 1 < plan.length) { setTurn(ti + 1); setTurnPlayed({ work: 0, ask: 0 }); setPhase('ready'); } else setPhase('done');
      }, 300));
      return;
    }
    const e = p.events[i];
    timers.current.push(setTimeout(() => {
      const key = `${ti}-${i}`;
      setLog((l) => [...l, { ...e, key }]);
      if (e.kind === 'step' && e.step.ask) resumeRef.current = (picks) => {
        setAnswers((a) => ({ ...a, [key]: picks }));
        setTurnPlayed((p) => ({ ...p, ask: p.ask + e.step.ms }));
        setWaiting(null);
        playFrom(ti, i + 1, 500);
      };
      if (e.kind === 'artifact') setMade((m) => [...m, e.artifact]);
      if (e.kind === 'step' && !e.step.ask) {
        setWork((w) => ({ ms: w.ms + e.step.ms, steps: w.steps + (e.step.count ?? 1) }));
        setTurnPlayed((p) => ({ ...p, work: p.work + e.step.ms }));
      }
      if (e.kind === 'step' && e.step.ask) { setWaiting(key); return; }
      const next = p.events[i + 1];
      playFrom(ti, i + 1, next ? next.t - e.t : 0);
    }, delay));
  };

  const [spoken, setSpoken] = useState('');
  // The mic "says" the command: words stream into the composer like dictation, then it sends.
  const say = () => {
    if (phase !== 'ready') return;
    setStarted(true);
    setPhase('saying');
    const frames = dictate(plain(plan[turn].command.text));
    frames.forEach((f, i) => timers.current.push(setTimeout(() => setSpoken(f), 120 * i)));
    timers.current.push(setTimeout(() => sendNow(), 120 * frames.length + 450));
  };

  const send = () => { if (phase === 'ready') { setStarted(true); sendNow(); } };
  const sendNow = () => {
    setLog((l) => [...l, { kind: 'command', key: `c${turn}`, command: plan[turn].command }]);
    setPhase('working');
    playFrom(turn, 0, 450);
  };

  // Autoplay sends the command the way a person would: the finger goes to send and presses it.
  useEffect(() => {
    if (!autoSendReady({ auto, phase, started })) return undefined;
    const stop = run(tap('send', { at: 1400, speed, reduced }), (s) => (s.kind === 'action' ? send() : pointerStep(s)));
    return () => { stop(); pointerStep({ kind: 'hide' }); };
  }, [auto, phase, started, turn]);

  const restart = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTurn(0); setTurnPlayed({ work: 0, ask: 0 }); setPhase('ready'); setLog([]); setMade([]); setWork({ ms: 0, steps: 0 }); setWaiting(null); setAnswers({}); setClosed(false);
  };

  const next = plan[turn]?.command;
  const artifactList = h('div', { className: 'ss-artifact-list' },
    made.length ? made.map((a) => h(ArtifactCard, { key: a.id, a })) : h('p', { className: 'ss-empty' }, `What ${agent} makes will collect here.`));

  // The screen is the Claude app's Code session (Gary, 2026-10-28: "It should look a lot more like
  // Claude Code"): on a phone the iOS app, in a MacBook window the desktop app. The player's own
  // controls (Autoplay, the work counter) sit outside the device, in the bar above it.
  const skin = frame === 'macbook' || frame === 'macbook-compact' ? 'desk' : 'phone';
  const busy = phase === 'working' || phase === 'saying';
  const phone = h('div', { className: 'ss-phone', 'data-cc': skin, ref: phoneRef },
      frame === 'iphone' && h(StatusBar, { now }),
      h('header', { className: 'ss-head' },
        skin === 'phone' && (onBack
          ? h('button', { className: 'ss-cc-back', onClick: onBack, 'aria-label': 'Choose another person' }, BACK_GLYPH, 'Code')
          : h('span', { className: 'ss-cc-back', 'aria-hidden': true }, BACK_GLYPH, 'Code')),
        skin === 'desk' && onBack && h('button', { className: 'ss-back', onClick: onBack, 'aria-label': 'Choose another person' }, '‹'),
        h('div', { className: 'ss-titles' }, h('b', null, sc.title), h('small', null, skin === 'phone' ? DEVICE_NAME : chapter ?? DEVICE_NAME)),
        // A real phone has no drawn status bar, and a window at phone width or a lidless MacBook
        // has no menu bar, so the session's time sits in the header as a small pill.
        // Inside a whole laptop the menu bar shows it and the sheet hides the pill.
        frame !== 'iphone' && h('span', { className: 'ss-timepill', title: 'Session time' }, statusText(now)),
        h('span', { className: `ss-cc-spin${busy ? ' ss-cc-spin-on' : ''}`, 'aria-hidden': true }),
        h('span', { className: 'ss-cc-more', role: 'img', 'aria-label': 'More' }, MORE_GLYPH)),
      h('div', { className: 'ss-log-wrap' },
      h('div', { className: 'ss-log', ref: logRef },
        log.length === 0 && h('p', { className: 'ss-intro' }, `You are ${person}. Send the first command and watch what gets done.`),
        log.map((item) => {
          if (item.kind === 'command') {
            return h('div', { key: item.key, className: 'ss-cmd-wrap' },
              item.command.intervention && h('span', { className: 'ss-redirect' }, `${person} stepped in`),
              item.command.images && h(Gallery, { images: item.command.images, strip: true }),
              h('div', { className: 'ss-cmd' }, plain(item.command.text)));
          }
          if (item.kind === 'step') return h(Step, { key: item.key, step: item.step, person, live: waiting === item.key, picks: answers[item.key] });
          if (item.kind === 'reply') return h(Reply, { key: item.key, text: item.reply.text });
          return h('div', { key: item.key, className: 'ss-made' }, h('span', null, 'made'), ' ', item.artifact.title);
        }),
        // Work in flight, the way the app shows it: one blue line under the conversation.
        phase === 'working' && !waiting && h('div', { className: 'ss-running', 'aria-live': 'polite' }, '1 running task')),
      showArtifacts && !waiting && h('button', { className: 'ss-tray-handle', onClick: () => setTray(!tray) }, `${made.length} made`, h('span', null, tray ? '⌄' : '⌃')),
      showArtifacts && tray && !waiting && h('div', { className: 'ss-tray' }, artifactList)),
      !started && h('div', { className: 'ss-start', role: 'dialog', 'aria-label': 'Start the demo' },
        h('div', { className: 'ss-startcard' },
          h('b', { className: 'ss-starttitle' }, sc.title),
          h('p', null, startLine(sc, person, agent)),
          h('button', { type: 'button', className: 'ss-startbtn', onClick: () => setStarted(true) }, 'Start demo'),
          h('label', { className: 'ss-startauto' }, h('input', { type: 'checkbox', checked: auto, onChange: (e) => toggleAuto(e.target.checked) }), 'Autoplay'),
          h('small', null, auto ? 'It plays itself. Untick Autoplay to play the human.' : `You play ${person}: tap to send each message and make each call.`))),
      waiting ? h(Board, { key: waiting, ask: log.find((l) => l.key === waiting).step.ask, images: log.find((l) => l.key === waiting).step.images, person, auto, onToast: auto ? undefined : showToast, onPick: (picks) => resumeRef.current?.(picks) }) :
      h('footer', { className: 'ss-composer' },
        phase === 'done'
          ? h('div', { className: 'ss-end' },
            h('p', null, h('b', null, duration(totals.agentMs)), ` of work, ${totals.steps} steps, ${totals.artifacts} things made. ${person} sent ${totals.commands} commands and made ${totals.decisions} decisions.${totals.idleMs > 60000 ? ` ${duration(totals.idleMs)} of idle time (hangs, timeouts, nobody at the keyboard) is left out.` : ''}`),
            h('button', { className: 'ss-chip', onClick: restart }, 'Play again'))
          // The app's field: the message on top, the controls under it, the mic at the left and the
          // stop square (while work runs) and the round orange send at the right. The mic stays
          // inside the field (Gary, 2026-10-19: "The microphone icon should be within the text area").
          : h('div', { className: 'ss-field' },
            h('button', { className: 'ss-chip', disabled: phase !== 'ready', onClick: send },
              // The hint names who is acting; on Autoplay it is for screen readers only, since the app's field carries no such line.
              h('small', { className: (!auto && phase === 'ready') || phase === 'saying' ? undefined : 'ss-hint-auto' }, phase === 'working' ? 'working…' : phase === 'saying' ? 'listening…' : auto ? 'sending on autoplay…' : `you are ${person}: tap to send, or tap the mic`),
              phase === 'saying' ? spoken : phase === 'ready' && next ? plain(next.text).slice(0, 140) : h('span', { className: 'ss-ph' }, 'Reply to Claude')),
            h('div', { className: 'ss-ctrls' },
              h('button', {
                className: `ss-mic${phase === 'saying' ? ' ss-live' : ''}`, disabled: phase !== 'ready', 'aria-label': 'Say it out loud', onClick: say,
              }, MIC_GLYPH),
              h('span', { className: 'ss-gap' }),
              busy && h('span', { className: 'ss-stop', 'aria-hidden': true }, h('i')),
              h('button', { className: 'ss-send', disabled: phase !== 'ready', 'aria-label': 'Send', 'data-ss-target': 'send', onClick: send }, SEND_GLYPH)))),
      frame === 'iphone' && h('span', { className: 'ss-homebar', 'aria-hidden': true }),
      h(Pointer, { kind: pointerKind, state: pointer }));
  const panel = showArtifacts && h('aside', { className: 'ss-panel' }, h('h3', null, `Made for ${person}`, h('span', null, made.length)), artifactList);
  const bar = h('div', { className: 'ss-devicebar' },
    label ? h('span', { className: frame === 'macbook-compact' ? 'ss-simpill' : 'ss-simlabel' }, label) : h('span'),
    h('span', { className: 'ss-barright' },
      h('label', { className: 'ss-auto' }, h('input', { type: 'checkbox', checked: auto, onChange: (e) => toggleAuto(e.target.checked) }), 'Autoplay'),
      setMode && h(DeviceSwitch, { mode, setMode, hint: autoHint({ viewer, device: sc.device }), onToast: (m) => showToast(deviceToast({ mode: m, viewer, device: sc.device })) })));
  // What the replay has done for the person, and whether the story is a recast: the player's own
  // lines, so they sit above the device rather than in the Claude app's screen.
  const counter = h('div', { className: 'ss-counter ss-out', 'aria-live': 'polite' },
    h('span', null, work.ms ? [h('b', { key: 'd' }, duration(work.ms)), ` of work done for ${person}`] : 'No work yet'),
    sc.source?.illustrative && h('span', { className: 'ss-illus' }, 'Illustrative: recast from a real session'),
    h('span', null, `${work.steps} of ${totals.steps} steps`));
  // The device around the conversation. On a phone nothing is drawn: the demo is the phone.
  let device = phone;
  if (frame === 'iphone') {
    device = h('div', { className: 'ss-iphone' },
      h('span', { className: 'ss-btn ss-btn-a', 'aria-hidden': true }), h('span', { className: 'ss-btn ss-btn-v1', 'aria-hidden': true }),
      h('span', { className: 'ss-btn ss-btn-v2', 'aria-hidden': true }), h('span', { className: 'ss-btn ss-btn-p', 'aria-hidden': true }),
      phone);
  } else if (frame === 'macbook-compact') {
    // Forced MacBook on a phone: a window at phone width, never a laptop shrunk to fit.
    device = h('div', { className: 'ss-window ss-term ss-window-compact' }, h(TitleBar), phone);
  } else if (frame === 'macbook') {
    device = h('div', { className: 'ss-mac' },
      h('div', { className: 'ss-mac-lid' },
        h('div', { className: 'ss-mac-screen' },
          h('span', { className: 'ss-mac-notch', 'aria-hidden': true }),
          h(MenuBar, { now }),
          h('div', { className: 'ss-window ss-term' }, h(TitleBar),
            h('div', { className: `ss-stage ss-in-window${showArtifacts ? ' ss-has-panel' : ''}` }, phone, panel)))),
      h('div', { className: 'ss-mac-base', 'aria-hidden': true }));
  }
  const inGrid = frame !== 'macbook';
  return h(Gesture.Provider, { value: gesture },
    h('div', { className: `ss-toast${toast ? ' ss-toast-on' : ''}`, role: 'status', 'aria-live': 'polite' }, toast ? h('span', { key: toast.id }, toast.text) : null),
    bar,
    counter,
    h('div', { className: `ss-stage ss-frame-${frame}${inGrid && showArtifacts ? ' ss-has-panel' : ''}` },
      device,
      inGrid && panel,
      timeline && h(Timeline, { sc, turnIndex: turn, turnWorkMs: turnPlayed.work, turnAskMs: turnPlayed.ask, done: phase === 'done', actor: timelineActor({ phase, waiting }), person }),
      phase === 'done' && !closed && h(CloseCard, { sc, person, onReplay: restart, onBack })));
}
