'use strict';

const registry = require('./registry');
const { detectAll } = require('./detect');

const NAME = 'yolo';

const USAGE = `
${NAME} — run any AI agent CLI with its permission prompts skipped.

Usage:
  ${NAME} <agent> [args...]     Run <agent> with its skip-permissions flag
  ${NAME} --list                Show registered agents and what is installed
  ${NAME} --agents              Alias for --list
  ${NAME} --dry-run <agent> ... Print the command instead of running it
  ${NAME} --help                Show this message
  ${NAME} --version             Show version

Examples:
  ${NAME} claude
  ${NAME} claude -p "explain this repo"
  ${NAME} agy --model opus
  ${NAME} --dry-run claude -p hi

Agents:
${Object.entries(registry)
  .map(([k, v]) => `  ${k.padEnd(10)} ${v.flag}${v.native ? '  (native)' : ''}`)
  .join('\n')}

This is dangerous by design: the agent will run commands without asking.
`.trimStart();

function listAgents() {
  const rows = detectAll();
  const width = Math.max(...rows.map((r) => r.name.length), 5);

  process.stdout.write('Registered agents:\n\n');
  for (const r of rows) {
    const mark = r.installed ? '✓' : '·';
    const state = r.installed ? 'installed' : `not found${r.reason ? ` (${r.reason})` : ''}`;
    process.stdout.write(`  ${mark} ${r.name.padEnd(width)}  ${state}\n`);
    if (r.installed) {
      process.stdout.write(`    ${''.padEnd(width)}  ${r.exe}\n`);
      process.stdout.write(`    ${''.padEnd(width)}  + ${r.flag}\n`);
    }
  }

  const n = rows.filter((r) => r.installed).length;
  process.stdout.write(`\n${n} of ${rows.length} agents usable.\n`);
  return 0;
}

module.exports = { USAGE, listAgents, NAME };
