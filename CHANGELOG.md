# Changelog

## 0.1.0 (unreleased)

- The scenario format (`supersuit-simulator/1`) and `validate`.
- `convert`: drafts a scenario from a Claude Code session transcript. Human turns only, interrupts marked as redirects, tool work condensed into steps timed by wall clock, plumbing tools folded into the next step, chapters from the session name, files and links collected as artifacts, credentials and home paths removed with every cut recorded.
- Questions the agent asked are kept as decisions, with the question and the person's answer.
- Steps and artifacts carry when they happened, so a replay interleaves them with replies.
- The player: `SimulatorPlayer` (`@supersuit/simulator/player`), mobile first, with persona picker, artifacts and timeline switches; `playback` condenses long turns without changing their totals.
- `tidy`: cleans the person's commands for display (typo fixes from a reviewer, screenshot paths to [screenshot]), refusing any fix that rewrites what was said; originals kept in `human.raw`, changes in `cuts`.
- Phone numbers and email addresses are removed from everything a scenario keeps, recorded as cuts.
- Artifacts are deliverables only (pages, media, documents), never code, config or folders; `tidy` takes `artifacts: { drop, add }` so a reviewer can add what the transcript cannot show (kind `other`, e.g. a release submitted to a store).
- The `simulator` CLI: `convert`, `validate`, `tidy`, `serve`.
