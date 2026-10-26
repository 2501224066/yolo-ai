#!/usr/bin/env node
'use strict';

const registry = require('../lib/registry');
const { resolveAgent } = require('../lib/detect');
const { launch } = require('../lib/exec');
const { USAGE, listAgents } = require('../lib/usage');

const pkg = require('../package.json');

function fail(msg) {
  process.stderr.write(`yolo: ${msg}\n`);
  return 1;
}

async function main(argv) {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    process.stdout.write(USAGE);
    return args.length === 0 ? 1 : 0;
  }

  if (args[0] === '--version' || args[0] === '-v') {
    process.stdout.write(`${pkg.version}\n`);
    return 0;
  }

  if (args[0] === '--list' || args[0] === '--agents') {
    return listAgents();
  }

  let dryRun = false;
  let rest = args;
  if (rest[0] === '--dry-run' || rest[0] === '-n') {
    dryRun = true;
    rest = rest.slice(1);
  }

  const name = rest[0];
  if (!name) return fail('missing agent name. Try `yolo --list`.');

  if (name.startsWith('-')) {
    return fail(`expected an agent name, got the flag \`${name}\`. Try \`yolo --list\`.`);
  }

  const entry = registry[name];
  if (!entry) {
    const known = Object.keys(registry).join(', ');
    return fail(`unknown agent \`${name}\`.\n       registered agents: ${known}`);
  }

  const exe = resolveAgent(name);
  if (!exe) {
    return fail(
      `\`${name}\` is registered but not on PATH.\n` +
        `       install it first, or run \`yolo --list\` to see what is available.`
    );
  }

  const passthrough = rest.slice(1);
  return launch(exe, [entry.flag, ...passthrough], { dryRun });
}

main(process.argv)
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`yolo: ${err && err.stack ? err.stack : err}\n`);
    process.exit(1);
  });
