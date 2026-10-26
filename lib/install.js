'use strict';

// postinstall: report what we found, and tell the user about PATH if the shim
// is not reachable. Deliberately does NOT edit PATH, shell rc files, or any
// PowerShell profile — the shims work through PATH lookup alone, and those
// files belong to the user.

const path = require('node:path');
const { detectAll, pathDirs } = require('./detect');

// Where npm puts the `yolo` / `yolo.cmd` / `yolo.ps1` trio. This is the global
// bin directory — NOT the directory of this script. process.argv[1] during a
// postinstall points at lib/install.js, so deriving the shim dir from it would
// warn about a directory that never contains the shims.
//
// npm_execpath points at npm's own entry script (…/npm/bin/npm-cli.js). Four
// levels up is the node prefix; the shims live directly under it on Windows and
// in `<prefix>/bin` on POSIX.
function shimDir() {
  const execpath = process.env.npm_execpath;
  if (execpath) {
    let p = execpath;
    for (let i = 0; i < 4; i++) p = path.dirname(p);
    return process.platform === 'win32' ? p : path.join(p, 'bin');
  }

  // Fallback: the running node binary's directory (…/nodejs on Windows, …/bin
  // on POSIX), which is where npm's global shims sit in the common case.
  return path.dirname(process.execPath);
}

function main() {
  const rows = detectAll();
  const found = rows.filter((r) => r.installed);

  process.stdout.write('\nyolo-ai installed.\n\n');

  if (found.length === 0) {
    process.stdout.write('  No registered agents found on PATH yet.\n');
    process.stdout.write('  Run `yolo --list` after installing one.\n\n');
    return;
  }

  process.stdout.write('  Agents found on PATH:\n');
  for (const r of found) {
    process.stdout.write(`    ${r.name.padEnd(10)} + ${r.flag}\n`);
  }
  process.stdout.write('\n  Usage:  yolo <agent> [args...]\n');
  process.stdout.write('          yolo claude -p "explain this repo"\n\n');

  // If the directory holding our shims is not on PATH the command will appear
  // to be missing, which looks like a broken install. Say so plainly.
  const dirs = pathDirs().map((d) => {
    try {
      return path.resolve(d).toLowerCase();
    } catch {
      return '';
    }
  });
  const sd = shimDir();
  if (sd && !dirs.includes(path.resolve(sd).toLowerCase())) {
    process.stdout.write(`  NOTE: ${sd} is not on your PATH.\n`);
    process.stdout.write('        Add it, then restart your shell:\n');
    process.stdout.write(`          export PATH="${sd}:$PATH"      # bash\n`);
    process.stdout.write(
      `          $env:Path = "${sd};$env:Path"   # PowerShell\n\n`
    );
  }
}

try {
  main();
} catch {
  // A postinstall that throws would fail the whole npm install. Never do that
  // for a cosmetic summary.
}
