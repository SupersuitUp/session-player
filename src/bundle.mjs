// Makes a scenario self-contained: every image is copied into `<dir>/assets/<scenario id>/`,
// shrunk for the phone, and the scenario points at it by a relative path. Pasted images
// arrive as data URIs and are written out the same way. A source that is missing is refused,
// so a scenario never ships with a hole where a cover should be.

import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname } from 'node:path';
import { allImages } from './scenario.mjs';

const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };

export function bundle(scenario, { dir, resize = true, max = 900 } = {}) {
  const sc = structuredClone(scenario);
  const rel = join('assets', sc.id);
  mkdirSync(join(dir, rel), { recursive: true });
  const done = new Map();
  for (const img of allImages(sc)) {
    if (img.src.startsWith('assets/')) continue;
    if (done.has(img.src)) { img.src = done.get(img.src); continue; }
    let name;
    if (img.src.startsWith('data:')) {
      const [, type, data] = img.src.match(/^data:([^;]+);base64,(.*)$/s) ?? [];
      if (!data) throw new Error(`image ${img.id} has an unreadable data URI`);
      name = `${img.id}${EXT[type] ?? '.png'}`;
      writeFileSync(join(dir, rel, name), Buffer.from(data, 'base64'));
    } else {
      if (!existsSync(img.src)) throw new Error(`image ${img.id}: ${img.src} does not exist`);
      if (resize && process.platform === 'darwin') {
        name = `${img.id}.jpg`;
        execFileSync('sips', ['-Z', String(max), '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', img.src, '--out', join(dir, rel, name)], { stdio: 'ignore' });
      } else {
        name = `${img.id}${extname(img.src) || '.png'}`;
        copyFileSync(img.src, join(dir, rel, name));
      }
    }
    const out = `${rel}/${name}`.split('\\').join('/');
    done.set(img.src, out);
    img.src = out;
  }
  return sc;
}
