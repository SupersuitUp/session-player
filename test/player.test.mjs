import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { SimulatorPlayer } from '../src/player.mjs';

const sc = (id, name) => ({
  format: 'supersuit-simulator/1', id, title: `A day as ${name}`, persona: { name, role: 'founder' },
  source: { kind: 'session' }, chapters: [],
  turns: [{ id: 't1', at: 0, human: { text: 'Ship the album', via: 'typed', choices: [] }, intervention: null, steps: [{ label: 'download', tool: 'Bash', ms: 431000, count: 1, at: 431000 }], replies: [], artifacts: [] }],
  artifacts: [], cuts: [],
});

test('one scenario opens straight on the phone with the first command ready to send', () => {
  const html = renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Gary') }));
  assert.match(html, /tap to send/);
  assert.match(html, /Ship the album/);
  assert.match(html, /of work done for/);
  assert.match(html, /Made for/);
  assert.match(html, /ss-timeline/);
});

test('several scenarios open on the persona picker', () => {
  const html = renderToString(h(SimulatorPlayer, { scenarios: [sc('a', 'Dana'), sc('b', 'Marcus')] }));
  assert.match(html, /Step into someone/);
  assert.match(html, /Dana/);
  assert.match(html, /Marcus/);
  assert.doesNotMatch(html, /tap to send/);
});

test('the artifacts panel and the timeline can be switched off for a limited embed', () => {
  const html = renderToString(h(SimulatorPlayer, { scenario: sc('a', 'Gary'), artifacts: false, timeline: false }));
  assert.doesNotMatch(html, /Made for|class="ss-tray-handle"|class="ss-panel"/);
  assert.doesNotMatch(html, /class="ss-timeline"/);
});
