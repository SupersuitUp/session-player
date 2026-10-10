// The Supersuit Simulator player: a phone you step into. The viewer sends each command
// (tap it, or hold the mic to "say" it), watches the work play out, and sees what got made
// collect beside the conversation. Plain React.createElement so it needs no build step.
//
// Switches: autoplay, artifacts, timeline, maxSteps, and `scenarios` (more than one shows the
// persona picker). Mobile first; the side panel appears when the container is wide enough.

import { createElement as h, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { script, summarize, duration, realPick, compare, dictate } from './playback.mjs';
import { PLAYER_CSS } from './player-css.mjs';

const plain = (s) => String(s).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/^#+\s*/gm, '');
const initial = (name = '?') => name.trim().charAt(0).toUpperCase();

function Reply({ text }) {
  const [open, setOpen] = useState(false);
  const t = plain(text);
  const long = t.length > 360;
  return h('div', { className: 'ss-reply' },
    h('span', { className: 'ss-who' }, 'Freeda'),
    h('p', null, long && !open ? `${t.slice(0, 320).trimEnd()}…` : t),
    long && h('button', { className: 'ss-more', onClick: () => setOpen(!open) }, open ? 'less' : 'more'));
}

// A decision, as the native question board: pinned to the bottom of the phone in place of
// the composer, one question at a time, a tab per question. The viewer picks; the pick is
// answered with what the person really chose, then the next question, then the replay goes
// on along the real path (a recording has one path, so no branch is ever invented).
export function Board({ ask, person, auto = false, onPick }) {
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState({});
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
  useEffect(() => {
    if (!auto || mine) return undefined;
    const id = setTimeout(() => setPicks((p) => ({ ...p, [idx]: real })), 1200);
    return () => clearTimeout(id);
  }, [auto, idx, mine]);

  const choose = (pick) => setPicks((p) => (p[idx] ? p : { ...p, [idx]: pick }));
  const same = (a, b) => a.kind === b.kind && (a.kind !== 'option' || a.index === b.index);
  const row = (key, pick, label, description) => {
    const isReal = mine && same(pick, real);
    const isMine = mine && same(pick, mine);
    const cls = `ss-opt${isReal ? ' ss-chosen' : ''}${isMine && !isReal ? ' ss-yours' : ''}`;
    return h('button', { key, className: cls, disabled: Boolean(mine), onClick: () => choose(pick) },
      h('span', { className: 'ss-onum' }, isReal ? '\u2713' : typeof key === 'number' ? key + 1 : '\u2026'),
      h('span', null, h('b', null, label), description && h('small', null, description)));
  };
  return h('div', { className: 'ss-sheet', role: 'dialog', 'aria-label': 'Freeda is asking' },
    ask.questions.length > 1 && h('div', { className: 'ss-tabs' }, ask.questions.map((qq, qi) => h('span', {
      key: qi, className: `ss-tab${qi === idx ? ' ss-tab-now' : ''}${picks[qi] ? ' ss-tab-done' : ''}`,
    }, qq.header || `Question ${qi + 1}`))),
    ask.questions.length === 1 && q.header && h('span', { className: 'ss-bhead' }, q.header),
    h('p', { className: 'ss-q' }, plain(q.question)),
    h('div', { className: 'ss-opts' },
      q.options.map((o, oi) => row(oi, { kind: 'option', index: oi }, o.label, o.description)),
      real.kind === 'other' && row('other', { kind: 'other' }, mine ? plain(q.answer) : 'Other', mine ? `typed by ${person}` : 'type your own answer'),
      real.kind === 'dismissed' && row('dismiss', { kind: 'dismissed' }, 'Type something else', 'close this and say what you want')),
    h('p', { className: `ss-verdict${verdict?.same ? ' ss-same' : ''}` },
      !verdict ? 'Your call.' : verdict.same ? `Same call as ${person}.` : `${person} ${real.kind === 'dismissed' ? '' : 'chose '}${verdict.real} in the real session, so that is where this goes.`));
}

// The record a board leaves in the conversation once it is answered: each question and what
// was chosen, compact, the way the native transcript shows an answered question.
export function Asked({ ask, person, ms, picks = {} }) {
  return h('div', { className: 'ss-asked' },
    ask.questions.map((q, qi) => {
      const real = realPick(q, ask.dismissed);
      const mine = picks[qi];
      const v = mine && compare(q, ask.dismissed, mine);
      const mineLabel = mine && (mine.kind === 'option' ? q.options[mine.index]?.label : mine.kind === 'other' ? 'Other' : 'to type something else');
      return h('div', { key: qi, className: 'ss-aq' },
        h('p', { className: 'ss-q' }, q.header && h('span', { className: 'ss-bhead' }, q.header), ' ', plain(q.question)),
        h('p', { className: 'ss-a' }, real.kind === 'dismissed' ? '\u21b3 closed it' : `\u21b3 ${plain(real.label)}`),
        v && !v.same && h('p', { className: 'ss-mine' }, `You picked ${mineLabel}`));
    }),
    h('div', { className: 'ss-bfoot' },
      h('span', { className: 'ss-tag' }, ask.dismissed ? `${person} closed this and typed instead` : `${person} chose`),
      h('span', { className: 'ss-dur' }, duration(ms))));
}

function Step({ step, person, picks, live }) {
  if (step.ask) return live ? h('div', { className: 'ss-asking' }, 'Freeda is asking you\u2026') : h(Asked, { ask: step.ask, person, ms: step.ms, picks });
  return h('div', { className: `ss-step${step.group ? ' ss-group' : ''}` },
    h('span', { className: 'ss-dot' }),
    h('span', { className: 'ss-label' }, step.label),
    h('span', { className: 'ss-dur' }, duration(step.ms)));
}

function ArtifactCard({ a }) {
  return h('div', { className: 'ss-artifact' },
    h('span', { className: `ss-kind ss-${a.kind}` }, a.kind === 'link' ? 'page' : a.kind === 'other' ? 'done' : 'file'),
    h('span', { className: 'ss-atitle' }, a.title));
}

function Timeline({ sc, turnIndex, person }) {
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
      h('span', { className: `ss-seg ss-human${i === turnIndex ? ' ss-now' : ''}`, style: { width: `${(2 / total) * 100}%` }, title: `${person}: command ${i + 1}` }),
      r.ask > 0 && h('span', { className: 'ss-seg ss-ask', style: { width: `${(w(r.ask) / total) * 100}%` }, title: `${person} deciding, ${duration(r.ask)}` }),
      h('span', { className: `ss-seg ss-agent${i < turnIndex ? ' ss-past' : ''}`, style: { width: `${(w(r.work) / total) * 100}%` }, title: `Freeda working, ${duration(r.work)}` })))),
    h('div', { className: 'ss-legend' },
      h('span', null, h('i', { className: 'ss-human' }), person),
      h('span', null, h('i', { className: 'ss-ask' }), 'deciding'),
      h('span', null, h('i', { className: 'ss-agent' }), 'Freeda working')));
}

function Picker({ scenarios, onPick }) {
  return h('div', { className: 'ss-picker' },
    h('h2', null, 'Step into someone’s day'),
    scenarios.map((s, i) => h('button', { key: s.id, className: 'ss-persona', onClick: () => onPick(i) },
      h('span', { className: 'ss-avatar' }, initial(s.persona?.name)),
      h('span', null, h('b', null, s.persona?.name), s.persona?.role ? ` · ${s.persona.role}` : '', h('br'), h('small', null, s.title)))));
}

export function SimulatorPlayer({ scenario, scenarios, autoplay = false, artifacts = true, timeline = true, maxSteps = 5 }) {
  const list = scenarios ?? (scenario ? [scenario] : []);
  const [pick, setPick] = useState(list.length > 1 ? null : 0);
  const sc = pick == null ? null : list[pick];
  return h('div', { className: 'ss-sim' },
    h('style', null, PLAYER_CSS),
    sc ? h(Run, { key: sc.id, sc, autoplay, artifacts, timeline, maxSteps, onBack: list.length > 1 ? () => setPick(null) : null })
      : h(Picker, { scenarios: list, onPick: setPick }));
}

function Run({ sc, autoplay, artifacts: showArtifacts, timeline, maxSteps, onBack }) {
  const plan = useMemo(() => script(sc, { maxSteps }), [sc, maxSteps]);
  const totals = useMemo(() => summarize(sc), [sc]);
  const person = sc.persona?.name ?? 'You';
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState('ready'); // ready | saying | working | done
  const [log, setLog] = useState([]);
  const [made, setMade] = useState([]);
  const [work, setWork] = useState({ ms: 0, steps: 0 });
  const [auto, setAuto] = useState(autoplay);
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

  const [waiting, setWaiting] = useState(null); // key of the board waiting on the viewer
  const [answers, setAnswers] = useState({});
  const resumeRef = useRef(null);

  // Events play one after another; a board stops the clock until the viewer picks.
  const playFrom = (ti, i, delay) => {
    const p = plan[ti];
    if (i >= p.events.length) {
      timers.current.push(setTimeout(() => {
        if (ti + 1 < plan.length) { setTurn(ti + 1); setPhase('ready'); } else setPhase('done');
      }, 300));
      return;
    }
    const e = p.events[i];
    timers.current.push(setTimeout(() => {
      const key = `${ti}-${i}`;
      setLog((l) => [...l, { ...e, key }]);
      if (e.kind === 'step' && e.step.ask) resumeRef.current = (picks) => {
        setAnswers((a) => ({ ...a, [key]: picks }));
        setWaiting(null);
        playFrom(ti, i + 1, 500);
      };
      if (e.kind === 'artifact') setMade((m) => [...m, e.artifact]);
      if (e.kind === 'step' && !e.step.ask) setWork((w) => ({ ms: w.ms + e.step.ms, steps: w.steps + (e.step.count ?? 1) }));
      if (e.kind === 'step' && e.step.ask) { setWaiting(key); return; }
      const next = p.events[i + 1];
      playFrom(ti, i + 1, next ? next.t - e.t : 0);
    }, delay));
  };

  const [spoken, setSpoken] = useState('');
  // The mic "says" the command: words stream into the composer like dictation, then it sends.
  const say = () => {
    if (phase !== 'ready') return;
    setPhase('saying');
    const frames = dictate(plain(plan[turn].command.text));
    frames.forEach((f, i) => timers.current.push(setTimeout(() => setSpoken(f), 120 * i)));
    timers.current.push(setTimeout(() => sendNow(), 120 * frames.length + 450));
  };

  const send = () => { if (phase === 'ready') sendNow(); };
  const sendNow = () => {
    setLog((l) => [...l, { kind: 'command', key: `c${turn}`, command: plan[turn].command }]);
    setPhase('working');
    playFrom(turn, 0, 450);
  };

  useEffect(() => {
    if (!auto || phase !== 'ready') return undefined;
    const id = setTimeout(send, 1400);
    return () => clearTimeout(id);
  });

  const restart = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTurn(0); setPhase('ready'); setLog([]); setMade([]); setWork({ ms: 0, steps: 0 }); setWaiting(null); setAnswers({});
  };

  const next = plan[turn]?.command;
  const artifactList = h('div', { className: 'ss-artifact-list' },
    made.length ? made.map((a) => h(ArtifactCard, { key: a.id, a })) : h('p', { className: 'ss-empty' }, 'What Freeda makes will collect here.'));

  return h('div', { className: `ss-stage${showArtifacts ? ' ss-has-panel' : ''}` },
    h('div', { className: 'ss-phone' },
      h('header', { className: 'ss-head' },
        onBack && h('button', { className: 'ss-back', onClick: onBack, 'aria-label': 'Choose another person' }, '‹'),
        h('span', { className: 'ss-avatar' }, initial(person)),
        h('div', { className: 'ss-titles' }, h('b', null, sc.title), h('small', null, sc.source?.illustrative ? 'Illustrative: recast from a real session' : chapter ?? `as ${person}`)),
        h('label', { className: 'ss-auto' }, h('input', { type: 'checkbox', checked: auto, onChange: (e) => setAuto(e.target.checked) }), 'auto')),
      h('div', { className: 'ss-counter', 'aria-live': 'polite' },
        h('span', null, work.ms ? [h('b', { key: 'd' }, duration(work.ms)), ` of work done for ${person}`] : 'No work yet'),
        h('span', null, `${work.steps} of ${totals.steps} steps`)),
      h('div', { className: 'ss-log', ref: logRef },
        log.length === 0 && h('p', { className: 'ss-intro' }, `You are ${person}. Send the first command and watch what gets done.`),
        log.map((item) => {
          if (item.kind === 'command') {
            return h('div', { key: item.key, className: 'ss-cmd-wrap' },
              item.command.intervention && h('span', { className: 'ss-redirect' }, `${person} stepped in`),
              h('div', { className: 'ss-cmd' }, plain(item.command.text)));
          }
          if (item.kind === 'step') return h(Step, { key: item.key, step: item.step, person, live: waiting === item.key, picks: answers[item.key] });
          if (item.kind === 'reply') return h(Reply, { key: item.key, text: item.reply.text });
          return h('div', { key: item.key, className: 'ss-made' }, h('span', null, 'made'), ' ', item.artifact.title);
        }),
        phase === 'working' && !waiting && h('div', { className: 'ss-typing' }, h('i'), h('i'), h('i'))),
      waiting ? h(Board, { key: waiting, ask: log.find((l) => l.key === waiting).step.ask, person, auto, onPick: (picks) => resumeRef.current?.(picks) }) :
      h('footer', { className: 'ss-composer' },
        phase === 'done'
          ? h('div', { className: 'ss-end' },
            h('p', null, h('b', null, duration(totals.agentMs)), ` of work, ${totals.steps} steps, ${totals.artifacts} things made. ${person} sent ${totals.commands} commands and made ${totals.decisions} decisions.`),
            h('button', { className: 'ss-chip', onClick: restart }, 'Play again'))
          : h(Fragment, null,
            h('button', { className: 'ss-chip', disabled: phase !== 'ready', onClick: send },
              h('small', null, phase === 'working' ? 'Freeda is working…' : phase === 'saying' ? 'listening…' : 'tap to send, or tap the mic to say it'),
              phase === 'saying' ? spoken : next && plain(next.text).slice(0, 140)),
            h('button', {
              className: `ss-mic${phase === 'saying' ? ' ss-live' : ''}`, disabled: phase !== 'ready', 'aria-label': 'Say it out loud', onClick: say,
            }, '\u{1F3A4}'))),
      showArtifacts && !waiting && h('button', { className: 'ss-tray-handle', onClick: () => setTray(!tray) }, `${made.length} made`, h('span', null, tray ? '⌄' : '⌃')),
      showArtifacts && tray && !waiting && h('div', { className: 'ss-tray' }, artifactList)),
    showArtifacts && h('aside', { className: 'ss-panel' }, h('h3', null, `Made for ${person}`, h('span', null, made.length)), artifactList),
    timeline && h(Timeline, { sc, turnIndex: turn, person }));
}
