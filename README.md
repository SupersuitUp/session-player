# @supersuit/session-player

Plays recorded agent sessions (case studies, and the coming Helm demo): step into the shoes of someone who needs a great deal of work done, give their commands on a simulated phone, and watch the work and the things it makes appear. Every scenario is built from a real agent session, with the person's corrections left in.

Renamed from `@supersuit/simulator` in 0.4.0 (2026-10-11): it plays recorded sessions, and case studies and the coming Helm demo are content it plays. To move, swap the package name in your imports; the exports, the scenario format (`supersuit-simulator/1`), `SimulatorPlayer` and `<supersuit-simulator>` are unchanged, and the CLI answers to both `session-player` and the old `simulator`.

## Embed it in any website

One tag, any page, any framework or none. Paste this where the case study should appear:

```html
<script src="https://continentalworks.ai/simulator/embed.js" async></script>
<session-player scenario="phone-rescue"></session-player>
```

The player sizes itself to its content (no fixed height), is transparent around the device so it sits on your page's own background, picks the device for the viewer (Auto), plays on Autoplay, and waits for the viewer to press Start. Optional attributes: `device` (`auto`, `iphone`, `macbook`), `autoplay="off"` (the viewer plays the person), `start="auto"` (start without the Start card), `background` (a CSS colour, or `theme` for the player's cream), `artifacts="off"`, `timeline="off"`, `height` (the device's height, e.g. `640px`), `title`, `theme="maison"` (the Continental Works house: night, marble and bronze; 0.10.0). On the React component and the `<supersuit-simulator>` tag, `agent` names the agent in the player's own lines (default `Pluma`).

No scripts allowed? Use the iframe on its own, with a fixed height:

```html
<iframe src="https://continentalworks.ai/simulator/embed?scenario=phone-rescue" title="Case study"
        style="width:100%;height:860px;border:0;background:transparent" loading="lazy"></iframe>
```

The same query switches work on the URL (`device`, `autoplay=off`, `start=auto`, `bg`, `artifacts=off`, `timeline=off`, `height`, `theme=maison`). Inside an iframe the player posts `{ type: 'session-player:height', height }` to its parent whenever its height changes, and `{ type: 'session-player:done', scenario }` when a session ends, so the script above (or your own listener) can size the frame and offer what comes next. Any host serving the player can serve the loader: it is `src/loader.js` (export `@supersuit/session-player/loader.js`), and `session-player serve` serves it at `/embed.js`.

This package holds the **scenario format**, the **converter** that drafts a scenario from a Claude Code session transcript, and the **player**, a React component that plays scenarios on a simulated phone.

## Install

```
npm install -g @supersuit/session-player
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
| `source` | `{ kind: session \| persona, sessionId, date, startedAt, illustrative }` |
| `chapters[]` | `{ title, turn }`, from the session's name changes |
| `turns[]` | `{ id, at, human { text, via, choices[] }, intervention, steps[] { label, tool, ms, count }, replies[] { text, at }, artifacts[] }` |
| `artifacts[]` | `{ id, kind: file \| link \| other, title, path \| url, turn, at }` |
| `cuts[]` | `{ turn, what, reason }`: every edit, so nothing is changed silently |

`device` (optional) is where the real session ran: `iphone` or `macbook`. The converter sets `macbook` when the person typed into a terminal (or the desktop app) on a Mac, and leaves it out when it cannot tell (Remote Control and SDK sessions); a scenario without it is shown as an iPhone. Because unset can mean either, whoever ran the session should state it: `convert --device`, or `device` in a recast spec (0.7.0), which overrides the source.

`intervention` is one of `null`, `redirect`, `correct`, `approve`, `decide`. The converter sets only `redirect`; the rest are set by the person reviewing the draft.

## The player

```js
import { SimulatorPlayer } from '@supersuit/session-player/player';
<SimulatorPlayer scenario={album} />                       // one scenario
<SimulatorPlayer scenarios={[dana, marcus]} />             // persona picker first
<SimulatorPlayer scenario={album} artifacts={false} timeline={false} />  // a limited embed
```

Nothing plays until the viewer presses Start demo (a host may pass `start: 'auto'` or `?start=auto`). By default the session then plays itself (Autoplay). Untick Autoplay and the viewer plays the person, tapping each command (or the mic to say it), and watches the steps play, sped up from their real durations, with a running count of the work done for the persona. Decisions the person made show as their own cards; things made collect in a side panel on wide screens and a slide-up tray on phones. Needs React 18 or newer; no build step and no stylesheet to import.

On Autoplay a hand does the person's tapping where you can see it: a fingertip on a phone, the pointer on a MacBook, travelling to each control and pressing it before the choice lands. A board answer the person typed (the question's Other) is typed out in the field at a human pace, then sent. `prefers-reduced-motion` drops the travel and shows the answer whole (`reducedMotion` on the component forces either way).

## Embedding it in a page or a book

Any page, including a book reader, can drop in an iframe:

```html
<iframe src="https://<host>/embed?scenario=low-tide-tapes&timeline=off" style="width:100%;height:760px;border:0"></iframe>
```

A page that runs modules can use the tag instead (it brings its own React through an import map or a bundler):

```html
<supersuit-simulator src="/simulator/scenarios" scenario="low-tide-tapes" artifacts="off"></supersuit-simulator>
<script type="module">import { defineSimulatorElement } from '@supersuit/session-player/embed'; defineSimulatorElement();</script>
```

## Device framing

`device` is `auto` (the default), `iphone` or `macbook`: the `device` prop, `?device=` on the embed URL, or the `device` attribute on the tag. The viewer can also switch it on the demo (Auto / iPhone / MacBook).

| | on a phone | on a desktop or tablet |
| --- | --- | --- |
| `auto` | full-bleed: the demo is the phone | an iPhone, or a MacBook when the scenario's `device` is `macbook` |
| `iphone` | full-bleed | an iPhone |
| `macbook` | a desktop-style window at phone width, labelled "Simulating a MacBook"; never a laptop shrunk into a phone | a MacBook: lid, menu bar clock, a Claude Code window, base |

Whenever a device is drawn, a quiet label outside its screen says what is simulated. Phone or desktop is read from capability signals (coarse pointer, no hover, touch points) and the viewport's shorter side, again on every resize and rotation; a narrow desktop window is still a desktop and an iPad is a desktop unless it is in a narrow split view. Frames are CSS and SVG, sized from the height the player is given, so the same iframe height keeps fitting.

## The clock

Every simulated device shows the session's time, never the viewer's: the MacBook's menu bar, the drawn iPhone's status bar, and, on a real phone or any frame without a bar of its own, a small time pill in the header. It starts when the session started and moves with the work the counter shows, so it runs fast while the work runs and stands still while the session waits on a decision, is paused or has ended. The start is `source.startedAt` when the scenario records it (write the session's own wall time with no offset, `2026-10-12T14:03:00`, to show that time to every viewer); otherwise nine in the morning on `source.date`. Pass `clock: 'wall'` (`?clock=wall`, or the `clock` attribute) for the viewer's own time.

Inside a whole laptop (the player 560px wide or more) the Claude Code window's text follows the window's width, 10.5 to 12px, and its chrome is drawn tighter, so more of the session fits; the phone, the drawn iPhone and the narrow windows keep their sizes.

`FEATURES` (exported from `@supersuit/session-player/player`) says what the player does itself, so a host page that used to do any of it from outside can stop once the copy it serves has it.

Nothing in the player is fixed to the viewport: the close card and the enlarged image stay inside the player's own box.

## Library

```js
import { convert, parseSession, validate } from '@supersuit/session-player';
const scenario = convert(parseSession(text), { title: 'Releasing an album' });
const problems = validate(scenario); // [] when valid
```

Exit codes: 0 ok, 1 invalid or refused, 2 usage error. Node 20 or newer, no dependencies.
