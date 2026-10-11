# @supersuit/simulator

The Supersuit Session demo: step into the shoes of someone who needs a great deal of work done, give their commands on a simulated phone, and watch the work and the things it makes appear. Every scenario is built from a real agent session, with the person's corrections left in.

The demo was called the Supersuit Simulator until 0.1.1; the package keeps the name `@supersuit/simulator`, as do the CLI, the scenario format and the exports, so nothing that installs it changes.

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

`device` (optional) is where the real session ran: `iphone` or `macbook`. The converter sets `macbook` when the person typed into a terminal (or the desktop app) on a Mac, and leaves it out when it cannot tell (Remote Control and SDK sessions); a scenario without it is shown as an iPhone.

`intervention` is one of `null`, `redirect`, `correct`, `approve`, `decide`. The converter sets only `redirect`; the rest are set by the person reviewing the draft.

## The player

```js
import { SimulatorPlayer } from '@supersuit/simulator/player';
<SimulatorPlayer scenario={album} />                       // one scenario
<SimulatorPlayer scenarios={[dana, marcus]} />             // persona picker first
<SimulatorPlayer scenario={album} artifacts={false} timeline={false} />  // a limited embed
```

Nothing plays until the viewer presses Start demo (a host may pass `start: 'auto'` or `?start=auto`). By default the session then plays itself (Autoplay). Untick Autoplay and the viewer plays the person, tapping each command (or the mic to say it), and watches the steps play, sped up from their real durations, with a running count of the work done for the persona. Decisions the person made show as their own cards; things made collect in a side panel on wide screens and a slide-up tray on phones. Needs React 18 or newer; no build step and no stylesheet to import.

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

## A highlights cut

For a short page demo (about 40 seconds), pass `speed` (work between beats runs that many times faster), `highlights` (each turn shows only where it landed, its answer's first paragraph, with real reading time, and the panel ticks off what got handled), `moments` (one screen per moment instead of a scrolling log) and `steps` (how many steps a turn keeps). Same names as props, embed query switches (`?speed=3&highlights&moments&steps=1`) and tag attributes. A recast spec may name a turn's landing answer with `highlight: { "t6": 1 }`, and a scenario's `close.handled` lists what Freeda handled, in measured facts. The Start card still waits for the viewer.

## Device framing

`device` is `auto` (the default), `iphone` or `macbook`: the `device` prop, `?device=` on the embed URL, or the `device` attribute on the tag. The viewer can also switch it on the demo (Auto / iPhone / MacBook).

| | on a phone | on a desktop or tablet |
| --- | --- | --- |
| `auto` | full-bleed: the demo is the phone | an iPhone, or a MacBook when the scenario's `device` is `macbook` |
| `iphone` | full-bleed | an iPhone |
| `macbook` | a desktop-style window at phone width, labelled "Simulating a MacBook"; never a laptop shrunk into a phone | a MacBook: lid, menu bar clock, a Claude Code window, base |

Whenever a device is drawn, a quiet label outside its screen says what is simulated. Phone or desktop is read from capability signals (coarse pointer, no hover, touch points) and the viewport's shorter side, again on every resize and rotation; a narrow desktop window is still a desktop and an iPad is a desktop unless it is in a narrow split view. Frames are CSS and SVG, sized from the height the player is given, so the same iframe height keeps fitting.

Nothing in the player is fixed to the viewport: the close card and the enlarged image stay inside the player's own box.

## Library

```js
import { convert, parseSession, validate } from '@supersuit/simulator';
const scenario = convert(parseSession(text), { title: 'Releasing an album' });
const problems = validate(scenario); // [] when valid
```

Exit codes: 0 ok, 1 invalid or refused, 2 usage error. Node 20 or newer, no dependencies.
