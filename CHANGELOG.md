# Changelog

## 0.1.0 (unreleased)

- The scenario format (`supersuit-simulator/1`) and `validate`.
- `convert`: drafts a scenario from a Claude Code session transcript. Human turns only, interrupts marked as redirects, tool work condensed into steps timed by wall clock, plumbing tools folded into the next step, chapters from the session name, files and links collected as artifacts, credentials and home paths removed with every cut recorded.
- The `simulator` CLI: `convert`, `validate`.
