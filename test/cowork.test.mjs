// Co-work: two operators' Plumas talk to each other while their people watch. The incoming
// half arrives as Monitor task notifications, the outgoing half as `cowork.mjs say` commands.
// Both must play as messages between the two Plumas, or a co-work demo shows nothing of the
// one thing it exists to show. Every name here is made up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { convert, parseSession, decodeSay } from '../src/convert.mjs';
import { recast } from '../src/recast.mjs';
import { validate } from '../src/scenario.mjs';
import { Reply } from '../src/player.mjs';
import { session } from './fixtures.mjs';

const run = (s, opts) => convert(parseSession(s.jsonl()), { home: '/Users/someone', ...opts });
const say = (text, extra = {}) => ({ type: 'say', from: 'host', text, at: '2026-09-14T05:00:30.000Z', ...extra });
const SAY_CMD = (arg) => `cd ~/.freedom/preview/freedom-dev; ~/.supersuit/bin/supersuit-lib run .agents/skills/cowork/scripts/cowork.mjs ${arg} 2>&1 | tail -1`;
const peerMsgs = (sc) => sc.turns.flatMap((t) => t.replies.filter((r) => r.peer));

test('an incoming message in three numbered parts plays as one message from the other Pluma, in order', () => {
  const s = session()
    .human('accept the co-work invite')
    .tool('Monitor', { command: 'cowork.mjs watch', description: 'co-work messages from Dana Reed' })
    .cowork([say('[1/3] For: Sam Lee\'s Pluma. Dana wants a board.')])
    .cowork([say('[2/3] It reads three sheets and')], { queued: true })
    .cowork([say('[3/3] shows a card per job &gt; 3 days old.')]);
  const sc = run(s);
  const msgs = peerMsgs(sc);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].peer.dir, 'in');
  assert.equal(msgs[0].text, "For: Sam Lee's Pluma. Dana wants a board. It reads three sheets and shows a card per job > 3 days old.");
  assert.deepEqual(validate(sc), []);
});

test('held lines that arrive together in one event are joined like any others', () => {
  const s = session()
    .human('reconnect')
    .cowork(['{"type":"ready"}', say('[1/2] For: Sam Lee\'s Pluma. Deployed.', { held: true }), say('[2/2] Both checks pass.', { held: true })]);
  const msgs = peerMsgs(run(s));
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].text, "For: Sam Lee's Pluma. Deployed. Both checks pass.");
});

test('a message whose parts did not all arrive says so, rather than reading as complete', () => {
  const s = session().human('go').cowork([say('[1/3] For: Sam Lee\'s Pluma. Start.')]).cowork([say('[3/3] End.')]);
  const msgs = peerMsgs(run(s));
  assert.equal(msgs.length, 1);
  assert.match(msgs[0].text, /Start\.[\s\S]*part 2 of 3 did not arrive[\s\S]*End\./);
});

test("an outgoing T='...' say is decoded from its shell quoting into a message to the other Pluma", () => {
  const cmd = `cd ~/x; T='For: Dana Reed'"'"'s Pluma. From Sam'"'"'s Pluma. Two things.\n\n1) It'"'"'s on main.'; ` + SAY_CMD('say "$T"').replace('cd ~/.freedom/preview/freedom-dev; ', '');
  const s = session().human('tell her pluma').tool('Bash', { command: cmd, description: "Tell Dana's Pluma it landed" }, { result: '{"delivered":true,"parts":1}' });
  const sc = run(s);
  const msgs = peerMsgs(sc);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].peer.dir, 'out');
  assert.equal(msgs[0].text, "For: Dana Reed's Pluma. From Sam's Pluma. Two things.\n\n1) It's on main.");
  // The other Pluma is named from the address the message itself carries.
  assert.equal(msgs[0].peer.name, "Dana Reed's Pluma");
  // The send is the message, not also a one-line step.
  assert.equal(sc.turns[0].steps.length, 0);
});

test('a say with a direct quoted argument, or a file written earlier, decodes too', () => {
  assert.equal(decodeSay(`cowork.mjs say "For: Dana Reed's Pluma. Plain \\"quoted\\" text."`), `For: Dana Reed's Pluma. Plain "quoted" text.`);
  assert.equal(decodeSay(`cowork.mjs say 'single quoted'`), 'single quoted');
  const files = new Map([['/tmp/reply.txt', 'From a file.\n']]);
  assert.equal(decodeSay('cowork.mjs say "$(cat /tmp/reply.txt)"', files), 'From a file.');
  // printf and a heredoc into a file are how sessions stage a long reply.
  const f2 = new Map();
  decodeSay(`B='Staged'"'"'s text.'; printf '%s' "$B" > /tmp/a.txt; s2s.mjs send x "$B" --dry-run`, f2);
  assert.equal(f2.get('/tmp/a.txt'), "Staged's text.");
  decodeSay(`S=/tmp/b.txt; cat > $S <<'EOF'\nLine one.\nLine two.\nEOF\necho ok`, f2);
  assert.equal(decodeSay('cowork.mjs say "$(cat /tmp/b.txt)"', f2), 'Line one.\nLine two.');
  assert.equal(decodeSay('cowork.mjs status'), null);
  assert.equal(decodeSay('cowork.mjs say "$(cat /tmp/never-written.txt)"'), null);
});

test('ready, peer-away, peer-left and a Monitor expiry are not messages, and the watch is a named step', () => {
  const s = session()
    .human('watch')
    .tool('Monitor', { command: 'cowork.mjs watch', description: 'co-work messages from Dana Reed' })
    .cowork(['{"type":"ready"}'])
    .cowork(['{"type":"peer-away"}'])
    .cowork(['{"type":"peer-left"}'])
    .cowork(['[Monitor expired after 30m with 4 events delivered. Re-arm it if you still need the watch.]'])
    .say('Still here.');
  const sc = run(s);
  assert.equal(peerMsgs(sc).length, 0);
  assert.deepEqual(sc.turns[0].replies.map((r) => r.text), ['Still here.']);
  assert.deepEqual(sc.turns[0].steps.map((st) => st.label), ['watched co-work messages from Dana Reed']);
});

test('a real name inside an incoming say is caught by the forbid list, and replaced by a recast swap', () => {
  const s = session().human('go').cowork([say('For: Sam Lee\'s Pluma. Dana Reed approved it for Quillfield Roofing.')]);
  const sc = run(s);
  const spec = { id: 'x', persona: { name: 'Sam' }, forbid: ['Quillfield', 're:\\bDana\\b'], replace: [] };
  assert.throws(() => recast(sc, spec), /forbidden "Quillfield" survives in t1/);
  const ok = recast(sc, { ...spec, replace: [['Quillfield Roofing', 'his company'], [/\bDana Reed\b/g, 'Wade']] });
  assert.equal(peerMsgs(ok)[0].text, "For: Sam Lee's Pluma. Wade approved it for his company.");
});

test("the other Pluma's name is recast too, so the bubble carries the persona name", () => {
  const s = session().human('go')
    .tool('Bash', { command: SAY_CMD(`say 'For: Dana Reed'"'"'s Pluma. Hi.'`) })
    .cowork([say('For: Sam Lee\'s Pluma. Hello back.')]);
  const sc = run(s);
  assert.deepEqual(peerMsgs(sc).map((m) => m.peer.name), ["Dana Reed's Pluma", "Dana Reed's Pluma"]);
  const out = recast(sc, { id: 'x', persona: { name: 'Sam' }, replace: [[/\bDana Reed\b/g, 'Wade']], forbid: ['Dana'] });
  assert.deepEqual(peerMsgs(out).map((m) => m.peer.name), ["Wade's Pluma", "Wade's Pluma"]);
});

test('the player draws a message from the other Pluma, and one to it, as their own speakers', () => {
  const inHtml = renderToString(h(Reply, { text: 'Hello back.', peer: { name: "Wade's Pluma", dir: 'in' }, person: 'Gary' }));
  assert.match(inHtml, /ss-peer-in/);
  assert.match(inHtml, /Wade&#x27;s Pluma/);
  const outHtml = renderToString(h(Reply, { text: 'Hi.', peer: { name: "Wade's Pluma", dir: 'out' }, person: 'Gary' }));
  assert.match(outHtml, /ss-peer-out/);
  assert.match(outHtml, /Gary&#x27;s Pluma/);
  assert.match(outHtml, /to Wade&#x27;s Pluma/);
  // An ordinary reply is unchanged.
  assert.doesNotMatch(renderToString(h(Reply, { text: 'Done.' })), /ss-peer/);
});
