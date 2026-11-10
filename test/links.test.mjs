import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { linkParts, linkText, openableUrl, clipParts } from '../src/links.mjs';
import { Reply, SimulatorPlayer } from '../src/player.mjs';
import { validate } from '../src/scenario.mjs';

const WIKI = 'https://wiki.supersuit.co/concepts/helm';

test('a named link renders as a tappable link with its text, opening in a new tab', () => {
  const html = renderToString(h(Reply, { text: 'It is on [the release notes](https://example.org.uk/notes) now.' }));
  assert.match(html, /<a [^>]*href="https:\/\/example\.org\.uk\/notes"[^>]*>the release notes<\/a>/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /\]\(/, 'no raw markdown is left');
});

test('an info mark renders as a small tappable mark right after its word', () => {
  const html = renderToString(h(Reply, { text: `June's Helm [ⓘ](${WIKI}) fix is on main.` }));
  assert.match(html, /Helm\s*<a [^>]*class="ss-info"[^>]*href="https:\/\/wiki\.supersuit\.co\/concepts\/helm"[^>]*>ⓘ<\/a>/);
  assert.match(html, /aria-label="What is Helm\?"/);
  assert.doesNotMatch(html, /\[ⓘ\]/);
});

test('an unsafe link is never a link: javascript:, data:, and anything not http(s)', () => {
  for (const url of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'vbscript:x']) {
    assert.equal(openableUrl(url), null, url);
    const html = renderToString(h(Reply, { text: `see [this](${url}) now` }));
    assert.doesNotMatch(html, /<a /, url);
    assert.match(html, /see this now/, url);
  }
});

test('a private or tailnet address renders as plain text, never a dead link', () => {
  const urls = [
    'http://127.0.0.1:8460/review', 'http://localhost:3000/x', 'https://garys-macbook-pro-2.taila359c0.ts.net:8460/preview/x',
    'https://garysheng.helm.supersuit.co/reviews', 'http://192.168.1.4/', 'http://10.0.0.2/', 'http://172.20.1.1/', 'http://100.101.1.1/',
    'http://[::1]:3000/', 'https://pages.kestrel.example/owen-setup', 'https://box.local/x', 'https://user:pw@wiki.supersuit.co/',
  ];
  for (const url of urls) {
    assert.equal(openableUrl(url), null, url);
    const html = renderToString(h(Reply, { text: `It is on [the review page](${url}).` }));
    assert.doesNotMatch(html, /<a /, url);
    assert.match(html, /It is on the review page\./, url);
  }
});

test('an info mark to an address nobody can open is dropped with its space', () => {
  assert.deepEqual(linkParts('the Helm [ⓘ](http://127.0.0.1/x) fix'), [{ text: 'the Helm fix' }]);
});

test('a scenario can name link prefixes its viewers cannot open, such as a private repo', () => {
  const opts = { privateLinks: ['https://github.com/Acme/'] };
  assert.equal(openableUrl('https://github.com/Acme/secret/issues/2', opts), null);
  assert.equal(openableUrl('https://github.com/Other/public', opts), 'https://github.com/Other/public');
  const s = {
    format: 'supersuit-simulator/1', id: 'a', title: 'A', persona: { name: 'Gary' }, source: { kind: 'session' }, chapters: [],
    privateLinks: ['https://github.com/Acme/'],
    turns: [{ id: 't1', at: 0, human: { text: 'go', via: 'typed' }, intervention: null, steps: [], replies: [], artifacts: [] }], artifacts: [],
  };
  assert.deepEqual(validate(s), []);
  assert.match(validate({ ...s, privateLinks: ['javascript:'] }).join(), /privateLinks/);
});

test('the player passes the scenario privateLinks to every reply', () => {
  const sc = {
    format: 'supersuit-simulator/1', id: 'a', title: 'A', persona: { name: 'Gary' }, source: { kind: 'session' }, chapters: [],
    privateLinks: ['https://github.com/Acme/'],
    turns: [{ id: 't1', at: 0, human: { text: 'Filed as [Acme #2](https://github.com/Acme/secret/issues/2), see [docs](https://docs.acme.co/)', via: 'typed' }, intervention: null, steps: [], replies: [], artifacts: [] }],
    artifacts: [], cuts: [],
  };
  const html = renderToString(h(SimulatorPlayer, { scenario: sc, autoplay: false }));
  assert.doesNotMatch(html, /\]\(https/, 'the composer preview shows link text, not markdown');
  assert.match(html, /Filed as Acme #2, see docs/);
});

test('linkText reads a reply aloud: link text kept, info marks gone', () => {
  assert.equal(linkText(`the Helm [ⓘ](${WIKI}) is on [the page](https://a.co/x).`), 'the Helm is on the page.');
});

test('a long reply folds without cutting a link in half', () => {
  const parts = linkParts(`${'a'.repeat(10)} [the page](https://a.co/x) ${'b'.repeat(50)}`);
  const clipped = clipParts(parts, 25);
  assert.equal(clipped[1].href, 'https://a.co/x');
  assert.match(clipped[clipped.length - 1].text, /…$/);
  const html = renderToString(h(Reply, { text: `[the page](https://a.co/x) ${'word '.repeat(100)}` }));
  assert.match(html, /<a [^>]*>the page<\/a>/);
  assert.match(html, /…/);
});
