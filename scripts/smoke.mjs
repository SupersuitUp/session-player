// Proves the package works the way the README says, as installed: packs it, installs the tarball
// into a fresh folder outside the repo, imports the library and runs the CLI from there. Passing
// tests prove the parts; this proves the published boundary (every runtime file is in `files`).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), 'simulator-smoke-'));
const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', out], { cwd: root, encoding: 'utf8' }))[0];
const app = join(out, 'app');
execFileSync('mkdir', ['-p', app]);
writeFileSync(join(app, 'package.json'), '{"name":"smoke","version":"1.0.0","type":"module"}');
execFileSync('npm', ['install', '--silent', '--no-audit', '--no-fund', join(out, packed.filename)], { cwd: app, stdio: 'inherit' });
writeFileSync(join(app, 'check.mjs'), `import { convert, parseSession, validate, FORMAT } from '@supersuit/simulator';
const line = JSON.stringify({ type: 'user', sessionId: 's', timestamp: '2026-01-01T00:00:00Z', origin: { kind: 'human' }, message: { content: 'ship it' } });
const sc = convert(parseSession(line), { title: 'smoke' });
if (FORMAT !== 'supersuit-simulator/1' || sc.turns.length !== 1 || validate(sc).length) { console.error('library smoke failed'); process.exit(1); }
console.log('library ok');`);
execFileSync(process.execPath, ['check.mjs'], { cwd: app, stdio: 'inherit' });
const help = execFileSync(join(app, 'node_modules', '.bin', 'simulator'), ['--help'], { cwd: app, encoding: 'utf8' });
if (!/simulator convert/.test(help) || !/simulator bundle/.test(help)) { console.error('CLI smoke failed'); process.exit(1); }
console.log('cli ok');
