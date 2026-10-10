# @supersuit/simulator

The Supersuit Simulator: step into the shoes of someone who needs a great deal of work done, give their commands on a simulated phone, and watch the work and the things it makes appear. Every scenario is built from a real agent session, with the person's corrections left in.

This package holds the **scenario format** and the **converter** that drafts a scenario from a Claude Code session transcript. The player (a React component) comes next.

## Install

```
npm install -g @supersuit/simulator
```

## Use

```
simulator convert ~/.claude/projects/<dir>/<session-id>.jsonl --title "Releasing an album" --persona Gary --out album.json
simulator validate album.json
```

`convert` keeps only what the person actually typed as turns (tool results, skill bodies, task notifications, messages from other sessions and interrupt markers are not turns), marks a turn that followed an interrupt as the person redirecting, condenses the agent's tool work into named steps timed by the wall clock, and collects the files and links it made or pointed at.

**A draft is not ready to publish.** The converter removes credential-shaped strings and home-directory paths and records every edit in `cuts`, but it does not anonymize people. Do that, and review the draft, before anyone else sees it.

## The format

`supersuit-simulator/1`, one JSON object:

| Field | What it holds |
|---|---|
| `persona` | `{ name, role, blurb }` |
| `source` | `{ kind: session \| persona, sessionId, date, illustrative }` |
| `chapters[]` | `{ title, turn }`, from the session's name changes |
| `turns[]` | `{ id, at, human { text, via, choices[] }, intervention, steps[] { label, tool, ms, count }, replies[] { text, at }, artifacts[] }` |
| `artifacts[]` | `{ id, kind: file \| link, title, path \| url, turn }` |
| `cuts[]` | `{ turn, what, reason }`: every edit, so nothing is changed silently |

`intervention` is one of `null`, `redirect`, `correct`, `approve`, `decide`. The converter sets only `redirect`; the rest are set by the person reviewing the draft.

## Library

```js
import { convert, parseSession, validate } from '@supersuit/simulator';
const scenario = convert(parseSession(text), { title: 'Releasing an album' });
const problems = validate(scenario); // [] when valid
```

Exit codes: 0 ok, 1 invalid or refused, 2 usage error. Node 20 or newer, no dependencies.
