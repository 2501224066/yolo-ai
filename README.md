# yolo-ai

English | [中文](README.zh-CN.md)

One `yolo` prefix for every AI agent CLI's "skip the permission prompts" flag.

```bash
yolo claude                 # claude --dangerously-skip-permissions
yolo agy --model opus       # agy    --dangerously-skip-permissions --model opus
yolo codex                  # codex  --dangerously-bypass-approvals-and-sandbox
```

Every agent spells it differently and the flags are unmemorable. This package
remembers them for you.

> **Dangerous by design.** These flags let the agent run commands — including
> deleting files, pushing commits, installing packages — without asking. Use it
> where you'd be comfortable running the agent unsupervised.

## Install

```bash
npm install -g yolo-ai
```

The install prints which agents it found. No PATH edits, no shell rc edits, no
PowerShell profile edits — the shims work through PATH lookup alone.

## Usage

```
yolo <agent> [args...]        Run <agent> with its skip-permissions flag
yolo --list                   Show registered agents and what is installed
yolo --dry-run <agent> ...    Print the command instead of running it
yolo --help
yolo --version
```

Arguments are passed through untouched, so interactive and non-interactive use
both work:

```bash
yolo claude                          # interactive TUI
yolo claude -p "explain this repo"   # one-shot, prints and exits
yolo claude --continue               # any flag the agent supports
```

Not sure what it will run? `--dry-run` prints the exact command line:

```bash
$ yolo --dry-run claude -p "1+1"
bash "C:\Program Files\nodejs\claude" --dangerously-skip-permissions -p 1+1
```

## All commands

| yolo command | actually runs | verified |
|---|---|---|
| `yolo claude` | `claude --dangerously-skip-permissions` | yes |
| `yolo agy` | `agy --dangerously-skip-permissions` | yes |
| `yolo codex` | `codex --dangerously-bypass-approvals-and-sandbox` | yes |
| `yolo gemini` | `gemini --yolo` | yes |
| `yolo qwen` | `qwen --yolo` | yes |
| `yolo crush` | `crush --yolo` | yes |
| `yolo opencode` | `opencode --auto` | yes |
| `yolo cn` | `cn --auto` | yes |
| `yolo aider` | `aider --yes-always` | **no** — Python package, not checked |

Check any of them without running it:

```bash
$ yolo --dry-run opencode
bash "C:\Program Files\nodejs\opencode" --auto
```

Only agents that are actually on your PATH are usable; `yolo --list` shows which.

### Not every "yolo" is a total bypass

Four of these convert *ask* into *allow* but still honor explicit **deny** rules,
so "yolo" is not literally true for them:

- `opencode --auto`
- `cn --auto`
- `gemini --yolo` / `qwen --yolo` — and per Qwen's docs, `--yolo` does **not**
  enable a sandbox, so shell commands run at process privilege level

### Why flags are verified rather than guessed

A guessed flag is worse than no entry, and there are two distinct ways it fails:

- Some tools reject unknown flags outright — `codex` prints
  `error: unexpected argument '--totally-bogus' found`.
- Others **silently ignore** them — `opencode` accepts an unknown flag and runs
  normally, so a wrong entry looks like it works while skipping nothing.

`--version` usually short-circuits argument parsing, so it can never be used to
prove a flag exists. Check `--help`, or a parsing subcommand.

### Agents deliberately not listed

| agent | why not |
|---|---|
| `amp` | No CLI flag. Permissive by default; restriction is via policy plugins. |
| `copilot` | `--yolo` is real, but GitHub's enterprise policy can suppress it at startup, so it may silently do nothing on a managed device. |
| `cursor` | Official CLI installs as `agent` via a curl/PowerShell installer. npm `cursor-agent` has no `bin` field and is not it. |
| `goose` | Block's agent is a Go binary, not on npm. npm `goose-cli` is an unrelated database migration tool. The real agent has no flag anyway — it's `GOOSE_MODE=auto`, and autonomous is already the default. |
| `grok` | npm `@vibe-kit/grok-cli` is a third-party wrapper; its `--help` lists no permission flag. |
| `kimi` | No such npm package — npm `kimi-cli` is an unrelated front-end tool generator. |
| `mcode` | No npm package found. MiniMax's `/permission full` is an in-TUI slash command, which can't be passed as an argument. |
| `pi` | Needs a third-party plugin plus an in-session slash command; not expressible as a flag. |

Two names that look like agents but are not, and are excluded automatically:
`continue` on PATH is the **Bash builtin** for loop control, and `copilot` may
resolve to VS Code's shim that just prints "not found".

If you have an agent installed whose flag isn't listed, run `<agent> --help`
and add it to `lib/registry.js`:

```js
myagent: { flag: '--the-real-flag', probe: ['--version'] },
```

## How it works

`package.json` declares a single `bin` entry. npm generates three shims for it —
`yolo` (sh), `yolo.cmd`, `yolo.ps1` — so Git Bash, cmd.exe and PowerShell all
find it on PATH. Nothing depends on a shell profile being loaded, which is the
usual reason a hand-written wrapper function silently stops working.

At run time `yolo` resolves the agent on PATH, prepends its flag, and hands over
the terminal (`stdio: 'inherit'`) so interactive TUIs keep their keyboard input
and colour. Exit codes and Ctrl+C are forwarded to the child.

Two Windows details worth knowing, both handled in `lib/exec.js`:

- Node refuses to spawn `.cmd` / `.bat` directly (EINVAL, since the
  CVE-2024-27980 fix) — those go through `cmd.exe /c`.
- npm's extensionless sh shims (what `claude` is) can't be spawned by Node at
  all (ENOENT) — those go through `bash`.

## Migrating from a hand-written wrapper

If you previously had an `agy()` shell function or an `agy-yolo.cmd`, this
replaces it. Delete them when you're ready:

- `~/.bashrc` — the `agy()` and `agy-yolo()` functions
- `Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` and
  `Documents\PowerShell\Microsoft.PowerShell_profile.ps1` — `function agy`
- `~/.local/bin/agy-yolo.cmd`

This package deliberately does not touch any of those for you.

## License

MIT
