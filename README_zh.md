# agy-hud

为 Antigravity CLI 量身定制的多行终端状态 HUD，灵感源自 `claude-hud`。

## ✨ 核心特性

- **原生插件集成**：通过 `agy plugin install` 导入 setup skill，再由 setup skill 自动配置
- **真实 Quota 数据**：逆向 `/usage` 接口，直接显示各模型剩余额度 + 重置倒计时
- **跨平台兼容**：macOS / Linux / Windows 均支持，Unicode / ASCII 可配置
- **事件驱动**：agy 执行 `statusLine` 命令，步骤完成后刷新
- **可配置主题**：颜色、阈值、Nerd Font 全可自定义

## 🛠️ 安装

### Git URL + setup skill（推荐）

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

> 当前状态：实测 `agy` 1.0.0/1.0.1 的远程插件安装会导入 skills/agents，特定 `hooks/hooks.json` 也会被 staging；`rules`、`commands`、`pi: "extensions/index.js"` 和 `pi.extensions` 不会被处理。这些组件不会自动执行 `extensions/index.js`，不会导入根 `settings.json`，也不会在首次启动前写入 `settings.statusLine`。因此本项目采用 setup skill 两步安装；不能把 `[ok]` 当作 HUD 安装成功。

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

### 本地开发

```bash
git clone https://github.com/icebear0828/agy-hud.git
cd agy-hud
./setup.sh
```

本地开发模式会把 `statusLine` 指向当前仓库。

## 🔍 诊断

本地检查 agy 路径和 OAuth token 解析结果：

```bash
npm run diagnose:auth
```

远端设备用同一个诊断 CLI，不需要 clone 项目，也不会打印 token 值：

```bash
npm run diagnose:auth:remote -- <ssh-target>
```

如果 Windows 只能看到默认 HUD 行但没有 Quota，先看直接运行 HUD 命令的提示。Windows 登录态通常在 Credential Manager；SSH 服务会话可能看不到桌面会话的 `gemini:antigravity` 凭据，只能读到过期的 `~/.gemini/oauth_creds.json`。这种情况下 `Antigravity token expired` 不等于桌面 agy 没登录；在桌面会话里重新打开 `agy`，HUD 会触发一次后台 Credential Manager 读取。如果 Credential Manager 里的 access token 仍有效，下一次渲染会复用短期 token/cache；如果 Credential Manager 里的 access token 也已过期，需要先让 agy 自己刷新登录态。

Windows 上 Antigravity CLI 的主 OAuth 凭据存储在 Windows Credential Manager 的 `gemini:antigravity` / `LegacyGeneric:target=gemini:antigravity` 项里，里面包含 `access_token`、`refresh_token`（RT）和 access token 的 `expiry`。agy-hud 目前只读取 `access_token` 和 `expiry`，不会用 RT 换新的 access token。

远端两步安装显示验证：

```bash
npm run verify:setup-display:remote -- <ssh-target> <zip-url> <setup-script-url> --setup-source-base=<source-base> --reset-hud
```

这个命令会先清理 agy-hud 自己的旧状态，执行 `agy plugin install <zip-url>`，再运行 setup runtime，最后打开真实 `agy` 会话观察 HUD。

install-only 负向验证：

```bash
npm run verify:install-display:remote -- <ssh-target> <zip-url> --reset-hud
```

这个命令只会在安装前清理 agy-hud 自己的旧状态；安装后不会手动执行 hook、setup 或 statusLine 命令。它用于确认 install-only 当前仍不会自动显示 HUD。

已经配置好的机器不能作为干净安装证据；如果需要保留现有配置，可用隔离的远端 `HOME` 跑同一套严格验证：

```bash
AGY_HUD_E2E_TARGET=a \
AGY_HUD_E2E_REMOTE_ENV='HOME=/tmp/agy-hud-clean' \
AGY_HUD_E2E_AGY_BIN='/Users/yutao/.local/bin/agy' \
npm run e2e
```

## ⚙️ 配置

在运行 agy 的项目目录创建 `agy-hud.config.json` 可覆盖默认配置；未提供项目配置时，HUD 使用 runtime 内的默认配置 `extensions/agy-hud.config.json`：

```json
{
  "theme": { "primary": "green", "warning": "yellow", "critical": "red" },
  "display": { "useNerdFonts": false, "unicode": true, "columnWidth": 37 },
  "thresholds": { "warning": 0.7, "critical": 0.9 }
}
```

完整配置说明见 [README.md](./README.md)。

## 📜 License

MIT
