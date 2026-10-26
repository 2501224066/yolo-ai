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

Git Bash、PowerShell、cmd.exe、zsh、bash 全都能用。**不改 PATH、不改 shell rc、
不改任何 profile** —— shim 完全靠 PATH 查找生效。

## 用法

```
yolo <agent> [args...]        用该 agent 的跳过权限参数运行它
yolo --list                   列出支持的 agent 及安装情况
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

## 支持的 agent

| `yolo` 命令 | 实际执行 |
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

`yolo --list` 会显示你机器上装了哪些。

### 添加 agent

在 `lib/registry.js` 里加一行：

```js
myagent: { flag: '--the-real-flag', probe: ['--version'] },
```

`flag` 会插在你的参数前面；`probe` 用于确认该工具已安装且可运行。

### 优先级说明

部分 agent 的 `--auto` / `--yolo` 语义是"把原本要询问的改为允许"，而该 agent
自己配置里的显式 deny 规则仍然生效。在同时支持多种写法的 agent 上，`yolo` 会
选用其中权限最宽的那个参数。

## 安全

`--dry-run` 会打印完整命令行但不执行，方便你确认某次调用到底会跑什么：

```bash
$ yolo --dry-run opencode
bash "C:\Program Files\nodejs\opencode" --auto
```

对于支持沙箱的 agent，可以把它自己的沙箱参数和 `yolo` 一起用 —— 这样既免去
审批，又不必放开文件系统权限。

## 工作原理

`package.json` 里只声明一个 `bin` 条目。npm 会为它生成三个 shim —— `yolo`（sh）、
`yolo.cmd`、`yolo.ps1` —— 所以每个 shell 都能在 PATH 上找到它。**不依赖任何
shell profile 被加载**，而这正是手写包装函数悄悄失效的常见原因。

运行时 `yolo` 在 PATH 上定位 agent，把参数插到最前面，然后交出自己的终端
（`stdio: 'inherit'`），让交互式 TUI 保持键盘输入和颜色正常。退出码和 Ctrl+C
都会转发给子进程。

Windows 相关处理都在 `lib/exec.js`：

- `.cmd` / `.bat` 目标经 `cmd.exe /c` 启动
- 无扩展名的 npm sh shim 经 `bash` 启动
- `.ps1` 目标经 `powershell -File` 启动

## 从手写包装函数迁移

如果你之前有 `agy()` shell 函数或 `agy-yolo.cmd`，这个包取代它们。那些可以删掉：

- `~/.bashrc` —— `agy()` 和 `agy-yolo()` 两个函数
- `Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` 和
  `Documents\PowerShell\Microsoft.PowerShell_profile.ps1` —— `function agy`
- `~/.local/bin/agy-yolo.cmd`

本包不会替你动这些文件。

## 许可证

MIT
