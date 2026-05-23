# agy-hud

> **Antigravity CLI (`agy`)** 的实时 statusline HUD 插件。每个 step 结束自动刷新，展示会话信息、Token 用量和**真实账号 Quota**（与 `/usage` 命令数据一致）。

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

```bash
# 1. 装插件（agy 自带，stage plugin.json + skills/）
agy plugin install https://github.com/icebear0828/agy-hud.git

# 2. 启动 runtime + 写 settings.json statusLine
#    必须在普通 shell 里跑，不要在已开的 agy 会话里跑
#    （agy 退出时会用内存里的 settings 覆写磁盘，可能盖掉这次改动）
bash <(curl -fsSL https://raw.githubusercontent.com/icebear0828/agy-hud/main/scripts/bootstrap.sh)
```

bootstrap **幂等**——任何时候重跑都能修 `statusLine.command` 路径漂移。

完成后新开一个 `agy` 会话，终端底部应该看到 HUD。

### 为什么要两步？

`agy plugin install` 只 stage **声明式** 内容（`plugin.json` + `skills/`），不执行 JavaScript；而 statusLine 配置在 `~/.gemini/antigravity-cli/settings.json` 里，跟 plugin 系统是**正交**的。bootstrap 负责把 HUD runtime 下载到 `~/.gemini/antigravity-cli/agy-hud-runtime/`，并把它注册成 statusLine 命令。

### Fork / 镜像

```bash
AGY_HUD_REPO_RAW=https://raw.githubusercontent.com/your-fork/agy-hud/main \
  bash <(curl -fsSL "$AGY_HUD_REPO_RAW/scripts/bootstrap.sh")
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

```bash
bash uninstall.sh        # macOS / Linux
.\uninstall.ps1          # Windows PowerShell
```

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
    "unicode": true,
    "nerdFont": false,
    "columnWidth": 35
  },
  "thresholds": {
    "warning": 30,
    "critical": 10
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
├── plugin.json           # {"name":"agy-hud"} — agy plugin marker
├── skills/setup/         # SKILL.md — agent 看到的 setup 手册
├── runtime/              # bootstrap 下载到 ~/.gemini/.../agy-hud-runtime/runtime/
│   ├── bin/agy-hud.js    # statusLine 入口（stdin JSON → ANSI HUD）
│   ├── quota.js          # fetchAvailableModels 客户端（与 /usage 对账）
│   ├── statusline-installer.js
│   ├── uninstall.js
│   └── ...
├── scripts/
│   ├── bootstrap.sh      # 一行安装入口
│   ├── bootstrap.js      # 实际下载 + 配置逻辑
│   ├── verify-display.js # E2E：install + bootstrap + observe agy
│   └── diagnose-auth.js
├── tests/unit/           # node --test
└── release.sh
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

## License

MIT
