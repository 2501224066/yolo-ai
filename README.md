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

Works in Git Bash, PowerShell, cmd.exe, zsh and bash. No PATH edits, no shell rc
edits, no profile edits — the shims resolve through PATH lookup alone.

## Usage

```
yolo <agent> [args...]        Run <agent> with its skip-permissions flag
yolo --list                   List supported agents and what is installed
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

## Supported agents

| `yolo` command | runs |
|---|---|
| `yolo claude` | `claude --dangerously-skip-permissions` |
| `yolo agy` | `agy --dangerously-skip-permissions` |
| `yolo codex` | `codex --dangerously-bypass-approvals-and-sandbox` |
| `yolo gemini` | `gemini --yolo` |
| `yolo qwen` | `qwen --yolo` |
| `yolo crush` | `crush --yolo` |
| `yolo opencode` | `opencode --auto` |
| `yolo cn` | `cn --auto` |
| `yolo aider` | `aider --yes-always` |

`yolo --list` shows which are installed on your machine.

### Adding an agent

Add one line to `lib/registry.js`:

```js
myagent: { flag: '--the-real-flag', probe: ['--version'] },
```

`flag` is inserted before your arguments; `probe` is how the tool confirms it is
installed and runnable.

### Precedence

Some agents treat `--auto` / `--yolo` as *allow what would otherwise be asked*,
while explicit deny rules in that agent's own config still apply. Where an agent
supports both, `yolo` emits the flag that grants the widest permissions it
offers.

## Safety

`--dry-run` prints the exact command line without executing it, so you can
confirm what a `yolo` invocation will do:

```bash
$ yolo --dry-run opencode
bash "C:\Program Files\nodejs\opencode" --auto
```

For agents that support a sandbox, combine `yolo` with the agent's own sandbox
flag if you want unrestricted approvals without unrestricted filesystem access.

## How it works

`package.json` declares a single `bin` entry. npm generates three shims for it —
`yolo` (sh), `yolo.cmd`, `yolo.ps1` — so every shell finds it on PATH. Nothing
depends on a shell profile being loaded, which is the usual reason a
hand-written wrapper function silently stops working.

At run time `yolo` resolves the agent on PATH, prepends its flag, and hands over
the terminal (`stdio: 'inherit'`) so interactive TUIs keep their keyboard input
and colour. Exit codes and Ctrl+C are forwarded to the child.

Windows specifics handled in `lib/exec.js`:

- `.cmd` / `.bat` targets are launched through `cmd.exe /c`
- extensionless npm sh shims are launched through `bash`
- `.ps1` targets are launched through `powershell -File`

## Migrating from a hand-written wrapper

If you previously had an `agy()` shell function or an `agy-yolo.cmd`, this
replaces it. Those can be deleted:

- `~/.bashrc` — the `agy()` and `agy-yolo()` functions
- `Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` and
  `Documents\PowerShell\Microsoft.PowerShell_profile.ps1` — `function agy`
- `~/.local/bin/agy-yolo.cmd`

This package does not touch those files for you.

## License

MIT
