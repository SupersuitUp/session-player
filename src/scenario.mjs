// The scenario format: one persona, the commands they give, the work that follows, the
// artifacts it makes, every moment they stepped in, and a record of every cut. The player
// reads this and nothing else, so a scenario that validates is one the player can show.

export const FORMAT = 'supersuit-simulator/1';
export const INTERVENTIONS = [null, 'redirect', 'correct', 'approve', 'decide'];
export const VIA = ['typed', 'spoken', 'tapped'];
// `other`: something real that has no file or link, like a release submitted to a store.
export const ARTIFACT_KINDS = ['file', 'link', 'other'];
export const SOURCE_KINDS = ['session', 'persona'];
// Where the real session ran, when known. Optional: a scenario without it is shown as an iPhone.
export const SCENARIO_DEVICES = ['iphone', 'macbook'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.length > 0;
const isMs = (v) => Number.isFinite(v) && v >= 0;

export function validate(s) {
  if (!isObj(s)) return ['scenario must be an object'];
  const p = [];
  if (s.format !== FORMAT) p.push(`format must be ${FORMAT}, got ${JSON.stringify(s.format)}`);
  for (const k of ['id', 'title']) if (!isStr(s[k])) p.push(`${k} is required`);
  if (!isObj(s.persona) || !isStr(s.persona.name)) p.push('persona.name is required');
  if (!isObj(s.source) || !SOURCE_KINDS.includes(s.source.kind)) p.push(`source.kind must be one of ${SOURCE_KINDS.join(', ')}`);
  // When the session started: the devices' clocks start here. Optional, and never invented.
  if (isObj(s.source) && s.source.startedAt != null && !(isStr(s.source.startedAt) && Number.isFinite(Date.parse(s.source.startedAt)))) p.push(`source.startedAt must be a date and time, got ${JSON.stringify(s.source.startedAt)}`);
  if (s.device != null && !SCENARIO_DEVICES.includes(s.device)) p.push(`device must be one of ${SCENARIO_DEVICES.join(', ')}, got ${JSON.stringify(s.device)}`);

  const artifactIds = new Set();
  for (const a of s.artifacts ?? []) {
    if (!isStr(a.id)) { p.push('an artifact has no id'); continue; }
    if (artifactIds.has(a.id)) p.push(`duplicate artifact id ${a.id}`);
    artifactIds.add(a.id);
    if (!ARTIFACT_KINDS.includes(a.kind)) p.push(`artifact ${a.id}: kind must be one of ${ARTIFACT_KINDS.join(', ')}`);
    if (!isStr(a.title)) p.push(`artifact ${a.id}: title is required`);
  }

  const turns = Array.isArray(s.turns) ? s.turns : [];
  if (turns.length === 0) p.push('a scenario needs at least one turn');
  const turnIds = new Set();
  for (const t of turns) {
    const id = t?.id ?? '?';
    if (turnIds.has(id)) p.push(`duplicate turn id ${id}`);
    turnIds.add(id);
    if (!isMs(t.at)) p.push(`turn ${id}: at must be a non-negative number of ms`);
    if (!isObj(t.human) || !isStr(t.human.text)) p.push(`turn ${id}: human.text is required`);
    else if (!VIA.includes(t.human.via)) p.push(`turn ${id}: human.via must be one of ${VIA.join(', ')}`);
    if (!INTERVENTIONS.includes(t.intervention)) p.push(`turn ${id}: intervention must be one of ${INTERVENTIONS.map(String).join(', ')}`);
    for (const st of t.steps ?? []) {
      if (!isStr(st.label)) p.push(`turn ${id}: a step has no label`);
      if (!isMs(st.ms)) p.push(`turn ${id}: step "${st.label}" ms must be a non-negative number`);
    }
    for (const a of t.artifacts ?? []) if (!artifactIds.has(a)) p.push(`turn ${id}: unknown artifact ${a}`);
  }
  for (const c of s.chapters ?? []) if (!turnIds.has(c.turn)) p.push(`chapter "${c.title}" points at unknown turn ${c.turn}`);
  if (s.close != null) {
    // The close card says only what was measured: an edge block is the counter's output, so
    // its parts must add up to its total, and nothing in it is an estimate.
    if (!isObj(s.close)) p.push('close must be an object');
    else if (s.close.edge) {
      const L = s.close.edge.layers ?? {};
      const sum = ['fueled', 'encoded', 'built', 'retired'].reduce((n, k) => n + (Number(L[k]) || 0), 0);
      if (sum !== s.close.edge.total) p.push(`close: edge total ${s.close.edge.total} is not the sum of its four counts (${sum})`);
    }
  }
  for (const img of allImages(s)) if (!isStr(img.src) || !isStr(img.id)) p.push(`an image is missing its id or src (${JSON.stringify(img).slice(0, 80)})`);
  return p;
}

// Every image a scenario carries, wherever it sits: pasted with a command, shown on a step,
// or on one option of a board. One walker so tidy, recast, bundle and validate agree.
export function allImages(s) {
  const out = [];
  for (const t of s.turns ?? []) {
    out.push(...(t.human?.images ?? []));
    for (const st of t.steps ?? []) {
      out.push(...(st.images ?? []));
      for (const q of st.ask?.questions ?? []) for (const o of q.options ?? []) if (o.image) out.push(o.image);
    }
  }
  return out;
}
