#!/usr/bin/env node
// simulator: draft and check Supersuit Simulator scenarios.
import { readFileSync, writeFileSync } from 'node:fs';
import { convert, parseSession } from '../src/convert.mjs';
import { validate } from '../src/scenario.mjs';
import { createServer } from '../src/serve.mjs';
import { tidy } from '../src/tidy.mjs';
import { recast } from '../src/recast.mjs';

const HELP = `simulator - draft and check Supersuit Simulator scenarios

Usage:
  simulator convert <session.jsonl> [--out <file>] [--title <t>] [--persona <name>] [--id <id>] [--json]
      Draft a scenario from a Claude Code session transcript. Writes the scenario to --out
      (or stdout) and a one-line summary to stderr; --json puts the summary on stdout instead.
  simulator validate <scenario.json> [--json]
      Check a scenario against the format. Exits 1 if anything is wrong.
  simulator tidy <scenario.json> [--fixes <fixes.json>] [--out <file>]
      Clean the person's commands for display: screenshot paths become [screenshot], and
      fixes ({"t7": "corrected text"}) correct typos. Refuses a fix that rewrites what was
      said. The original stays in human.raw; every change is recorded in cuts.
  simulator recast <scenario.json> --spec <spec.json> [--out <file>]
      Tell a different story from the same run: spec is { id, title, persona, keep: [turn ids],
      replace: [[from, to]], forbid: [words] }. A "from" starting with re: is a regex (global,
      case-insensitive). Refuses while any forbidden word survives. Marked illustrative.
  simulator serve <scenario.json>... [--port 4460] [--host 127.0.0.1]
      Watch scenarios in the player in a browser. Add ?autoplay, ?artifacts=off or
      ?timeline=off to the URL to see the limited views an embed uses.

A draft is not a publishable scenario: people in it are not anonymized yet.
Exit codes: 0 ok, 1 invalid or refused, 2 usage error.`;

function args(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json' || a === '--help' || a === '-h') flags[a.replace(/^-+/, '')] = true;
    else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
    else pos.push(a);
  }
  return { pos, flags };
}

const { pos, flags } = args(process.argv.slice(2));
const [cmd, file] = pos;
if (flags.help || flags.h || !cmd) { console.log(HELP); process.exit(cmd || flags.help || flags.h ? 0 : 2); }

try {
  if (cmd === 'convert') {
    if (!file) throw Object.assign(new Error('convert needs a session file'), { code: 2 });
    const sc = convert(parseSession(readFileSync(file, 'utf8')), {
      title: flags.title, id: flags.id, persona: flags.persona ? { name: flags.persona } : undefined,
    });
    const problems = validate(sc);
    const out = JSON.stringify(sc, null, 2) + '\n';
    if (flags.out) writeFileSync(flags.out, out); else if (!flags.json) process.stdout.write(out);
    const summary = { ok: problems.length === 0, turns: sc.turns.length, redirects: sc.turns.filter((t) => t.intervention).length, steps: sc.turns.reduce((n, t) => n + t.steps.length, 0), artifacts: sc.artifacts.length, cuts: sc.cuts.length, problems, out: flags.out ?? null };
    if (flags.json) console.log(JSON.stringify(summary));
    else console.error(`drafted ${summary.turns} turns, ${summary.steps} steps, ${summary.artifacts} artifacts, ${summary.cuts} cuts${problems.length ? `; PROBLEMS: ${problems.join('; ')}` : ''}`);
    process.exit(problems.length ? 1 : 0);
  } else if (cmd === 'validate') {
    if (!file) throw Object.assign(new Error('validate needs a scenario file'), { code: 2 });
    const problems = validate(JSON.parse(readFileSync(file, 'utf8')));
    if (flags.json) console.log(JSON.stringify({ ok: problems.length === 0, problems }));
    else console.log(problems.length ? problems.map((p) => `- ${p}`).join('\n') : 'valid');
    process.exit(problems.length ? 1 : 0);
  } else if (cmd === 'tidy') {
    if (!file) throw Object.assign(new Error('tidy needs a scenario file'), { code: 2 });
    const fixes = flags.fixes ? JSON.parse(readFileSync(flags.fixes, 'utf8')) : {};
    const out = tidy(JSON.parse(readFileSync(file, 'utf8')), fixes);
    const text = JSON.stringify(out, null, 2) + '\n';
    if (flags.out) writeFileSync(flags.out, text); else process.stdout.write(text);
    console.error(`tidied ${out.turns.filter((t) => t.human.raw).length} commands`);
  } else if (cmd === 'recast') {
    if (!file || !flags.spec) throw Object.assign(new Error('recast needs a scenario file and --spec'), { code: 2 });
    const spec = JSON.parse(readFileSync(flags.spec, 'utf8'));
    spec.replace = (spec.replace ?? []).map(([from, to]) => [from.startsWith('re:') ? new RegExp(from.slice(3), 'gi') : from, to]);
    const out = recast(JSON.parse(readFileSync(file, 'utf8')), spec);
    const problems = validate(out);
    if (problems.length) throw new Error(`recast is not a valid scenario: ${problems[0]}`);
    const text = JSON.stringify(out, null, 2) + '\n';
    if (flags.out) writeFileSync(flags.out, text); else process.stdout.write(text);
    console.error(`recast ${out.turns.length} turns as ${out.persona.name}`);
  } else if (cmd === 'serve') {
    const files = pos.slice(1);
    if (!files.length) throw Object.assign(new Error('serve needs at least one scenario file'), { code: 2 });
    const scenarios = files.map((f) => {
      const sc = JSON.parse(readFileSync(f, 'utf8'));
      const problems = validate(sc);
      if (problems.length) throw new Error(`${f} is not a valid scenario: ${problems[0]}`);
      return sc;
    });
    const port = Number(flags.port ?? 4460);
    const host = flags.host ?? '127.0.0.1';
    createServer({ scenarios }).listen(port, host, () => console.log(`simulator serving ${scenarios.length} scenario(s) at http://${host}:${port}/`));
  } else {
    throw Object.assign(new Error(`unknown command: ${cmd}`), { code: 2 });
  }
} catch (e) {
  console.error(`simulator: ${e.message}`);
  process.exit(e.code === 2 ? 2 : 1);
}
