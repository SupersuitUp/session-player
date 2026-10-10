# Changelog

## 0.1.0 (unreleased)

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
- The `simulator` CLI: `convert`, `validate`, `tidy`, `recast`, `serve`.
