// Cleans what the person typed for display, without putting words in their mouth.
//
// People type fast to an agent: "ckise" for close, "simkltaneouslf". A viewer should read
// what they meant, so a reviewer (a person, or the promote skill's agent) hands in fixes.
// The guard is what keeps this honest: a fix may correct spelling and punctuation, never
// rewrite the command, so any fix that moves too far from the original is refused. The
// original stays in `human.raw` and every change is recorded in `cuts`.

const MAX_CHANGE = 0.45;

// Screenshot and image paths in a command mean "this picture"; the path itself is noise
// and can leak a username or a temp folder.
const IMAGE_PATH = /(['"]?)(?:~|\/)[^'"\n]*?\.(?:png|jpe?g|gif|heic|webp)\1/gi;

function distance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

export function tidy(scenario, fixes = {}) {
  const sc = structuredClone(scenario);
  const { artifacts: curation, images, close, ...textFixes } = fixes;
  fixes = textFixes;
  const ids = new Set(sc.turns.map((t) => t.id));
  for (const id of Object.keys(fixes)) if (!ids.has(id)) throw new Error(`fix for unknown turn ${id}`);
  if (curation) curate(sc, curation, ids);
  if (images) attach(sc, images);
  // The close card's facts come from tools, not from the reviewer's memory: `edge` is
  // end-a-session's edge-earned output for this session, `freed` a catalog row.
  if (close) sc.close = close;
  for (const t of sc.turns) {
    const original = t.human.raw ?? t.human.text;
    let text = t.human.text.replace(IMAGE_PATH, () => {
      sc.cuts.push({ turn: t.id, what: 'human', reason: 'local path replaced' });
      return '[screenshot]';
    });
    const fix = fixes[t.id];
    if (fix != null) {
      const base = text.toLowerCase();
      const ratio = distance(base, fix.toLowerCase()) / Math.max(base.length, 1);
      // Very short commands ("ckise" -> "close") change a large share by nature; allow two edits.
      if (ratio > MAX_CHANGE && distance(base, fix.toLowerCase()) > 2) throw new Error(`fix for ${t.id} changes too much of what was said (${Math.round(ratio * 100)}%): fix spelling, do not rewrite`);
      if (fix !== text) sc.cuts.push({ turn: t.id, what: 'human', reason: 'typo fixed' });
      text = fix;
    }
    if (text !== t.human.text) { t.human.raw = original; t.human.text = text; }
  }
  return sc;
}

// The transcript cannot see everything a session made (a release submitted through a web
// form leaves no link) and sometimes names things that were not made. The reviewer decides.
function curate(sc, { drop = [], add = [] }, turnIds) {
  for (const id of drop) {
    if (!sc.artifacts.some((a) => a.id === id)) throw new Error(`cannot drop unknown artifact ${id}`);
    sc.artifacts = sc.artifacts.filter((a) => a.id !== id);
    for (const t of sc.turns) t.artifacts = t.artifacts.filter((a) => a !== id);
    sc.cuts.push({ turn: null, what: id, reason: 'artifact dropped by reviewer' });
  }
  let n = sc.artifacts.reduce((m, a) => Math.max(m, Number(a.id.replace(/\D/g, '')) || 0), 0);
  for (const a of add) {
    if (!turnIds.has(a.turn)) throw new Error(`artifact "${a.title}" names unknown turn ${a.turn}`);
    const id = `a${++n}`;
    const turn = sc.turns.find((t) => t.id === a.turn);
    sc.artifacts.push({ id, ...a, at: a.at ?? turn.at });
    turn.artifacts.push(id);
    sc.cuts.push({ turn: a.turn, what: id, reason: 'artifact added by reviewer' });
  }
}

// What the person saw is often an image the transcript only names through a loop variable
// (covers opened in Preview, a comparison sheet in a temp folder), so the reviewer points at
// it: on a step ("step": part of its label), on a board option ("question" + "option"), or on
// the command itself ("human": true). Matching is by substring, and a miss is refused.
function attach(sc, images) {
  for (const img of images) {
    const turn = sc.turns.find((t) => t.id === img.turn);
    if (!turn) throw new Error(`image ${img.id} names unknown turn ${img.turn}`);
    const entry = { id: img.id, src: img.src, ...(img.caption ? { caption: img.caption } : {}) };
    if (img.human) { (turn.human.images ??= []).push(entry); continue; }
    if (img.question) {
      const step = turn.steps.find((s) => s.ask?.questions.some((q) => q.question.includes(img.question)));
      const q = step?.ask.questions.find((qq) => qq.question.includes(img.question));
      if (!q) throw new Error(`no question matching "${img.question}" in ${img.turn}`);
      if (img.option) {
        const o = q.options.find((oo) => oo.label.includes(img.option));
        if (!o) throw new Error(`no option matching "${img.option}" in "${q.question.slice(0, 40)}"`);
        o.image = entry;
      } else (step.images ??= []).push(entry);
      continue;
    }
    const step = turn.steps.find((s) => s.label.includes(img.step ?? '\u0000'));
    if (!step) throw new Error(`no step matching "${img.step}" in ${img.turn}`);
    (step.images ??= []).push(entry);
  }
}
