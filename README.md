# agy-hud

> **Antigravity CLI (agy)** 的实时状态 HUD 插件 —— 在每个步骤完成后自动刷新状态栏，展示会话信息、Token 用量和**真实账号 Quota**。

---

## 功能展示

```
 AGY-HUD  ⎇ main | Plan: Pro | Steps: 42  Tasks: 3
 Tokens: 85.2k/12.1k | Ctx: 85.2k/200.0k [████░░░░░░] | Model: Claude Sonnet 4.6

  Gemini 3.5 Flash (Hig… [█████░░░] 60% ~30m  |  Gemini 3.5 Flash (Med… [█████░░░] 60% ~30m
  Claude Sonnet 4.6 (Th… [███░░░░░] 40% ~4h 2m  |  Claude Opus 4.6 (Thin… [███░░░░░] 40% ~4h 2m
  GPT-OSS 120B (Medium) [███░░░░░] 40% ~4h 2m
```

**第一行**：项目分支、套餐、执行步骤数、Task 数  
**第二行**：Token 消耗、上下文窗口使用率进度条、当前模型  
**Quota 行**：每个模型的账号剩余额度（与 `/usage` 命令数据完全一致）+ 重置倒计时

---

## 安装

### 方式一：Git URL + setup skill（推荐）

两步安装，和 `claude-hud` 的 setup command 模式一致：

```bash
agy plugin install https://github.com/icebear0828/agy-hud.git
```

然后打开 `agy`，让它运行已导入的 setup skill：

```text
Use the agy-hud setup skill to configure AGY-HUD.
```

setup skill 会下载 runtime 到 `~/.gemini/antigravity-cli/agy-hud-runtime`，写入 `settings.statusLine`，并尝试预热 Quota cache。完成后重开一个新的 `agy` 会话，终端输出应包含 `AGY-HUD`。

验收标准是：`agy plugin install` 成功导入 skill，setup skill 成功写入 `settings.statusLine`，并且新 `agy` 会话能看到 `AGY-HUD`。不能把组件导入成功当成 HUD 安装成功。

> 当前状态：实测 `agy` 1.0.0/1.0.1 的远程插件安装会导入 skills/agents，特定 `hooks/hooks.json` 也会被 staging；`rules`、`commands`、`pi: "extensions/index.js"` 和 `pi.extensions` 不会被处理。这些组件不会自动执行 `extensions/index.js`，不会导入根 `settings.json`，也不会在首次启动前写入 `settings.statusLine`。因此本项目采用 setup skill 两步安装；不要把 `[ok]` 或组件导入视为 HUD 安装成功。

### 安装后手动确认

1. 确认插件导入成功：

```bash
agy plugin list
```

输出里应该有 `agy-hud`，并且 `components` 包含 `skills`。

2. 确认 setup 写入了状态栏配置：

macOS / Linux:

```bash
cat ~/.gemini/antigravity-cli/settings.json
```

Windows PowerShell:

```powershell
Get-Content "$env:USERPROFILE\.gemini\antigravity-cli\settings.json"
```

其中应该包含 `statusLine.command`，并指向 `agy-hud-runtime`。

3. 直接运行 HUD 命令，确认命令本身可用：

macOS / Linux:

```bash
node ~/.gemini/antigravity-cli/agy-hud-runtime/extensions/bin/agy-hud.js
```

Windows PowerShell:

```powershell
& "$env:USERPROFILE\.gemini\antigravity-cli\agy-hud-runtime\extensions\bin\agy-hud.cmd"
```

输出应该包含：

```text
AGY-HUD
```

如果当前 agy OAuth 凭据有效，输出还应该包含 Quota 行；如果凭据过期，会显示类似：

```text
Quota unavailable: Antigravity token expired
```

4. 打开一个新的、已登录的 `agy` 会话确认实际状态栏显示。

未登录页不是稳定验收标准。`AGY-HUD` 命令本身不依赖登录，未登录时也能输出默认行；但 agy 的登录页 TUI 在 macOS 和 Windows 上会用不同方式重绘/清屏，Windows 上可能把 statusLine 输出盖掉或放到不可见区域。判断安装是否成功，以 `settings.statusLine`、直接运行 HUD 命令、以及已登录后的新会话显示为准。

### 方式二：本地开发

```bash
git clone https://github.com/icebear0828/agy-hud.git
cd agy-hud
./setup.sh
```

本地开发模式会安装插件，并把 `settings.json` 的 `statusLine` 指向当前仓库里的 `extensions/bin/agy-hud.js`。

---

## 诊断

本地检查 agy 路径和 OAuth token 解析结果：

```bash
npm run diagnose:auth
```

远端设备用同一个诊断 CLI，不需要 clone 项目，也不会打印 token 值：

```bash
npm run diagnose:auth:remote -- <ssh-target>
```

例如：

```bash
npm run diagnose:auth:remote -- a
npm run diagnose:auth:remote -- 14323@192.168.10.5
```

如果 Windows 只能看到默认 HUD 行但没有 Quota，先看直接运行 HUD 命令的提示。Windows 登录态通常在 Credential Manager；SSH 服务会话可能看不到桌面会话的 `gemini:antigravity` 凭据，只能读到过期的 `~/.gemini/oauth_creds.json`。这种情况下 `Antigravity token expired` 不等于桌面 agy 没登录；在桌面会话里重新打开 `agy`，HUD 会触发一次后台 Credential Manager 刷新，下一次渲染应复用短期 token/cache。

远端两步安装显示验证使用：

```bash
npm run verify:setup-display:remote -- <ssh-target> <zip-url> <setup-script-url> --setup-source-base=<source-base> --reset-hud
```

这个命令会先清理 agy-hud 自己的旧状态，执行 `agy plugin install <zip-url>`，再运行 setup runtime，最后打开真实 `agy` 会话观察 HUD。

install-only 负向验证使用：

```bash
npm run verify:install-display:remote -- <ssh-target> <zip-url> --reset-hud
```

这个命令会先清理 agy-hud 自己的旧状态，再执行一次 `agy plugin install <zip-url>`，随后打开真实 `agy` 会话观察 HUD；安装后不会手动执行 hook、setup 或 statusLine 命令。它用于确认 install-only 当前仍不会自动显示 HUD。

已经配置好的机器不能作为干净安装证据；如果需要保留现有配置，可用隔离的远端 `HOME` 跑同一套严格验证：

```bash
AGY_HUD_E2E_TARGET=a \
AGY_HUD_E2E_REMOTE_ENV='HOME=/tmp/agy-hud-clean' \
AGY_HUD_E2E_AGY_BIN='/Users/yutao/.local/bin/agy' \
npm run e2e
```

---

## 工作原理

### 状态栏触发

agy 在每个步骤完成后执行 `settings.json` 中配置的 `statusLine` 命令。HUD 读取 agy 通过 stdin 传入的 JSON payload（会话 ID、Token 用量、模型信息等），渲染后输出到 stdout。

### Quota 数据来源

通过逆向 agy 二进制，确认 `/usage` 命令数据来自：

```
POST https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels
```

每个 model 对象包含 `quotaInfo.remainingFraction`（剩余比例）和 `quotaInfo.resetTime`（重置时间）。

Token 自动从 agy 的 OAuth 凭据读取：优先搜索 `~/.gemini/antigravity-cli/antigravity-oauth-token`，同时兼容 `~/.gemini/oauth_creds.json`；Windows 的刷新路径可读取 Credential Manager，并写入短期 token 镜像。setup 会尝试刷新一次 Quota cache；状态栏进程只走 fast path：优先读取已有 token / quota cache，不直接拉 Credential Manager，不等待网络请求。cache 缺失、过期或 access token 轮换时，会启动 detached 后台刷新，当前渲染仍保持快速返回。

---

## 配置（可选）

在运行 agy 的项目目录创建 `agy-hud.config.json` 可覆盖默认配置；未提供项目配置时，HUD 使用 runtime 内的默认配置 `extensions/agy-hud.config.json`：

```json
{
  "theme": {
    "primary": "green",
    "secondary": "gray",
    "warning": "yellow",
    "critical": "red"
  },
  "display": {
    "unicode": true,
    "useNerdFonts": false,
    "columnWidth": 37
  },
  "thresholds": {
    "warning": 0.7,
    "critical": 0.9
  }
}
```

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `theme.primary/secondary/warning/critical` | string | 见上 | ANSI 颜色名（green/gray/yellow/red/blue/cyan/magenta） |
| `display.unicode` | boolean | `true` | 显式启用或禁用 Unicode 字符；删除该字段时按终端能力自动检测 |
| `display.useNerdFonts` | boolean | `false` | 启用 Nerd Font / Powerline 图标 |
| `display.columnWidth` | number | `37` | Quota 列宽 |
| `thresholds.warning` | number | `0.7` | 上下文用量警告阈值（0–1） |
| `thresholds.critical` | number | `0.9` | 上下文用量严重阈值（0–1） |

如果删除 `display.unicode` 字段，也可通过环境变量影响自动检测结果：

| 变量 | 效果 |
|---|---|
| `AGY_HUD_FORCE_ASCII=1` | 强制 ASCII 模式 |
| `AGY_HUD_FORCE_UNICODE=1` | 强制 Unicode 模式 |

---

## 文件结构

```
agy-hud/
├── plugin.json          # agy 插件清单
├── gemini-extension.json # 远程 Git URL 安装兼容清单
├── skills/
│   └── setup/
│       └── SKILL.md     # 安装后配置 runtime 和 settings.statusLine 的 setup skill
├── extensions/
│   ├── index.js            # 本地开发入口
│   ├── bin/
│   │   ├── agy-hud.js      # 主程序：读取 stdin → 渲染输出
│   │   └── agy-hud.cmd     # Windows .cmd 启动封装（自动生成）
│   ├── statusline.js       # settings.json statusLine 自动配置（含 Windows shim）
│   ├── quota.js            # 账号 Quota 获取（含本地缓存）
│   ├── renderer.js         # ANSI 渲染器（进度条、颜色、倒计时）
│   ├── parser.js           # 解析 agy stdin JSON payload
│   ├── paths.js            # 跨平台 antigravity-cli 数据目录解析
│   ├── encoding.js         # Unicode / ASCII 终端能力检测
│   ├── install-statusline.js # 本地开发 statusLine 安装入口
│   ├── config.js           # 读取 agy-hud.config.json
│   └── agy-hud.config.json # 默认配置
```

---

## 跨平台支持

Windows token 刷新来源可包含 Credential Manager；状态栏进程会优先复用短期 `agy-hud-token.json` 镜像。为了避免状态栏阻塞，它不会在渲染时同步拉 Credential Manager；当 fast path 只看到缺失/过期文件 token 时，会触发 detached 后台刷新，下一次渲染复用短期 token/cache。其他平台和文件回退按优先级搜索以下路径：

| 平台 | 路径 |
|---|---|
| macOS / Linux | `~/.gemini/antigravity-cli/antigravity-oauth-token` |
| macOS / Linux fallback | `~/.gemini/oauth_creds.json` |
| Linux (XDG) | `$XDG_DATA_HOME/antigravity-cli/antigravity-oauth-token` |
| Linux (XDG fallback) | `$XDG_DATA_HOME/oauth_creds.json` |
| Windows | `%APPDATA%\antigravity-cli\antigravity-oauth-token` |
| Windows (alt) | `%LOCALAPPDATA%\antigravity-cli\antigravity-oauth-token` |
| Windows fallback | `%USERPROFILE%\.gemini\oauth_creds.json` |

Windows 上 `statusLine` 命令通过自动生成的 `.cmd` 封装调用 Node.js，确保路径中有空格时也能正常工作。

---

## 致谢

本项目的灵感来自 [jarrodwatts/claude-hud](https://github.com/jarrodwatts/claude-hud) —— 一个面向 Claude Code 的同类 HUD 插件。感谢 Jarrod 的开源工作为这个方向提供了思路。

---

## License

MIT
