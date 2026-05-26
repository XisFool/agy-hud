# agy-hud

[![E2E](https://github.com/icebear0828/agy-hud/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/icebear0828/agy-hud/actions/workflows/e2e.yml)
[![Release](https://img.shields.io/github/v/release/icebear0828/agy-hud)](https://github.com/icebear0828/agy-hud/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

> **Antigravity CLI (`agy`)** 的实时 statusline HUD 插件。每个 step 结束自动刷新，展示会话信息、Token 用量和**真实账号 Quota**（与 `/usage` 命令数据一致）。
>
> 每次 push 都会在 **macOS · Linux · Windows** 三平台 CI 矩阵跑 install + HUD 渲染验证——上面绿徽章 = 当前可用。

[English](./README.md)

---

## 显示效果

```
AGY-HUD │ ⎇ main │ ❖ Plan: Pro │ ⚡ Steps: 42 │ ✓ Tasks: 3
⚿ Tokens: 85.2k │ ⛁ Ctx: 85.2k/200.0k [████░░░░░░] │ 🤖 Model: Claude Sonnet 4.6
  ───────────────────────────────────────────────────────────────────────────
  Gem 3.5 Flash(H) [████░░]  60% ~3h │ Gem 3.5 Flash(M) [████░░]  60% ~3h
  Claude 4.6(Th)   [██████] 100% ~5h │ Claude Opus(Th)  [██████] 100% ~5h
  GPT-OSS 120B     [██████] 100% ~5h │
```

- **第一行**：分支、套餐、步骤数、任务数
- **第二行**：Token 用量、上下文进度条、当前模型
- **Quota 行**：每个模型的账号剩余额度 + 重置倒计时

---

## 安装

一条命令搞定（在普通 shell 里跑，**不要**在已打开的 `agy` 会话里跑）：

**macOS / Linux**：
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/install.sh)
```

**Windows PowerShell**：
```powershell
irm https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/install.ps1 | iex
```

**Windows CMD**：
```cmd
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/install.ps1 | iex"
```

这条命令会：
1. 干净地重装 plugin（`agy plugin uninstall` + `agy plugin install`）
2. 下载 HUD runtime 到 `~/.gemini/antigravity-cli/agy-hud-runtime/`
3. 把 `statusLine.command` 写进 `~/.gemini/antigravity-cli/settings.json`

新开一个 `agy` 会话，终端底部就是 HUD。

**幂等**——任何时候重跑同一命令都能修配置漂移、升级、清掉老版本残留。

### 为什么不只 `agy plugin install` 一步？

`agy plugin install` 只 stage **声明式** plugin marker（`plugin.json`），从不执行 JavaScript，也不动 `settings.json`。HUD 的 statusLine 命令和 renderer runtime 是另一层配置。`install.sh` 把这两件事一起做了。

### Fork / 镜像

**macOS / Linux**：
```bash
AGY_HUD_REPO_RAW=https://raw.githubusercontent.com/your-fork/agy-hud/main \
AGY_HUD_REPO_URL=https://github.com/your-fork/agy-hud.git \
  bash <(curl -fsSL "$AGY_HUD_REPO_RAW/scripts/install.sh")
```

**Windows PowerShell**：
```powershell
$env:AGY_HUD_REPO_RAW = 'https://raw.githubusercontent.com/your-fork/agy-hud/main'
$env:AGY_HUD_REPO_URL = 'https://github.com/your-fork/agy-hud.git'
irm "$env:AGY_HUD_REPO_RAW/scripts/install.ps1" | iex
```

### 手动 / 高级

如果你想分两步自己跑：

**macOS / Linux**：
```bash
agy plugin install https://github.com/icebear0828/agy-hud.git
bash <(curl -fsSL https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/bootstrap.sh)
```

**Windows PowerShell**：
```powershell
agy plugin install https://github.com/icebear0828/agy-hud.git
$t = Join-Path $env:TEMP "agy-hud-bootstrap.js"
Invoke-WebRequest -Uri https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/bootstrap.js -OutFile $t -UseBasicParsing
node $t; Remove-Item $t
```

**Windows CMD**：
```cmd
agy plugin install https://github.com/icebear0828/agy-hud.git
powershell -Command "Invoke-WebRequest -Uri https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/bootstrap.js -OutFile %TEMP%\agy-hud-bootstrap.js -UseBasicParsing"
node %TEMP%\agy-hud-bootstrap.js
del %TEMP%\agy-hud-bootstrap.js
```

---

## 验证

bootstrap 跑完后：

```bash
# settings.statusLine 应该指向 runtime
cat ~/.gemini/antigravity-cli/settings.json | grep statusLine -A2

# 直接调 HUD 命令应该输出 AGY-HUD 横幅
node ~/.gemini/antigravity-cli/agy-hud-runtime/runtime/bin/agy-hud.js
```

如果 quota 行显示 `Antigravity token expired`，刷新 `agy` 登录态即可，**不是** bootstrap 失败。

Windows PowerShell：

```powershell
Get-Content "$env:USERPROFILE\.gemini\antigravity-cli\settings.json"
& "$env:USERPROFILE\.gemini\antigravity-cli\agy-hud-runtime\runtime\bin\agy-hud.cmd"
```

---

## 诊断

```bash
# 查看 token + quota cache 状态
node scripts/diagnose-auth.js

# 看 agy 自己的 statusLine runner 报错
ls -t ~/.gemini/antigravity-cli/log/cli-*.log | head -1 | xargs tail -50 | grep statusline
```

最常见的故障：`statusline_runner.go: failure N/30` —— 表示 `settings.json` 的 `statusLine.command` 指向的路径不存在了。重跑 bootstrap 即可。

---

## 卸载

**macOS / Linux**：
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/icebear0828/agy-hud/main/uninstall.sh)
```

**Windows PowerShell**：
```powershell
irm https://raw.githubusercontent.com/icebear0828/agy-hud/main/uninstall.ps1 | iex
```

**Windows CMD**：
```cmd
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/icebear0828/agy-hud/main/uninstall.ps1 | iex"
```

如果有 clone 仓库也可以直接跑：`bash uninstall.sh` / `.\uninstall.ps1`。

会做：
1. 清掉 `settings.json` `statusLine`（保留 `.bak` 备份）
2. 删 `~/.gemini/antigravity-cli/agy-hud-runtime/`
3. 卸 plugin (`agy plugin uninstall agy-hud`)
4. 清 tmp token 镜像 / quota cache

---

## 配置（可选）

在工作目录创建 `agy-hud.config.json` 可覆盖默认。不创建就用下载下来的 `runtime/agy-hud.config.json`：

```json
{
  "display": {
    "useNerdFonts": false,
    "columnWidth": 37
  },
  "thresholds": {
    "warning": 0.7,
    "critical": 0.9
  },
  "theme": {
    "warning": "yellow",
    "critical": "red"
  }
}
```

---

## 目录结构

```
agy-hud/
├── plugin.json                # {"name":"agy-hud"} — agy plugin marker
├── gemini-extension.json      # agy 远程安装验证器强制要求
├── runtime/                   # bootstrap 下载到 ~/.gemini/.../agy-hud-runtime/runtime/
│   ├── bin/agy-hud.js         # statusLine 入口（stdin JSON → ANSI HUD）
│   ├── quota.js               # fetchAvailableModels 客户端（与 /usage 对账）
│   ├── statusline-installer.js
│   ├── uninstall.js
│   └── ...
├── scripts/
│   ├── install.sh             # 一行安装入口 — macOS/Linux
│   ├── install.ps1            # 一行安装入口 — Windows PowerShell
│   ├── bootstrap.sh           # 修复用入口（被 install.sh 调用）
│   ├── bootstrap.js           # 实际下载 + 配置逻辑
│   ├── verify-display.js      # E2E：install + bootstrap + PTY 起 agy + 断言 HUD
│   └── diagnose-auth.js
├── tests/unit/                # node --test
├── .github/workflows/e2e.yml  # 跨平台 CI 矩阵
└── release.sh                 # npm test → E2E gate → zip → gh release
```

---

## 跨平台

**Windows token 刷新**：Antigravity CLI 把 OAuth `refresh_token` + `access_token` 存在 Credential Manager（`gemini:antigravity` / `LegacyGeneric:target=gemini:antigravity`）。HUD 优先用 tmp 里的 `agy-hud-token.json` 短期镜像。fast path 只看到缺失/过期文件 token 时，会触发 detached 后台读取，下一次渲染用刷过的 token。agy-hud **不会** 用 RT 换 access token——如果 Credential Manager 里的 access token 也过期，需要先刷 agy 登录态。

**文件 token 回退路径**（按顺序搜索）：
- `~/.gemini/antigravity-cli/antigravity-oauth-token`
- `$XDG_DATA_HOME/antigravity-cli/antigravity-oauth-token`
- `$APPDATA/antigravity-cli/antigravity-oauth-token`
- `$LOCALAPPDATA/antigravity-cli/antigravity-oauth-token`

---

## CI 验证

每次 push 到 `main` 都会跑 [.github/workflows/e2e.yml](./.github/workflows/e2e.yml) 的 3-OS 矩阵：

| OS | install.sh 跑通 | bootstrap 写 settings.json | HUD 命令输出 `AGY-HUD` |
|----|------|------|------|
| ubuntu-latest | ✅ | ✅ | ✅ |
| macos-latest  | ✅ | ✅ | ✅ |
| windows-latest | ✅ | ✅ | ✅ |

每次 run 上传（保留 14 天）：

| Artifact | OS | 内容 |
|---|---|---|
| `e2e-<os>` | 全 3 个 | `e2e-report.json`（诊断：`ok` / `hudVisible` / `staleCleaned` 等）+ `agy-hud-pty-*.log`（带 ANSI 颜色的原始字节——`cat` 这文件就能在终端看到带色的 HUD） |
| `hud-screenshot-<os>` | ubuntu + macos | `hud-ascii-<os>.png` + `hud-unicode-<os>.png`，用 [charm.sh `freeze`](https://github.com/charmbracelet/freeze) 渲。PNG 可视化证据——下载用图片查看器打开 |

CI 跑的是 **no-auth 模式**：断言独立 HUD 命令输出横幅。"在真 agy 会话里看见 HUD" 这一层在 dev 机器（有真 OAuth）由 `release.sh` 内置 E2E gate 跑。

---

## 已知问题

- **Windows PNG 截图**：CI 每次 run 都用 [charm.sh `freeze`](https://github.com/charmbracelet/freeze) 给 macOS + Linux 上传 `hud-ascii-*.png` 和 `hud-unicode-*.png`。Windows 跳过——`freeze v0.2.2` 在所有调用方式（positional 文件路径、`--execute`、`.WriteAllText` 写 UTF-8 文件）下都报 `No input`，是上游 Windows-only bug。Windows reviewer 仍能从 `e2e-windows-latest` artifact 里拿到带 ANSI 颜色的原始字节（`cat` 一下就能看到带色 HUD）

> **Windows 用户提示**：HUD 会自动检测你当前终端的 active codepage。如果是非 UTF-8 的 codepage（如 `cp936` (GBK) 或 `cp1252`），进度条会自动 fallback 到 ASCII 字符（显示为 `#` 号），以防字符集不匹配导致终端排版错乱。
>
> 如果你在非 UTF-8 的 codepage 下强行开启 Unicode 渲染（例如在配置中将 `display.unicode` 设为 `true`），则有可能会在终端看到乱码或 `?` 替换字符。
>
> **如何在 Windows 下启用漂亮的 Unicode 进度条与框线：**
> 1. **当前会话生效（推荐）**：在打开 `agy` 之前，先在 CMD / PowerShell 窗口里跑一次 `chcp 65001` 命令。
> 2. **全局系统级 UTF-8 生效（永久）**：
>    - 打开 Windows 设置 -> **时间和语言** -> **语言&区域** -> **管理语言设置** (Administrative language settings)。
>    - 点击 **更改系统区域设置** (Change system locale)。
>    - 勾选 **“测试版: 使用 Unicode UTF-8 提供全球语言支持”** (Beta: Use Unicode UTF-8 for worldwide language support) 并重启电脑。
>    - 此操作会强制所有 Windows 控制台/终端原生以 UTF-8 (`cp65001`) 编码工作。

---

## License

MIT
