'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const registry = require('./registry');
const { buildCommand } = require('./exec');

// Directories we must never resolve an agent from: our own shim lives there, so
// resolving from it would re-enter `yolo` and recurse forever.
function ownDirs() {
  return [
    path.dirname(process.argv[1] || ''),
    path.join(process.env.HOME || process.env.USERPROFILE || '', '.local', 'bin'),
    path.join(process.env.APPDATA || '', 'npm'),
  ]
    .filter(Boolean)
    .map((d) => path.resolve(d).toLowerCase());
}

function pathDirs() {
  return (process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean);
}

// Windows resolves an extensionless command through PATHEXT; a bare name may be
// backed by `foo.exe`, `foo.cmd`, or `foo.ps1` (npm generates all three).
function candidates(name) {
  if (process.platform !== 'win32') return [name];

  const exts = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .filter(Boolean);

  const out = [name, ...exts.map((e) => name + e.toLowerCase())];
  // npm also writes a `.ps1` shim, which PATHEXT normally omits.
  out.push(name + '.ps1');
  return out;
}

function isExecutableFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// Find the real executable for `name`, skipping our own shim directories.
// Returns the full path, or null when the agent is not installed.
function resolveAgent(name) {
  const skip = ownDirs();

  for (const dir of pathDirs()) {
    let resolved;
    try {
      resolved = path.resolve(dir).toLowerCase();
    } catch {
      continue;
    }
    if (skip.includes(resolved)) continue;

    for (const cand of candidates(name)) {
      const full = path.join(dir, cand);
      if (isExecutableFile(full)) return full;
    }
  }
  return null;
}

// Confirm the binary actually runs. A stale PATH entry pointing at a deleted
// or broken install should not produce a working-looking shim.
//
// Routing matters here: an extensionless npm shim cannot be spawned directly on
// Windows (ENOENT), and a `.cmd` cannot either (EINVAL). buildCommand knows how
// to reach both, so probe through it rather than calling execFileSync on the
// raw path — otherwise installed agents look missing.
function probe(entry) {
  const exe = resolveAgent(entry.name);
  if (!exe) return { ok: false, reason: 'not found on PATH' };

  const args = (registry[entry.name] && registry[entry.name].probe) || ['--version'];
  const { cmd, argv } = buildCommand(exe, args);

  try {
    execFileSync(cmd, argv, {
      stdio: 'ignore',
      timeout: 3000,
      windowsHide: true,
    });
    return { ok: true, exe };
  } catch (err) {
    // A non-zero exit still proves the binary exists and runs.
    if (err && err.status !== undefined && err.status !== null) {
      return { ok: true, exe };
    }
    return { ok: false, reason: (err && err.code) || 'probe failed', exe };
  }
}

// Scan every registered agent and report which ones are usable.
function detectAll() {
  return Object.keys(registry).map((name) => {
    const r = probe({ name });
    return {
      name,
      installed: r.ok,
      exe: r.exe || null,
      reason: r.reason || null,
      flag: registry[name].flag,
      native: Boolean(registry[name].native),
    };
  });
}

module.exports = { resolveAgent, detectAll, pathDirs, ownDirs };
