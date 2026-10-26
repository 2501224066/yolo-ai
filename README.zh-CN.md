# yolo-ai

[English](README.md) | 中文

用一个 `yolo` 前缀，统一所有 AI agent CLI 的"跳过权限确认"参数。

```bash
yolo claude                 # claude --dangerously-skip-permissions
yolo agy --model opus       # agy    --dangerously-skip-permissions --model opus
yolo codex                  # codex  --dangerously-bypass-approvals-and-sandbox
```

每个 agent 的写法都不一样，这些参数又长又难记。这个包替你记住它们。

> **设计上就是危险的。** 这些参数会让 agent 不经询问就执行命令 —— 包括删文件、
> push 提交、装包。请只在你能接受 agent 无人监督运行的环境里使用。

## 安装

```bash
npm install -g yolo-ai
```

安装时会打印检测到哪些 agent。**不改 PATH、不改 shell rc、不改 PowerShell
profile** —— shim 完全靠 PATH 查找生效。

## 用法

```
yolo <agent> [args...]        用该 agent 的跳过权限参数运行它
yolo --list                   列出已注册的 agent 及安装情况
yolo --dry-run <agent> ...    只打印命令，不执行
yolo --help
yolo --version
```

参数原样透传，所以交互式和非交互式都能用：

```bash
yolo claude                          # 交互式 TUI
yolo claude -p "解释一下这个仓库"      # 一次性执行，打印后退出
yolo claude --continue               # 该 agent 支持的任何参数
```

不确定会执行什么？`--dry-run` 会打印出完整命令行：

```bash
$ yolo --dry-run claude -p "1+1"
bash "C:\Program Files\nodejs\claude" --dangerously-skip-permissions -p 1+1
```

## 全部命令

| yolo 命令 | 实际执行 | 已验证 |
|---|---|---|
| `yolo claude` | `claude --dangerously-skip-permissions` | 是 |
| `yolo agy` | `agy --dangerously-skip-permissions` | 是 |
| `yolo codex` | `codex --dangerously-bypass-approvals-and-sandbox` | 是 |
| `yolo gemini` | `gemini --yolo` | 是 |
| `yolo qwen` | `qwen --yolo` | 是 |
| `yolo crush` | `crush --yolo` | 是 |
| `yolo opencode` | `opencode --auto` | 是 |
| `yolo cn` | `cn --auto` | 是 |
| `yolo aider` | `aider --yes-always` | **否** —— Python 包，未验证 |

不执行也能自查任意一条：

```bash
$ yolo --dry-run opencode
bash "C:\Program Files\nodejs\opencode" --auto
```

只有在 PATH 上的 agent 才可用；`yolo --list` 会显示哪些可用。

### 不是每个 "yolo" 都是完全放行

其中四个只是把 *ask* 变成 *allow*，显式 **deny** 规则仍然生效，所以对它们来说
"yolo" 字面上并不成立：

- `opencode --auto`
- `cn --auto`
- `gemini --yolo` / `qwen --yolo` —— 且据 Qwen 文档，`--yolo` **不启用沙箱**，
  shell 命令会以进程权限级别执行

### 为什么参数是验证过的而不是猜的

猜错的参数比不收录更糟，而且有两种截然不同的失败方式：

- 有些工具会直接拒绝未知参数 —— `codex` 会打印
  `error: unexpected argument '--totally-bogus' found`。
- 另一些会**静默忽略** —— `opencode` 接受未知参数并照常运行，所以错误的条目
  看着像能用，实际什么都没跳过。

`--version` 通常会短路参数解析，所以**不能用它来证明某个参数存在**。请查
`--help`，或用带解析的子命令。

### 有意不收录的 agent

| agent | 原因 |
|---|---|
| `amp` | 没有 CLI 参数。默认就是全放行；限制靠 policy 插件。 |
| `copilot` | `--yolo` 是真的，但 GitHub 的企业策略可在启动时压制它，托管设备上可能静默失效。 |
| `cursor` | 官方 CLI 通过 curl/PowerShell 安装器装出来叫 `agent`。npm 上的 `cursor-agent` 没有 `bin` 字段，不是它。 |
| `goose` | Block 的 agent 是 Go 二进制、不在 npm。npm 上的 `goose-cli` 是无关的数据库迁移工具。真 agent 也没参数 —— 它是 `GOOSE_MODE=auto`，而默认就已经是 autonomous。 |
| `grok` | npm `@vibe-kit/grok-cli` 是第三方包装；其 `--help` 里没有任何权限参数。 |
| `kimi` | 没有这个 npm 包 —— npm `kimi-cli` 是个无关的前端工具生成器。 |
| `mcode` | 找不到 npm 包。MiniMax 的 `/permission full` 是 TUI 内斜杠命令，传不进去。 |
| `pi` | 需要第三方插件加会话内斜杠命令，无法表达为参数。 |

有两个名字看起来像 agent 其实不是，已自动排除：PATH 上的 `continue` 是
**Bash 内置**的循环控制语句，`copilot` 可能指向 VS Code 的 shim（只打印
"not found"）。

如果你装的 agent 不在表里，跑 `<agent> --help` 然后加进 `lib/registry.js`：

```js
myagent: { flag: '--the-real-flag', probe: ['--version'] },
```

## 工作原理

`package.json` 里只声明一个 `bin` 条目。npm 会为它生成三个 shim —— `yolo`（sh）、
`yolo.cmd`、`yolo.ps1` —— 所以 Git Bash、cmd.exe、PowerShell 都能在 PATH 上找到它。
**不依赖任何 shell profile 被加载**，而这正是手写包装函数悄悄失效的常见原因。

运行时 `yolo` 在 PATH 上定位 agent，把参数插到最前面，然后交出自己的终端
（`stdio: 'inherit'`），让交互式 TUI 保持键盘输入和颜色正常。退出码和 Ctrl+C
都会转发给子进程。

两个 Windows 细节值得知道，都在 `lib/exec.js` 里处理了：

- Node 拒绝直接 spawn `.cmd` / `.bat`（EINVAL，CVE-2024-27980 修复后的行为）
  —— 这些走 `cmd.exe /c`。
- npm 生成的**无扩展名** sh shim（`claude` 就是）Node 根本 spawn 不了
  （ENOENT）—— 这些走 `bash`。

## 从手写包装函数迁移

如果你之前有 `agy()` shell 函数或 `agy-yolo.cmd`，这个包取代它们。可以删掉：

- `~/.bashrc` —— `agy()` 和 `agy-yolo()` 两个函数
- `Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` 和
  `Documents\PowerShell\Microsoft.PowerShell_profile.ps1` —— `function agy`
- `~/.local/bin/agy-yolo.cmd`

本包**有意不替你动**这些文件。

## 许可证

MIT
