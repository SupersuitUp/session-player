// The hand in the replay. When the player answers for the person (Autoplay sending a command,
// picking on a board), a finger travels to the control, presses it, and only then does the
// choice land; on a MacBook it is a pointer with a click. A typed answer on a board ("Other")
// is shown the way it happened: the Other row tapped, the field opening, the words typed out,
// then sent. Gary, 2026-10-28: "make it much more clear that there's like a finger pressing
// buttons. And then when it's a none of the above choice, it should show like a simulation of
// someone typing out the none of the above choice."
//
// Everything here is pure: a gesture is a list of timed steps the player runs, so the order and
// the text are testable without a browser. Times are milliseconds from the start of the gesture,
// already divided by the speed.

import { realPick } from './playback.mjs';

export const POINTERS = ['finger', 'cursor'];

// Base timings at 1x.
export const TAP = { travel: 520, press: 170, settle: 140, reducedHold: 260 };
// Typing: the first line at a human pace, the rest fast, so a 300-word answer stays under ~4 s.
export const TYPE = { firstLine: 48, perChar: 50, restMax: 1300, frame: 33, open: 380, beforeSend: 320 };

export function normalizeSpeed(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(4, Math.max(0.25, n)) : 1;
}

// The pointer for a frame: a cursor on a MacBook (whole or as a window), a finger everywhere else.
export const pointerFor = (frame) => (String(frame ?? '').startsWith('macbook') ? 'cursor' : 'finger');

// Whether the viewer asked for less motion. `override` wins (tests, hosts that already know).
export function prefersReducedMotion(override, win = typeof window === 'undefined' ? undefined : window) {
  if (typeof override === 'boolean') return override;
  try { return Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

// One tap on `target`, landing at `at` (the moment the choice takes effect). Travel, press,
// release, then the action. With reduced motion: no travel, the press shows in place.
export function tap(target, { at = 0, speed = 1, reduced = false, action = 'tap' } = {}) {
  const k = 1 / normalizeSpeed(speed);
  if (reduced) {
    const hold = Math.round(TAP.reducedHold * k);
    const start = Math.max(0, at - hold);
    return [
      { kind: 'press', target, at: start, ms: 0 },
      { kind: 'release', target, at: start + hold },
      { kind: 'action', target, action, at: start + hold },
    ];
  }
  const travel = Math.round(TAP.travel * k);
  const press = Math.round(TAP.press * k);
  const settle = Math.round(TAP.settle * k);
  const start = Math.max(0, at - travel - press);
  return [
    { kind: 'travel', target, at: start, ms: travel },
    { kind: 'press', target, at: start + travel, ms: press },
    { kind: 'release', target, at: start + travel + press },
    { kind: 'action', target, action, at: start + travel + press },
    { kind: 'lift', target, at: start + travel + press + settle },
  ];
}

// The frames of typing `text`: [{ at, text }], `at` from the first keystroke. The first line
// types one character at a time; what follows arrives in quick frames, capped so the whole
// answer never takes more than ~4 s at 1x. Reduced motion: the whole text at once.
export function typeFrames(text, { speed = 1, reduced = false } = {}) {
  const s = String(text ?? '');
  if (!s) return [{ at: 0, text: '' }];
  if (reduced) return [{ at: 0, text: s }];
  const k = 1 / normalizeSpeed(speed);
  const nl = s.indexOf('\n');
  const head = Math.min(s.length, TYPE.firstLine, nl >= 0 ? nl + 1 : Infinity);
  const frames = [];
  let t = 0;
  for (let n = 1; n <= head; n += 1) { frames.push({ at: Math.round(t * k), text: s.slice(0, n) }); t += TYPE.perChar; }
  const rest = s.length - head;
  if (rest > 0) {
    const span = Math.min(TYPE.restMax, rest * 12);
    const count = Math.max(1, Math.floor(span / TYPE.frame));
    for (let f = 1; f <= count; f += 1) {
      const n = f === count ? s.length : head + Math.ceil((rest * f) / count);
      t += TYPE.frame;
      frames.push({ at: Math.round(t * k), text: s.slice(0, n) });
    }
  }
  return frames;
}

// How the player answers one board question for the person: the real pick, as gestures. A typed
// answer becomes: tap Other, open the field, type the exact text, tap send, then the pick lands.
// `lead` is when the first tap lands. Targets name `data-ss-target` values on the board.
export function answerScript(q, dismissed, { speed = 1, reduced = false, lead = 1200, finger = true } = {}) {
  const real = realPick(q, dismissed);
  const tapAt = (target, at, action) => (finger ? tap(target, { at, speed, reduced, action }) : [{ kind: 'action', target, action, at }]);
  if (real.kind === 'option') return tapAt(`opt-${real.index}`, lead, 'pick');
  if (real.kind === 'dismissed') return tapAt('dismiss', lead, 'pick');
  const k = 1 / normalizeSpeed(speed);
  const steps = [...tapAt('opt-other', lead, 'open')];
  const opened = steps.find((s) => s.kind === 'action').at;
  steps.push({ kind: 'open', target: 'opt-other', at: opened });
  const typeStart = opened + Math.round(TYPE.open * k);
  const frames = typeFrames(real.label, { speed, reduced });
  for (const f of frames) steps.push({ kind: 'type', target: 'other-field', at: typeStart + f.at, text: f.text });
  const typed = typeStart + frames[frames.length - 1].at;
  steps.push(...tapAt('other-send', typed + Math.round(TYPE.beforeSend * k) + (finger && !reduced ? Math.round((TAP.travel + TAP.press) * k) : 0), 'pick'));
  return steps.sort((a, b) => a.at - b.at);
}

// Run a script on timers: `on(step)` for each step at its time. Returns a cancel function.
export function run(steps, on, { setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const ids = steps.map((s) => setTimer(() => on(s), s.at));
  return () => ids.forEach((id) => clearTimer(id));
}
