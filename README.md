# Antigravity HUD (agy-hud) 🚀

Premium 风格的状态栏 HUD 插件，专为 **Antigravity CLI (agy)** 设计。

## 📦 安装

```bash
agy plugin install https://github.com/icebear0828/agy-hud.git
```

本地开发：
```bash
git clone https://github.com/icebear0828/agy-hud.git
agy plugin install .
```

## ✨ 功能

### 状态行（每个步骤完成后自动刷新）

```
 AGY-HUD  ⎇ main | Plan: Pro | Steps: 12  Tasks: 3
 Tokens: 50.0k/5.0k | Ctx: 50.0k/200.0k [██░░░░░░░░] | Model: Claude Sonnet 4.6
```

### 实时账号 Quota（真实剩余额度 + 重置倒计时）

```
Gemini 3.5 Flash (Hig… [█████░░░] 60% ~30m  |  Gemini 3.5 Flash (Med… [█████░░░] 60% ~30m
Claude Sonnet 4.6 (Th… [███░░░░░] 40% ~4h 2m  |  Claude Opus 4.6 (Thin… [███░░░░░] 40% ~4h 2m
GPT-OSS 120B (Medium) [███░░░░░] 40% ~4h 2m
```

Quota 数据来源与 `/usage` 命令完全一致（`fetchAvailableModels` API），本地缓存到重置时间，**无后台轮询**。

## 🛠️ 核心文件

| 文件 | 说明 |
|---|---|
| `extensions/index.js` | 插件入口，注册 `on_step_complete` 钩子 |
| `bin/agy-hud.js` | 主渲染逻辑，读 stdin JSON → 输出 ANSI HUD |
| `quota.js` | 从 cloudcode-pa API 获取真实 quota，带本地缓存 |
| `renderer.js` | ANSI 渲染器，含进度条 / 倒计时 |
| `parser.js` | 解析 agy stdin JSON payload |
| `config.js` | 读取 `agy-hud.config.json` 用户配置 |

## ⚙️ 配置

在项目根目录创建 `agy-hud.config.json`：

```json
{
  "display": {
    "useNerdFonts": true
  }
}
```

`useNerdFonts: true` 启用 Powerline / Nerd Font 图标（默认 `false`，使用 ASCII fallback）。

## 📄 License
MIT
