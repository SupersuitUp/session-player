// The links in a recorded reply. Pluma writes markdown links: a named one, `[the review page](url)`,
// and the info mark, `[ⓘ](url)`, right after a defined word. The player used to print both as raw
// markdown (Gary, 2026-11-10: "not rendering hyperlinks well, including the eye icons").
//
// `linkParts` splits a text into plain runs and links. A link the viewer can open becomes a link;
// one they cannot (this Mac, a tailnet, a private network, an operator's own Helm, a reserved
// example domain, or a prefix the scenario lists in `privateLinks`) becomes its text alone, so
// the replay never shows a dead link. Only http and https are ever links: never javascript:.

export const INFO_MARK = 'ⓘ';

const MD_LINK = /\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;

// Hosts a viewer of a published case study can never open.
const PRIVATE_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home.arpa', '.ts.net', '.example', '.test', '.invalid', '.helm.supersuit.co'];
const PRIVATE_EXACT = ['localhost', 'helm.supersuit.co', 'example.com', 'example.net', 'example.org'];

function privateHost(host) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (PRIVATE_EXACT.includes(h) || PRIVATE_SUFFIXES.some((s) => h.endsWith(s))) return true;
  if (h === '::1' || h === '::' || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe80:/.test(h)) return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  return false;
}

// The URL a viewer can open, normalised, or null.
export function openableUrl(raw, { privateLinks = [] } = {}) {
  let u;
  try { u = new URL(String(raw)); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password || privateHost(u.hostname)) return null;
  const href = u.href;
  if (privateLinks.some((p) => typeof p === 'string' && p && href.startsWith(p))) return null;
  return href;
}

// [{ text }] for plain runs, [{ text, href, info }] for links that open.
export function linkParts(text, opts = {}) {
  const s = String(text ?? '');
  const out = [];
  let last = 0;
  const push = (t) => {
    if (!t) return;
    const prev = out[out.length - 1];
    if (prev && !prev.href) prev.text += t; else out.push({ text: t });
  };
  for (const m of s.matchAll(MD_LINK)) {
    push(s.slice(last, m.index));
    last = m.index + m[0].length;
    const label = m[1];
    const info = label.trim() === INFO_MARK;
    const href = openableUrl(m[2], opts);
    // An info mark that cannot open says nothing on its own, so it is dropped with the space before it.
    if (!href) { if (info) { const prev = out[out.length - 1]; if (prev && !prev.href) prev.text = prev.text.replace(/\s+$/, ''); } else push(label); continue; }
    out.push({ text: label, href, info });
  }
  push(s.slice(last));
  return out;
}

// The text as it reads aloud or in a one-line preview: each link its text, an info mark gone.
export function linkText(text) {
  return String(text ?? '').replace(/\s*\[\s*ⓘ\s*\]\((?:[^()\s]|\([^()\s]*\))+\)/g, '').replace(MD_LINK, '$1');
}

// The first `max` visible characters of the parts, for a long reply shown folded.
export function clipParts(parts, max) {
  const out = [];
  let left = max;
  for (const p of parts) {
    if (left <= 0) { out.push({ text: '…' }); break; }
    if (p.href) { out.push(p); left -= p.info ? 0 : p.text.length; continue; }
    if (p.text.length <= left) { out.push(p); left -= p.text.length; continue; }
    out.push({ text: `${p.text.slice(0, left).trimEnd()}…` });
    break;
  }
  return out;
}
