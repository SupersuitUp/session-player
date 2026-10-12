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
  ...(sc.close ? [[sc.close, 'outcome'], ...(sc.close.handled ?? []).map((_, i) => [sc.close.handled, i]), ...(sc.close.edge ? [[sc.close.edge, 'source']] : []), ...(sc.close.freed ?? []).flatMap((f) => [[f, 'task'], [f, 'cadence'], [f, 'source']])] : []),
];

const inAsk = (s, obj) => (s.ask?.questions ?? []).some((q) => q === obj || q.options.includes(obj));
const where = (sc, obj) => sc.turns.find((t) => t.human === obj || t.steps.some((s) => s === obj || inAsk(s, obj)) || t.replies.includes(obj))?.id
  ?? sc.artifacts.find((a) => a === obj)?.id
  ?? (sc.close && (obj === sc.close || obj === sc.close.edge || (sc.close.freed ?? []).includes(obj)) ? 'the close card' : 'the title');

import { allImages } from './scenario.mjs';

export function recast(source, { id, title, persona, keep, replace = [], forbid = [], images = {}, close, highlight = {}, device }) {
  const sc = structuredClone(source);
  // Where the real session ran, when the source could not say (0.7.0): a Remote Control or SDK
  // session reads the same from a Mac and from a phone, so the person who ran it states it here.
  if (device != null) {
    if (!['iphone', 'macbook'].includes(device)) throw new Error(`device must be iphone or macbook, got ${JSON.stringify(device)}`);
    sc.device = device;
  }
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
  // Which answer a highlights cut shows for a turn, when its landing is not the last reply.
  for (const [tid, index] of Object.entries(highlight)) {
    const t = sc.turns.find((x) => x.id === tid);
    if (!t || !t.replies[index]) throw new Error(`highlight ${tid}:${index} names no reply`);
    t.highlight = index;
  }
  // Dropping turns changes what the session earned, so the spec may restate the measured close.
  if (close) sc.close = { ...(sc.close ?? {}), ...close };
  sc.title = title ?? sc.title;
  for (const [obj, key] of TEXT_FIELDS(sc)) {
    if (typeof obj[key] !== 'string') continue;
    let s = obj[key];
    for (const [from, to] of replace) s = from instanceof RegExp ? s.replace(from, to) : s.split(from).join(to);
    obj[key] = s;
  }
  // An image is the subject at its most literal, so none of the original's may travel: each
  // one is swapped for a replacement by id, or the recast refuses.
  for (const img of allImages(sc)) {
    if (!(img.id in images)) throw new Error(`image ${img.id} from the original has no replacement`);
    const to = images[img.id];
    img.src = typeof to === 'string' ? to : to.src;
    if (to.caption) img.caption = to.caption; else delete img.caption;
  }
  // Image ids came from the original (often its subject: "chains-to-gold-dust") and become
  // file names when bundled, so every image gets a neutral id; one picture keeps one id.
  const newIds = new Map();
  for (const img of allImages(sc)) {
    if (!newIds.has(img.src)) newIds.set(img.src, `${id ?? `${sc.id}-recast`}-image-${newIds.size + 1}`);
    img.id = newIds.get(img.src);
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
