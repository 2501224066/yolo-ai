'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const registry = require('./registry');
const { buildCommand } = require('./exec');

// Avoid infinite recursion in case an agent command on PATH is aliased or symlinked
// directly to this package's entry point.
function isSelf(filePath) {
  try {
    if (!process.argv[1]) return false;
    const realTarget = fs.realpathSync(filePath).toLowerCase();
    const selfPath = fs.realpathSync(process.argv[1]).toLowerCase();
    return realTarget === selfPath;
  } catch {
    return false;
  }
}

// Kept for backward compatibility. Previously excluded whole directories which broke
// agents installed in standard locations like ~/.local/bin or npm's global bin dir.
function ownDirs() {
  return [];
}

// Well-known directories where agents commonly install across Win, Mac and Linux,
// used as fallbacks if missing from process.env.PATH.
function defaultDirs() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const dirs = [];

  if (process.platform === 'win32') {
    const appdata = process.env.APPDATA || (home ? path.join(home, 'AppData', 'Roaming') : '');
    const localappdata = process.env.LOCALAPPDATA || (home ? path.join(home, 'AppData', 'Local') : '');
    const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    if (appdata) dirs.push(path.join(appdata, 'npm'));
    if (localappdata) {
      dirs.push(path.join(localappdata, 'Programs'));
      dirs.push(path.join(localappdata, 'Programs', 'Python'));
      dirs.push(path.join(localappdata, 'Microsoft', 'WindowsApps'));
    }
    if (home) {
      dirs.push(path.join(home, '.local', 'bin'));
      dirs.push(path.join(home, '.opencode', 'bin'));
      dirs.push(path.join(home, '.cargo', 'bin'));
    }
    dirs.push(path.join(progFiles, 'nodejs'));
    dirs.push(path.join(progFilesX86, 'nodejs'));
  } else {
    if (home) {
      dirs.push(path.join(home, '.local', 'bin'));
      dirs.push(path.join(home, '.opencode', 'bin'));
      dirs.push(path.join(home, '.cargo', 'bin'));
    }
    dirs.push('/opt/homebrew/bin');
    dirs.push('/opt/homebrew/sbin');
    dirs.push('/usr/local/bin');
    dirs.push('/usr/bin');
    dirs.push('/bin');
    dirs.push('/snap/bin');
  }

  return dirs.filter(Boolean);
}

function pathDirs() {
  const raw = (process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean);

  const seen = new Set();
  const dirs = [];

  for (const dir of [...raw, ...defaultDirs()]) {
    let resolved;
    try {
      resolved = path.resolve(dir);
    } catch {
      continue;
    }
    const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    if (!seen.has(key)) {
      seen.add(key);
      dirs.push(resolved);
    }
  }

  return dirs;
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

// Find the real executable for `name`.
// Returns the full path, or null when the agent is not installed.
function resolveAgent(name) {
  for (const dir of pathDirs()) {
    for (const cand of candidates(name)) {
      const full = path.join(dir, cand);
      if (isExecutableFile(full) && !isSelf(full)) return full;
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

  const exeDir = path.dirname(exe);
  const currentPath = process.env.PATH || '';
  const pathList = currentPath.split(path.delimiter).map((p) => path.resolve(p).toLowerCase());
  let env = process.env;
  if (!pathList.includes(path.resolve(exeDir).toLowerCase())) {
    env = { ...process.env, PATH: `${exeDir}${path.delimiter}${currentPath}` };
  }

  try {
    execFileSync(cmd, argv, {
      stdio: 'ignore',
      timeout: 3000,
      windowsHide: true,
      env,
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

module.exports = { resolveAgent, detectAll, pathDirs, defaultDirs, ownDirs };
