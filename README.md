# yolo-ai

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

## Registered agents

| agent | flag |
|---|---|
| `claude` | `--dangerously-skip-permissions` |
| `agy` | `--dangerously-skip-permissions` |
| `codex` | `--dangerously-bypass-approvals-and-sandbox` |
| `gemini` | `--yolo` (native) |
| `aider` | `--yes-always` |
| `opencode` | `--yolo` (native) |

Only agents that are actually on your PATH are usable; `yolo --list` shows which.

**Entries are only added after confirming the flag against that tool's own
`--help` output.** A guessed flag fails outright, which is worse than not being
registered at all. If you have an agent installed whose flag isn't listed here,
run `<agent> --help` and add it to `lib/registry.js`:

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
