// Which device the demo is drawn in. Three inputs decide it: the mode (auto, or forced by the
// embedder, the URL or the viewer's own switch), what the viewer is holding (a phone, or a
// desktop or tablet), and where the real session ran (the scenario's optional `device`).
//
// On a phone the demo IS the phone, so nothing is drawn around it. On a desktop it sits in an
// iPhone, or a MacBook when the session ran on a Mac or the MacBook is forced. A MacBook forced
// on a phone is never a laptop shrunk into a phone: it is a desktop-style window at phone
// width, with a label that stays on screen saying what is simulated.

export const MODES = ['auto', 'iphone', 'macbook'];
export const DEVICES = ['iphone', 'macbook'];
export const LABELS = { iphone: 'Simulating an iPhone', macbook: 'Simulating a MacBook' };

export function normalizeMode(v) {
  const m = String(v ?? '').trim().toLowerCase();
  return MODES.includes(m) ? m : 'auto';
}

// frame: 'none' | 'iphone' | 'macbook' | 'macbook-compact'; label: what is simulated, or null.
export function resolveDevice({ mode, viewer, device } = {}) {
  const m = normalizeMode(mode);
  const recorded = DEVICES.includes(device) ? device : 'iphone';
  if (viewer === 'phone') return m === 'macbook' ? { frame: 'macbook-compact', label: LABELS.macbook } : { frame: 'none', label: null };
  const d = m === 'auto' ? recorded : m;
  return { frame: d, label: LABELS[d] };
}

// What the viewer is holding, from capability signals rather than width alone: a phone is a
// touch device whose primary pointer is coarse (or that cannot hover) AND whose shorter side
// is phone-sized. A narrow desktop window still has a mouse; an iPad (including iPadOS, which
// reports itself as a Mac with touch points) is wide enough to be treated as a desktop, and is
// held like a phone only in a narrow split view.
export const PHONE_MAX = 700;
export function classifyViewer({ width, height, coarse = false, hoverNone = false, maxTouchPoints = 0 } = {}) {
  const touchFirst = coarse || (maxTouchPoints > 0 && hoverNone);
  if (!touchFirst || !Number.isFinite(width)) return 'desktop';
  const shorter = Number.isFinite(height) ? Math.min(width, height) : width;
  return shorter < PHONE_MAX && width < 1000 ? 'phone' : 'desktop';
}

// The browser's signals, read now. Safe to call anywhere; outside a browser it is a desktop.
export function readViewer(w = typeof window === 'undefined' ? null : window) {
  if (!w) return 'desktop';
  const mq = (q) => Boolean(w.matchMedia?.(q).matches);
  return classifyViewer({
    width: w.innerWidth, height: w.innerHeight,
    coarse: mq('(pointer: coarse)'), hoverNone: mq('(hover: none)'),
    maxTouchPoints: w.navigator?.maxTouchPoints ?? 0,
  });
}

// Calls back whenever the answer may have changed: resize, rotation, a pointer plugged in.
export function watchViewer(onChange, w = typeof window === 'undefined' ? null : window) {
  if (!w) return () => {};
  const fire = () => onChange(readViewer(w));
  const queries = ['(pointer: coarse)', '(hover: none)'].map((q) => w.matchMedia?.(q)).filter(Boolean);
  w.addEventListener('resize', fire);
  w.addEventListener('orientationchange', fire);
  for (const q of queries) q.addEventListener?.('change', fire);
  return () => {
    w.removeEventListener('resize', fire);
    w.removeEventListener('orientationchange', fire);
    for (const q of queries) q.removeEventListener?.('change', fire);
  };
}

// Where a real session ran, when its transcript can say. Typed into an interactive terminal,
// or the desktop app, on a Mac: a MacBook. Remote Control and SDK sessions could be a phone or
// a browser, so they stay unset (the player then shows an iPhone).
export function deviceFromSession(lines) {
  const human = lines.filter((o) => o?.type === 'user' && o.origin?.kind === 'human');
  if (!human.length) return undefined;
  const onMac = (o) => /^\/Users\//.test(o.cwd ?? '');
  const desk = human.filter((o) => onMac(o) && ((o.entrypoint === 'cli' && ['typed', 'queued'].includes(o.promptSource)) || o.entrypoint === 'claude-desktop'));
  return desk.length * 2 > human.length ? 'macbook' : undefined;
}
