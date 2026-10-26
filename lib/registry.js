'use strict';

// Agent registry: name -> the real "skip all permission prompts" flag.
//
// RULE: only add an entry whose flag has been confirmed against that tool's own
// `--help` output. A guessed flag is worse than no entry — the command fails
// outright instead of degrading to a normal prompt.
//
//   flag  : inserted as the first argument, before whatever the user typed
//   probe : command used to confirm the tool is really installed and runnable
//   native: true when the tool already calls this flag `--yolo` (nothing to map)

module.exports = {
  claude: {
    flag: '--dangerously-skip-permissions',
    probe: ['--version'],
  },
  agy: {
    flag: '--dangerously-skip-permissions',
    probe: ['--version'],
  },
  codex: {
    flag: '--dangerously-bypass-approvals-and-sandbox',
    probe: ['--version'],
  },
  gemini: {
    flag: '--yolo',
    probe: ['--version'],
    native: true,
  },
  aider: {
    flag: '--yes-always',
    probe: ['--version'],
  },
  opencode: {
    flag: '--yolo',
    probe: ['--version'],
    native: true,
  },
};
