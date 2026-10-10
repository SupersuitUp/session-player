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
  const ids = new Set(sc.turns.map((t) => t.id));
  for (const id of Object.keys(fixes)) if (!ids.has(id)) throw new Error(`fix for unknown turn ${id}`);
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
