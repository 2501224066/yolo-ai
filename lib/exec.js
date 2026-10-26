'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');

// Turn a resolved path plus its arguments into something spawnable.
//
// On Windows, Node refuses to spawn `.cmd` / `.bat` directly (EINVAL, since the
// CVE-2024-27980 fix). Those must be handed to cmd.exe. `.ps1` shims need
// powershell instead. Everything else spawns as-is.
function buildCommand(exe, args) {
  const ext = path.extname(exe).toLowerCase();

  if (process.platform === 'win32' && (ext === '.cmd' || ext === '.bat')) {
    // /d skips AutoRun, /s keeps the quoted string unambiguous.
    return {
      cmd: process.env.ComSpec || 'cmd.exe',
      argv: ['/d', '/s', '/c', `"${exe}"`, ...args],
    };
  }

  if (process.platform === 'win32' && ext === '.ps1') {
    return {
      cmd: 'powershell.exe',
      argv: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', exe, ...args],
    };
  }

  // An extensionless file on Windows is a sh script (npm writes these for Git
  // Bash). cmd.exe cannot run it, and Node cannot spawn it at all — ENOENT.
  // bash can, so route through it. If bash is absent, fall through and let the
  // spawn fail with a clear message rather than silently doing nothing.
  if (process.platform === 'win32' && ext === '') {
    const bash = findBash();
    if (bash) return { cmd: bash, argv: [exe, ...args] };
  }

  return { cmd: exe, argv: args };
}

let cachedBash;
function findBash() {
  if (cachedBash !== undefined) return cachedBash;

  const { execFileSync } = require('node:child_process');
  const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\Program Files']
    .filter(Boolean);
  const guesses = roots.map((r) => path.join(r, 'Git', 'bin', 'bash.exe'));

  for (const g of guesses) {
    try {
      if (require('node:fs').statSync(g).isFile()) {
        cachedBash = g;
        return cachedBash;
      }
    } catch {
      /* keep looking */
    }
  }

  try {
    execFileSync('bash', ['--version'], { stdio: 'ignore', timeout: 2000, windowsHide: true });
    cachedBash = 'bash';
  } catch {
    cachedBash = null;
  }
  return cachedBash;
}

// Launch the agent with its permission-skip flag prepended.
//
// stdio is inherited on purpose: these are interactive TUIs. Piping would
// break colour, resize handling and — most importantly — keyboard input.
function launch(exe, args, { dryRun = false } = {}) {
  const { cmd, argv } = buildCommand(exe, args);

  if (dryRun) {
    // Quote so the printed line can be pasted back into a shell verbatim.
    const quote = (s) => (/[\s"'$`\\]/.test(s) ? JSON.stringify(s) : s);
    process.stdout.write(`${[cmd, ...argv].map(quote).join(' ')}\n`);
    return Promise.resolve(0);
  }

  return new Promise((resolve) => {
    const exeDir = path.dirname(exe);
    const currentPath = process.env.PATH || '';
    const pathList = currentPath.split(path.delimiter).map((p) => path.resolve(p).toLowerCase());
    let env = process.env;
    if (!pathList.includes(path.resolve(exeDir).toLowerCase())) {
      env = { ...process.env, PATH: `${exeDir}${path.delimiter}${currentPath}` };
    }

    const child = spawn(cmd, argv, {
      stdio: 'inherit',
      windowsHide: false,
      env,
    });

    // Ctrl+C belongs to the agent, not to us. Forward it and let the child
    // decide; we exit with whatever code it reports.
    const forward = (sig) => {
      if (!child.killed) {
        try {
          child.kill(sig);
        } catch {
          /* already gone */
        }
      }
    };
    process.on('SIGINT', () => forward('SIGINT'));
    process.on('SIGTERM', () => forward('SIGTERM'));

    child.on('error', (err) => {
      process.stderr.write(`yolo: failed to start ${cmd}: ${err.message}\n`);
      resolve(127);
    });

    child.on('exit', (code, signal) => {
      if (code !== null) return resolve(code);
      // Killed by a signal: mirror the shell convention of 128 + signo.
      resolve(signal ? 128 : 1);
    });
  });
}

module.exports = { launch, buildCommand };
