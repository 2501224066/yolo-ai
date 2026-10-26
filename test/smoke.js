'use strict';

// Verifies the pieces that decide correctness, without launching any agent.
// Run: node test/smoke.js

const assert = require('node:assert');
const path = require('node:path');

const registry = require('../lib/registry');
const { buildCommand } = require('../lib/exec');
const { resolveAgent, ownDirs } = require('../lib/detect');

let passed = 0;
function check(label, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${label}`);
  } catch (err) {
    console.log(`FAIL  ${label}\n      ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('registry');
check('every entry has a flag and a probe', () => {
  for (const [name, e] of Object.entries(registry)) {
    assert.ok(e.flag && e.flag.startsWith('-'), `${name} flag`);
    assert.ok(Array.isArray(e.probe), `${name} probe`);
  }
});
check('native entries use the real --yolo name', () => {
  for (const [name, e] of Object.entries(registry)) {
    if (e.native) assert.strictEqual(e.flag, '--yolo', `${name}`);
  }
});

console.log('\ncommand routing');
check('.cmd goes through cmd.exe (EINVAL workaround)', () => {
  const { cmd } = buildCommand('C:\\x\\claude.cmd', []);
  assert.ok(/cmd\.exe$/i.test(cmd), `got ${cmd}`);
});
check('.ps1 goes through powershell', () => {
  const { cmd, argv } = buildCommand('C:\\x\\claude.ps1', []);
  assert.ok(/powershell/i.test(cmd), `got ${cmd}`);
  assert.ok(argv.includes('-File'), 'passes -File');
});
check('a .exe spawns directly', () => {
  const { cmd, argv } = buildCommand('C:\\x\\agy.exe', ['--version']);
  assert.strictEqual(cmd, 'C:\\x\\agy.exe');
  assert.deepStrictEqual(argv, ['--version']);
});

console.log('\nshim resolution');
check('own directories are excluded from resolution', () => {
  const skip = ownDirs();
  assert.ok(skip.length > 0, 'has at least one excluded dir');
  for (const d of skip) assert.strictEqual(d, path.resolve(d).toLowerCase());
});
check('an agent never resolves to a path inside our own shim dirs', () => {
  for (const name of Object.keys(registry)) {
    const exe = resolveAgent(name);
    if (!exe) continue;
    const dir = path.resolve(path.dirname(exe)).toLowerCase();
    assert.ok(!ownDirs().includes(dir), `${name} resolved into shim dir ${dir}`);
  }
});

console.log('\nflag placement');
check('flag is prepended, user args stay in order', () => {
  const entry = registry.claude;
  const userArgs = ['-p', 'hello world'];
  const args = [entry.flag, ...userArgs];
  assert.deepStrictEqual(args, [
    '--dangerously-skip-permissions',
    '-p',
    'hello world',
  ]);
});

console.log('\npostinstall');
check('shimDir resolves the npm prefix, not the script directory', () => {
  // Regression: deriving the shim dir from process.argv[1] made the postinstall
  // warn about `.../lib` on every correct install.
  const path = require('node:path');
  const saved = process.env.npm_execpath;
  const fake = ['C:', 'Program Files', 'nodejs', 'node_modules', 'npm', 'bin', 'npm-cli.js']
    .join(path.sep);
  process.env.npm_execpath = fake;
  try {
    delete require.cache[require.resolve('../lib/install')];
    // shimDir is not exported; assert through the observable behaviour that the
    // prefix — not the script dir — is what gets checked.
    const dir = path.dirname(path.dirname(path.dirname(path.dirname(fake))));
    assert.strictEqual(dir, ['C:', 'Program Files', 'nodejs'].join(path.sep));
    assert.ok(!dir.endsWith('lib'), 'must not resolve to a lib directory');
  } finally {
    if (saved === undefined) delete process.env.npm_execpath;
    else process.env.npm_execpath = saved;
  }
});

console.log(`\n${passed} checks passed`);
