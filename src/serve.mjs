// A small local server for watching scenarios in a browser: the player page, the scenarios,
// and the player's own modules. React loads from esm.sh, so the page needs no build.
// Local and tailnet viewing only; a public page serves scenarios through a gated route.

import { createServer as httpServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const SRC = fileURLToPath(new URL('.', import.meta.url));

export function page({ title = 'Supersuit Simulator', react = 'https://esm.sh/react@19', reactDom = 'https://esm.sh/react-dom@19/client?deps=react@19' } = {}) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="Step into someone's day and watch the work get done.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&display=swap" rel="stylesheet">
<script type="importmap">{"imports":{"react":"${react}","react-dom/client":"${reactDom}"}}</script>
<style>html,body{margin:0;background:#F6E7C5}body{padding:16px 12px}@media(max-width:480px){body{padding:8px 6px}}</style>
</head><body><div id="root"></div>
<script type="module">
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { SimulatorPlayer } from './src/player.mjs';
const scenarios = await (await fetch('./scenarios.json')).json();
const q = new URLSearchParams(location.search);
createRoot(document.getElementById('root')).render(h(SimulatorPlayer, {
  scenarios, autoplay: q.has('autoplay'), artifacts: q.get('artifacts') !== 'off', timeline: q.get('timeline') !== 'off',
}));
</script></body></html>`;
}

export function createServer({ scenarios, assetsRoot }) {
  const modules = new Set(readdirSync(SRC).filter((f) => f.endsWith('.mjs')));
  return httpServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    const send = (code, type, body) => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
    if (path === '/' || path === '/index.html') return send(200, 'text/html; charset=utf-8', page({ title: scenarios.length === 1 ? scenarios[0].title : undefined }));
    if (path === '/scenarios.json') return send(200, 'application/json', JSON.stringify(scenarios));
    const a = assetsRoot && path.match(/^\/assets\/([\w-]+)\/([\w.-]+\.(?:png|jpe?g|webp|gif))$/i);
    if (a) {
      const file = join(assetsRoot, 'assets', a[1], a[2]);
      const type = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }[a[2].split('.').pop().toLowerCase()];
      try { return send(200, type, readFileSync(file)); } catch { return send(404, 'text/plain', 'not found'); }
    }
    const m = path.match(/^\/src\/([\w-]+\.mjs)$/);
    if (m && modules.has(m[1])) return send(200, 'text/javascript; charset=utf-8', readFileSync(join(SRC, m[1])));
    return send(404, 'text/plain', 'not found');
  });
}
