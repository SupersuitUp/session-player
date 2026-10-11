// Gary (2026-10-11): "Even though auto is default it's not ticked", then "If you untick auto you
// have to play the human in the loop." Two controls were both called auto: the device mode and the
// playback checkbox. The checkbox is Autoplay, on by default; off, the viewer plays the person.
// The device switch always shows the active mode and, on Auto, which device Auto resolved to.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { SimulatorPlayer } from '../src/player.mjs';
import { deviceToast, autoplayToast, choiceToast } from '../src/device.mjs';
import { propsFromAttributes } from '../src/embed.mjs';
import { page } from '../src/serve.mjs';

const sc = (extra = {}) => ({
  format: 'supersuit-simulator/1', id: 'a', title: 'A day as Dana', persona: { name: 'Dana' }, source: { kind: 'session' }, chapters: [],
  turns: [{ id: 't1', at: 0, human: { text: 'go Dana', via: 'typed', choices: [] }, intervention: null, steps: [], replies: [], artifacts: [] }],
  artifacts: [], cuts: [], ...extra,
});
const markup = (props, extra) => renderToString(h(SimulatorPlayer, { scenario: sc(extra), ...props })).replace(/<style>[\s\S]*?<\/style>/, '');

test('the switch marks the active mode, and Auto says what it resolved to', () => {
  const desk = markup({ viewer: 'desktop' });
  assert.match(desk, /role="radio" aria-checked="true"[^>]*>Auto<small[^>]*> · iPhone<\/small>/);
  assert.match(markup({ viewer: 'desktop' }, { device: 'macbook' }), /aria-checked="true"[^>]*>Auto<small[^>]*> · MacBook<\/small>/);
  assert.match(markup({ viewer: 'phone' }), /aria-checked="true"[^>]*>Auto<small[^>]*> · this phone<\/small>/);
  // Forced: that option is the checked one, and Auto carries no resolved hint.
  const forced = markup({ viewer: 'desktop', device: 'macbook' });
  assert.match(forced, /role="radio" aria-checked="true"[^>]*>MacBook</);
  assert.match(forced, /role="radio" aria-checked="false"[^>]*>Auto</);
  assert.doesNotMatch(forced, /Auto<small/);
  assert.equal((desk.match(/aria-checked="true"/g) ?? []).length, 1, 'exactly one mode is checked');
});

test('the playback checkbox is Autoplay, ticked by default, and can be turned off by the embedder', () => {
  const on = markup({ viewer: 'desktop' });
  assert.match(on, /<input type="checkbox" checked=""[^>]*\/>Autoplay/);
  assert.doesNotMatch(on, />auto</);
  assert.doesNotMatch(markup({ viewer: 'desktop', autoplay: false }), /checked=""[^>]*\/>Autoplay/);
  assert.equal(propsFromAttributes({ src: '/s' }).autoplay, true);
  assert.equal(propsFromAttributes({ src: '/s', autoplay: 'off' }).autoplay, false);
  assert.equal(propsFromAttributes({ src: '/s', autoplay: '' }).autoplay, true);
  assert.match(page({ embed: true }), /autoplay: q\.get\('autoplay'\) !== 'off'/);
});

test('a toast says what a device tap changed, and why', () => {
  assert.equal(deviceToast({ mode: 'macbook', viewer: 'desktop', device: 'macbook' }), 'Now simulating a MacBook: this session ran in Claude Code on a Mac.');
  assert.equal(deviceToast({ mode: 'macbook', viewer: 'desktop' }), 'Now simulating a MacBook: this session actually ran on a phone.');
  assert.equal(deviceToast({ mode: 'macbook', viewer: 'phone' }), 'Now simulating a MacBook, in a window at phone width.');
  assert.equal(deviceToast({ mode: 'iphone', viewer: 'desktop' }), 'Now simulating an iPhone.');
  assert.equal(deviceToast({ mode: 'iphone', viewer: 'desktop', device: 'macbook' }), 'Now simulating an iPhone: this session actually ran on a Mac.');
  assert.equal(deviceToast({ mode: 'iphone', viewer: 'phone' }), "iPhone: you're on a phone, so the demo is the phone.");
  assert.equal(deviceToast({ mode: 'auto', viewer: 'desktop' }), "Auto: showing an iPhone because you're on a desktop.");
  assert.equal(deviceToast({ mode: 'auto', viewer: 'desktop', device: 'macbook' }), 'Auto: showing a MacBook because this session ran in Claude Code on a Mac.');
  assert.equal(deviceToast({ mode: 'auto', viewer: 'phone' }), "Auto: you're on a phone, so the demo is the phone.");
});

test('toasts for playback: who is playing the human, and what the real person chose', () => {
  assert.equal(autoplayToast(false), "You're the human now: tap to send each message and make each call.");
  assert.equal(autoplayToast(true), 'Autoplay: the session plays itself.');
  assert.equal(choiceToast('Dana', { same: true, real: 'Today' }), 'Same call as Dana.');
  assert.equal(choiceToast('Dana', { same: false, real: 'Today' }), 'In the real session, Dana chose Today.');
});

test('a toast region is always present, polite, and takes no room in the layout', () => {
  const html = markup({ viewer: 'desktop' });
  assert.match(html, /class="ss-toast[^"]*" role="status" aria-live="polite"/);
});
