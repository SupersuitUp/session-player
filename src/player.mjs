// The Supersuit Simulator player: a phone you step into. The viewer sends each command
// (tap it, or hold the mic to "say" it), watches the work play out, and sees what got made
// collect beside the conversation. Plain React.createElement so it needs no build step.
//
// Switches: autoplay, artifacts, timeline, maxSteps, and `scenarios` (more than one shows the
// persona picker). Mobile first; the side panel appears when the container is wide enough.

import { createElement as h, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { script, summarize, duration } from './playback.mjs';
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

function Step({ step, person }) {
  if (step.ask) {
    return h('div', { className: 'ss-decision' },
      h('span', { className: 'ss-tag' }, `${person} decided`),
      h('p', { className: 'ss-q' }, step.ask.question),
      step.ask.answer && h('p', { className: 'ss-a' }, step.ask.answer),
      h('span', { className: 'ss-dur' }, `took ${duration(step.ms)}`));
  }
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

  const send = () => {
    if (phase !== 'ready' && phase !== 'saying') return;
    const p = plan[turn];
    setLog((l) => [...l, { kind: 'command', key: `c${turn}`, command: p.command }]);
    setPhase('working');
    p.events.forEach((e, i) => {
      timers.current.push(setTimeout(() => {
        setLog((l) => [...l, { ...e, key: `${turn}-${i}` }]);
        if (e.kind === 'artifact') setMade((m) => [...m, e.artifact]);
        if (e.kind === 'step' && !e.step.ask) setWork((w) => ({ ms: w.ms + e.step.ms, steps: w.steps + (e.step.count ?? 1) }));
      }, 450 + e.t));
    });
    timers.current.push(setTimeout(() => {
      if (turn + 1 < plan.length) { setTurn(turn + 1); setPhase('ready'); } else setPhase('done');
    }, 450 + p.length + 300));
  };

  useEffect(() => {
    if (!auto || phase !== 'ready') return undefined;
    const id = setTimeout(send, 1400);
    return () => clearTimeout(id);
  });

  const restart = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTurn(0); setPhase('ready'); setLog([]); setMade([]); setWork({ ms: 0, steps: 0 });
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
        h('span', null, h('b', null, duration(work.ms)), ` of work done for ${person}`),
        h('span', null, `${work.steps} of ${totals.steps} steps`)),
      h('div', { className: 'ss-log', ref: logRef },
        log.length === 0 && h('p', { className: 'ss-intro' }, `You are ${person}. Send the first command and watch what gets done.`),
        log.map((item) => {
          if (item.kind === 'command') {
            return h('div', { key: item.key, className: 'ss-cmd-wrap' },
              item.command.intervention && h('span', { className: 'ss-redirect' }, `${person} stepped in`),
              h('div', { className: 'ss-cmd' }, plain(item.command.text)));
          }
          if (item.kind === 'step') return h(Step, { key: item.key, step: item.step, person });
          if (item.kind === 'reply') return h(Reply, { key: item.key, text: item.reply.text });
          return h('div', { key: item.key, className: 'ss-made' }, h('span', null, 'made'), ' ', item.artifact.title);
        }),
        phase === 'working' && h('div', { className: 'ss-typing' }, h('i'), h('i'), h('i'))),
      h('footer', { className: 'ss-composer' },
        phase === 'done'
          ? h('div', { className: 'ss-end' },
            h('p', null, h('b', null, duration(totals.agentMs)), ` of work, ${totals.steps} steps, ${totals.artifacts} things made. ${person} sent ${totals.commands} commands and made ${totals.decisions} decisions.`),
            h('button', { className: 'ss-chip', onClick: restart }, 'Play again'))
          : h(Fragment, null,
            h('button', { className: 'ss-chip', disabled: phase !== 'ready', onClick: send },
              h('small', null, phase === 'working' ? 'Freeda is working…' : phase === 'saying' ? 'listening…' : 'tap to send'),
              next && plain(next.text).slice(0, 140)),
            h('button', {
              className: `ss-mic${phase === 'saying' ? ' ss-live' : ''}`, disabled: phase !== 'ready' && phase !== 'saying', 'aria-label': 'Hold to say it',
              onPointerDown: () => phase === 'ready' && setPhase('saying'), onPointerUp: send, onPointerLeave: () => phase === 'saying' && setPhase('ready'),
            }, '\u{1F3A4}'))),
      showArtifacts && h('button', { className: 'ss-tray-handle', onClick: () => setTray(!tray) }, `${made.length} made`, h('span', null, tray ? '⌄' : '⌃')),
      showArtifacts && tray && h('div', { className: 'ss-tray' }, artifactList)),
    showArtifacts && h('aside', { className: 'ss-panel' }, h('h3', null, `Made for ${person}`, h('span', null, made.length)), artifactList),
    timeline && h(Timeline, { sc, turnIndex: turn, person }));
}
