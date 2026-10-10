// Recasts a real run as a persona scenario: a different person and a different subject,
// with the same commands, the same steps, the same timing and the same decisions. This is
// how a scenario can show a story a viewer recognizes (an ambient album rather than one
// specific artist's) while every beat of the work is something that actually happened.
//
// Honesty is enforced, not hoped for: the scenario is marked illustrative and says which
// run it came from, the original wording is dropped rather than carried, turns off the
// story are cut on the record, and a `forbid` list of words from the original must not
// survive anywhere, or the recast refuses to finish.

const TEXT_FIELDS = (sc) => [
  [sc, 'title'],
  ...sc.chapters.map((c) => [c, 'title']),
  ...sc.turns.flatMap((t) => [
    [t.human, 'text'],
    ...t.steps.flatMap((s) => [[s, 'label'], ...(s.ask?.questions ?? []).flatMap((q) => [[q, 'header'], [q, 'question'], [q, 'answer'], ...q.options.flatMap((o) => [[o, 'label'], [o, 'description']])])]),
    ...t.replies.map((r) => [r, 'text']),
  ]),
  ...sc.artifacts.flatMap((a) => [[a, 'title'], [a, 'url'], [a, 'path']]),
];

const inAsk = (s, obj) => (s.ask?.questions ?? []).some((q) => q === obj || q.options.includes(obj));
const where = (sc, obj) => sc.turns.find((t) => t.human === obj || t.steps.some((s) => s === obj || inAsk(s, obj)) || t.replies.includes(obj))?.id
  ?? sc.artifacts.find((a) => a === obj)?.id ?? 'the title';

export function recast(source, { id, title, persona, keep, replace = [], forbid = [] }) {
  const sc = structuredClone(source);
  const cuts = [];
  if (keep) {
    const kept = new Set(keep);
    for (const t of sc.turns) if (!kept.has(t.id)) cuts.push({ turn: t.id, what: 'turn', reason: 'turn dropped in recast' });
    sc.turns = sc.turns.filter((t) => kept.has(t.id));
    const live = new Set(sc.turns.flatMap((t) => t.artifacts));
    sc.artifacts = sc.artifacts.filter((a) => live.has(a.id));
    sc.chapters = sc.chapters.filter((c) => kept.has(c.turn));
  }
  for (const t of sc.turns) delete t.human.raw;
  sc.title = title ?? sc.title;
  for (const [obj, key] of TEXT_FIELDS(sc)) {
    if (typeof obj[key] !== 'string') continue;
    let s = obj[key];
    for (const [from, to] of replace) s = from instanceof RegExp ? s.replace(from, to) : s.split(from).join(to);
    obj[key] = s;
  }
  for (const word of forbid) {
    // Anchored at a word start: "Eden" must not fire on "credentials", while "Christ" still
    // catches "Christofuturist".
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu');
    for (const [obj, key] of TEXT_FIELDS(sc)) {
      if (typeof obj[key] === 'string' && re.test(obj[key])) throw new Error(`forbidden "${word}" survives in ${where(sc, obj)}: "${obj[key].slice(0, 120)}"`);
    }
  }
  return {
    ...sc,
    id: id ?? `${sc.id}-recast`,
    persona: { name: 'the operator', role: '', blurb: '', ...persona },
    source: { ...sc.source, kind: 'persona', illustrative: true, recastFrom: source.id },
    cuts: [...cuts, { turn: null, what: 'scenario', reason: 'recast from a real run: subject and people changed, work and timing kept' }],
  };
}
