# @supersuit/simulator

The Supersuit Simulator: step into the shoes of someone who needs a great deal of work done, give their commands on a simulated phone, and watch the work and the things it makes appear. Every scenario is built from a real agent session, with the person's corrections left in.

This package holds the **scenario format**, the **converter** that drafts a scenario from a Claude Code session transcript, and the **player**, a React component that plays scenarios on a simulated phone.

## Install

```
npm install -g @supersuit/simulator
```

## Use

```
simulator convert ~/.claude/projects/<dir>/<session-id>.jsonl --title "Releasing an album" --persona Gary --out album.json
simulator tidy album.json --fixes fixes.json --out album.json   # {"t7": "corrected text"}
simulator recast album.json --spec ambient.json --out ambient.json   # same run, different story
simulator bundle album.json                                    # images into assets/<id>/
simulator validate album.json
simulator serve album.json            # watch it at http://127.0.0.1:4460/
```

`convert` keeps only what the person actually typed as turns (tool results, skill bodies, task notifications, messages from other sessions and interrupt markers are not turns), marks a turn that followed an interrupt as the person redirecting, condenses the agent's tool work into named steps timed by the wall clock, and collects what it delivered: pages it published and the documents, images and audio it made or pointed at (never code or folders, which already show as steps).

**A draft is not ready to publish.** The converter removes credential-shaped strings, phone numbers, email addresses and home-directory paths and records every edit in `cuts`, but it does not anonymize people. Do that, and review the draft, before anyone else sees it.

## The format

`supersuit-simulator/1`, one JSON object:

| Field | What it holds |
|---|---|
| `persona` | `{ name, role, blurb }` |
| `source` | `{ kind: session \| persona, sessionId, date, illustrative }` |
| `chapters[]` | `{ title, turn }`, from the session's name changes |
| `turns[]` | `{ id, at, human { text, via, choices[] }, intervention, steps[] { label, tool, ms, count }, replies[] { text, at }, artifacts[] }` |
| `artifacts[]` | `{ id, kind: file \| link \| other, title, path \| url, turn, at }` |
| `cuts[]` | `{ turn, what, reason }`: every edit, so nothing is changed silently |

`intervention` is one of `null`, `redirect`, `correct`, `approve`, `decide`. The converter sets only `redirect`; the rest are set by the person reviewing the draft.

## The player

```js
import { SimulatorPlayer } from '@supersuit/simulator/player';
<SimulatorPlayer scenario={album} />                       // one scenario
<SimulatorPlayer scenarios={[dana, marcus]} />             // persona picker first
<SimulatorPlayer scenario={album} artifacts={false} timeline={false} />  // a limited embed
```

The viewer taps each command (or holds the mic to say it) and watches the steps play, sped up from their real durations, with a running count of the work done for the persona. Decisions the person made show as their own cards; things made collect in a side panel on wide screens and a slide-up tray on phones. Needs React 18 or newer; no build step and no stylesheet to import.

## Embedding it in a page or a book

Any page, including a book reader, can drop in an iframe:

```html
<iframe src="https://<host>/embed?scenario=low-tide-tapes&timeline=off" style="width:100%;height:760px;border:0"></iframe>
```

A page that runs modules can use the tag instead (it brings its own React through an import map or a bundler):

```html
<supersuit-simulator src="/simulator/scenarios" scenario="low-tide-tapes" artifacts="off"></supersuit-simulator>
<script type="module">import { defineSimulatorElement } from '@supersuit/simulator/embed'; defineSimulatorElement();</script>
```

Nothing in the player is fixed to the viewport: the close card and the enlarged image stay inside the player's own box.

## Library

```js
import { convert, parseSession, validate } from '@supersuit/simulator';
const scenario = convert(parseSession(text), { title: 'Releasing an album' });
const problems = validate(scenario); // [] when valid
```

Exit codes: 0 ok, 1 invalid or refused, 2 usage error. Node 20 or newer, no dependencies.
