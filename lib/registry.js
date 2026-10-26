'use strict';

// Agent registry: name -> the real "skip all permission prompts" flag.
//
// RULE: only add an entry whose flag has been confirmed against that tool's own
// `--help` output from a real install. A guessed flag is worse than no entry:
//   - some tools reject unknown flags outright (codex: "unexpected argument")
//   - others silently ignore them and just run normally (opencode), so a wrong
//     entry looks like it works while skipping nothing
//   - `--version` often short-circuits argument parsing entirely, so it can
//     never be used to prove a flag exists
//
//   flag  : inserted as the first argument, before whatever the user typed
//   probe : command used to confirm the tool is really installed and runnable
//   native: true when the tool already spells this flag `--yolo`
//
// Agents deliberately NOT listed, with reasons, so nobody re-adds them blind:
//   amp     - no CLI flag; permissive by default. Restriction is via policy
//             plugins, and the only related key is `amp.dangerouslyAllowAll`
//             in config. Verified: `amp --help` has no Options entries.
//   copilot - `@github/copilot` exists and `--yolo` is real, but GitHub's own
//             docs note enterprise policy (permissions.disableBypassPermissionsMode)
//             can suppress it at startup, so it may silently do nothing on a
//             managed device. Left out until that can be detected.
//   cursor  - the official CLI installs as `agent` via a curl/PowerShell
//             installer. npm `cursor-agent` has no `bin` field and is not it.
//   goose   - Block's agent is a Go binary, not on npm. npm `goose-cli` is an
//             unrelated database migration tool ("goose postgres ... status").
//             The real agent has no flag anyway: it is GOOSE_MODE=auto, and
//             autonomous is already the default.
//   grok    - npm `@vibe-kit/grok-cli` is a third-party wrapper; its `--help`
//             lists no permission flag at all.
//   kimi    - no such npm package (npm `kimi-cli` is an unrelated front-end
//             tool generator).
//   mcode   - no npm package found; MiniMax's `/permission full` is an in-TUI
//             slash command, which cannot be passed as an argument.
//   pi      - needs a third-party plugin plus an in-session slash command.
//   copilot-shim / continue (bare) - on Windows, `copilot` may resolve to a VS
//             Code shim and `continue` is the Bash builtin for loop control.
//             Neither is an agent; both are excluded by the name check above.

module.exports = {
  claude: {
    // Verified: `claude --help` lists it. Docs describe it as equivalent to
    // `--permission-mode bypassPermissions`.
    flag: '--dangerously-skip-permissions',
    probe: ['--version'],
  },
  agy: {
    flag: '--dangerously-skip-permissions',
    probe: ['--version'],
  },
  codex: {
    // Verified against `codex --help`. Codex also *accepts* an undocumented
    // `--yolo` alias, but it appears in no help output and no bundled string,
    // so it could disappear in any release. Ship the documented flag.
    flag: '--dangerously-bypass-approvals-and-sandbox',
    probe: ['--version'],
  },
  gemini: {
    // Verified: `gemini --help` lists `-y, --yolo`. The newer
    // `--approval-mode=yolo` also exists, but the shipped binary marks neither
    // as deprecated, and --yolo is shorter. (Some repo docs on main branch
    // describe --yolo as deprecated; that is ahead of the released version.)
    flag: '--yolo',
    probe: ['--version'],
    native: true,
  },
  qwen: {
    // Verified: `qwen --help` lists `-y, --yolo`. Same note as gemini re:
    // `--approval-mode=yolo`. Caveat from the docs: --yolo does not enable a
    // sandbox, so shell commands run at process privilege level.
    flag: '--yolo',
    probe: ['--version'],
    native: true,
  },
  crush: {
    // Verified: `crush --help` lists `-y --yolo`.
    flag: '--yolo',
    probe: ['--version'],
    native: true,
  },
  opencode: {
    // NOT --yolo: opencode has no such flag. An unknown flag is silently
    // ignored (it just prints help for a subcommand), so a wrong entry here
    // would appear to work while quietly not skipping anything.
    // Verified: `opencode --help` lists --auto as
    // "auto-approve permissions that are not explicitly denied (dangerous!)".
    // Partial bypass only: explicit deny rules still apply.
    flag: '--auto',
    probe: ['--version'],
  },
  cn: {
    // Continue's CLI. Binary is `cn` (npm @continuedev/cli), NOT `continue`.
    // Verified: `cn --help` lists --auto as "Start in auto mode (all tools
    // allowed)". The docs also show `--allow "*"`; --auto is the cleaner form.
    flag: '--auto',
    probe: ['--version'],
  },
  aider: {
    // NOT verified against a real install (aider is a Python package, not on
    // npm). Kept from the original hand-written config; confirm with
    // `aider --help` before trusting it.
    flag: '--yes-always',
    probe: ['--version'],
  },
};
