# Changelog

## 0.7.0 (2026-10-11)

- A recast spec may state `device` (`iphone` or `macbook`) when the source could not tell where the real session ran. A Remote Control or SDK session reads the same from a Mac and a phone, so the converter leaves `device` unset and Auto drew an iPhone for a session that really ran on a MacBook (Callum's case study). The spec wins over the source; without it the source's device is kept, as before.
- `@supersuit/session-player/playback` exports `summarize` and `duration`, so a host page can print the measured who-did-what beside the player without importing the converter.

## 0.6.0 (2026-10-11)

- **Transparent by default** (Gary, 2026-10-11: "render with NO background colour ... so it sits on any site"). Nothing is painted outside the device frame; the frame and the screen keep their own backgrounds. A host that wants one passes `background` (prop or tag attribute) or `?bg=` on the embed URL: any CSS colour, or `theme` for the player's cream. A value that is not a colour is ignored.
- **Embed it anywhere with one tag** (Gary: "make it easier to embed in any website"): `<script src=".../simulator/embed.js" async></script>` then `<session-player scenario="...">`. A plain script (`src/loader.js`, exported as `@supersuit/session-player/loader.js`, served at `/embed.js` by `session-player serve`) that turns each tag into an iframe of the embed page sized to its content. Defaults: Auto device, Autoplay on, waits for Start.
- In an iframe the player posts its height (`session-player:height`) and the end of a session (`session-player:done`) to the host page; the loader uses both, and fires `session-player:done` on the iframe so a host can offer the next case study.
- The README opens with both embed forms.

## 0.5.0 (2026-10-11)

- **The player is the 0.2.3 experience again** (Gary, 2026-10-11: "really not loving the post-Wilson-merge case study widget, revert the UX"). Wilson's 0.3.0 changes and the 0.3.1 moments fix are reverted with `git revert`, so his commits stay in history: the Start card is back as it was (title, measured line, Start demo button, Autoplay choice; nothing plays on load; `start: 'auto'` opts in), Autoplay is on by default and playing the person when off, and device framing (Auto / iPhone / MacBook, the narrow-MacBook fallback, "Simulating a MacBook" on a phone, toasts) is unchanged from 0.2.3. Gone: `speed`, `highlights`, `moments`, `steps`, the highlights close card and the "Handled for" panel. An embed, tag or prop that still passes them is ignored rather than refused, so existing embeds keep working.
- Kept: the `session-player` name and CLI (and the `simulator` alias), and `recast`'s handling of a spec's `highlight` and `close.handled`, so scenarios recast for 0.3.x still build and their handled lines are still covered by `replace` and `forbid`. The player ignores both fields.

## 0.4.0 (2026-10-11)

- **Renamed `@supersuit/session-player`** (Gary, 2026-10-11: it plays recorded sessions; case studies and the coming Helm demo are content it plays). Same code as 0.3.2. Swap the package name in your imports; the exports, the scenario format, `SimulatorPlayer` and `<supersuit-simulator>` are unchanged. The CLI is `session-player`, and `simulator` still works. The repository is SupersuitUp/session-player (GitHub redirects the old address).

## 0.3.2 (2026-10-11)

- The last `@supersuit/simulator`. The package is renamed `@supersuit/session-player` (Gary, 2026-10-11: it plays recorded sessions, and case studies and the coming Helm demo are content it plays). No code change; the README and description point to the new name.

## 0.3.1 (2026-10-11)

- A moment never clips a line in half. In a short screen (the MacBook window on continentalworks.ai/demo) the moment's parts were squeezed by flexbox, so the answer and the person's line were cut mid-line. Each part now keeps its height, the big answer is a little smaller (up to 22 px, five lines), and the moment scrolls rather than clipping if it still does not fit. In moments the composer no longer repeats the person's line, which the moment already shows; it keeps its status and its Send and mic.

## 0.3.0 (2026-10-11)

- Highlights (Wilson, 2026-10-11: "make it 40 seconds", "the key things, the most important moments for the human"): `speed` (embed `speed=3`) shortens the work between beats; `highlights` (embed `highlights`) shows where each turn landed, its last answer's first paragraph, with reading time that is never sped up; `steps` (embed) sets how many steps a turn keeps. A recast spec may name a turn's landing answer with `highlight: { "t6": 1 }`.
- Relief you can see: in highlights the panel is "Handled for <person>", only what got handled (artifacts of kind `other`) ticking off as it lands; the close card can list what Freeda handled (`close.handled`, carried and recast by `recast`). Measured facts only, never time saved.
- One moment per screen: `moments` (embed `moments`) replaces the scrolling log with the person's line small, where Freeda landed large, a counter ("3 of 8") and what is handled so far. Wilson: "the scroll down ... doesn't give me the TL;DR."
- An obvious Play, folded into the one Start (Wilson: "make sure the red button is a play button"): the Start demo card's button is now a large pulsing red Play with "Start demo" under it, the Autoplay choice still beside it. There is exactly one Play: the header keeps the Autoplay switch (on by default, named so), and the composer keeps Send and the mic, so no second Play competes with Start.
- Embeds take the cut too: `speed`, `highlights`, `moments` and `steps` on the iframe URL and as attributes on `<supersuit-simulator>`. A highlights cut still waits on the Start card unless the host opts in with `start=auto`.
- Board picks on autoplay follow `speed`, as the rest of the run does.

## 0.2.3 (2026-10-11)

- **A Start demo button.** Nothing plays on load anywhere. The device shows a Start card over its screen: the scenario's title, one measured line (commands from the person, Freeda's minutes of work), a Start demo button, and the Autoplay choice beside it (on: it plays itself; off: you play the person). Sending a command or tapping the mic also counts as starting. Play again appears at the end, as before. A host opts into starting at once with `start: 'auto'`, `?start=auto` or `start="auto"` on the tag. Reduced motion is respected (no animation on the card).

## 0.2.2 (2026-10-11)

- **Autoplay is on by default, and is called Autoplay.** The playback checkbox was labelled "auto", next to a device switch whose first option is also Auto, and it was unticked by default, so a viewer read Auto as not selected. Off, the viewer plays the person: each message waits, prefilled, for a tap on Send (or the mic), and each board waits for the viewer's pick, answered with what the person really chose. Turning it on or off says so in a toast. `autoplay={false}`, `?autoplay=off` or `autoplay="off"` on the tag start it off (the old bare `?autoplay` still means on).
- The device switch marks the active mode and, on Auto, what Auto resolved to: "Auto · iPhone", "Auto · MacBook", or "Auto · this phone". A forced mode is the marked one and Auto carries no hint.
- Toasts: a tap on the device switch says what is shown now and why ("Now simulating a MacBook: this session ran in Claude Code on a Mac."); a pick on a board says "Same call as X." or "In the real session, X chose Y." Quiet, polite to screen readers, over the demo with no layout shift, gone after about three seconds.

## 0.2.1 (2026-10-11)

- A MacBook in a column too narrow for a believable laptop (under 560 px, such as the book's 434 px figure) keeps its Claude Code window and its "Simulating a MacBook" label and drops the lid, menu bar and base, rather than shrinking into a toy where the composer and the counter overlap.

## 0.2.0 (2026-10-11)

- Device framing. On a desktop or tablet the demo is drawn inside a device: an iPhone (status bar with a real clock, Dynamic Island, side buttons), or a MacBook (lid, notch, menu bar with a real clock, a Claude Code window in a terminal theme, base) when the scenario ran on a Mac. On a phone the demo is the phone, full-bleed, as before.
- `device` mode: `auto` (default), `iphone` or `macbook`, set by the `device` prop, `?device=` on the embed URL, the `device` attribute on `<supersuit-simulator>`, or the switch on the demo itself (Auto / iPhone / MacBook).
- A MacBook forced on a phone is never a laptop shrunk into a phone: it is a desktop-style window at phone width with a persistent "Simulating a MacBook" pill. Whenever a frame is drawn, a quiet label outside the screen says what is simulated.
- Phone or desktop is decided from capability signals (`pointer: coarse`, `hover: none`, `maxTouchPoints`) and the viewport's shorter side, re-read on resize and rotation (`classifyViewer`, `resolveDevice` in `device.mjs`).
- The scenario format gains an optional `device: "iphone" | "macbook"`, validated; scenarios without it are unchanged and show as an iPhone. `convert` sets `macbook` for a session typed in a terminal (or the desktop app) on a Mac and leaves it unset when it cannot tell; `convert --device` overrides; `recast` keeps it.
- The player's main container is now named (`container: ss-sim`), so its wide-layout rule follows the MacBook window it sits in. Hosts that copy the player's browser files must also copy `device.mjs` (the player imports it).

## 0.1.1 (2026-10-11)

- Renamed for readers: the Supersuit Simulator is now the **Supersuit Session demo** (the README, the package description, the CLI help and the default page title of `simulator serve`). The package name, the `simulator` CLI, the `supersuit-simulator/1` format, `SimulatorPlayer` and `<supersuit-simulator>` are unchanged, so no install or embed breaks.

## 0.1.0 (2026-10-10)

- The scenario format (`supersuit-simulator/1`) and `validate`.
- `convert`: drafts a scenario from a Claude Code session transcript. Human turns only, interrupts marked as redirects, tool work condensed into steps timed by wall clock, plumbing tools folded into the next step, chapters from the session name, files and links collected as artifacts, credentials and home paths removed with every cut recorded.
- Questions the agent asked are kept as the whole board the person saw (`step.ask = { questions: [{ header, question, multiSelect, options: [{ label, description }], answer, chosen }], dismissed }`), read from the session's structured result, and the player draws them as that board: numbered options, the pick checked, a typed answer shown as the person's own words, a closed board marked.
- Steps and artifacts carry when they happened, so a replay interleaves them with replies.
- The player: `SimulatorPlayer` (`@supersuit/simulator/player`), mobile first, with persona picker, artifacts and timeline switches; `playback` condenses long turns without changing their totals.
- `tidy`: cleans the person's commands for display (typo fixes from a reviewer, screenshot paths to [screenshot]), refusing any fix that rewrites what was said; originals kept in `human.raw`, changes in `cuts`.
- Phone numbers and email addresses are removed from everything a scenario keeps, recorded as cuts.
- Artifacts are deliverables only (pages, media, documents), never code, config or folders; `tidy` takes `artifacts: { drop, add }` so a reviewer can add what the transcript cannot show (kind `other`, e.g. a release submitted to a store).
- `recast`: tells a different story from the same real run (new persona and subject, same commands, steps, timing and decisions), marked illustrative on screen, with a `forbid` list that refuses to finish while any word from the original survives.
- Boards are playable and match the native question board: pinned to the bottom of the phone in place of the composer, one question at a time with a tab per question. Playback pauses on each board, the viewer taps an option (or Other, or Type something else where the person closed it), each pick is answered with the real choice, and the recording resumes on the real path. Autoplay picks the real answers. Once answered, the conversation keeps a compact record (`Asked`): each question, what was chosen, and where the viewer picked differently.
- The mic "says" the command: tapping it streams the words into the composer like dictation (`dictate`), then sends. It is a 48 px circle, not a stretched oval. The counter reads "No work yet" before anything runs.
- Idle time is removed: thinking before a step counts at most 3 min, any one step at most 10 min, a question at most 5 min, and a timed-out command counts as no work. What was removed is kept as `step.idleMs`, recorded in cuts, summed by `summarize`, and named on the end screen.
- Images: what the person pasted is kept from the session (`human.images`); a reviewer attaches what they were shown (`tidy` `images`: on a step, a board, a single option, or the command), since a session often names images only through loop variables; `bundle` copies and shrinks every image into `assets/<id>/` beside the scenario; `recast` must map every image to a replacement by id or it refuses; the player shows option thumbnails, step galleries, pasted images on the command, and tap to enlarge. A step that showed images is never folded into quick steps.
- The close card (`CloseCard`): a celebration when the session ends, in measured numbers only: Freeda's work time and steps against the person's commands and minutes deciding, the chore freed (from a workflow catalog row), the edge points earned with their four counts, the things made, and the idle time left out. Never time saved. The facts live in an optional `close` block (`tidy` sets it; `recast` carries it, recasts its words, and may restate its measured numbers for the turns it keeps); `validate` refuses an edge total that is not the sum of its counts.
- Embeddable in any page or book: an `/embed` page for an `<iframe>` (query switches `scenario`, `artifacts`, `timeline`, `autoplay`, `height`), a `<supersuit-simulator>` custom element (`@supersuit/simulator/embed`), `scenarioId` and `height` props, and every overlay contained inside the player, never fixed to the host page's viewport.
- `bundle` writes a provenance recipe beside every image (mode derive: what it came from, what resized it, and the source's own recipe nested), so a bundled scenario passes a wiki's image-provenance gate.
- `recast` gives every image a neutral id (`<recast id>-image-<n>`, one per picture), since ids became file names and carried the original's subject.
- A session opening with a slash command shows the command as typed, not its tags; usage-limit and API-error notices are dropped (they are the harness, and carry the operator's plan and time zone); recast checks and recasts the close card's source notes.
- The `simulator` CLI: `convert`, `validate`, `tidy`, `recast`, `bundle`, `serve`.
