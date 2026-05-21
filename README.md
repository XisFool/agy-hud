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

### 方式一：Git URL（推荐）

```bash
agy plugin install https://github.com/icebear0828/agy-hud.git
```

该命令会导入 `skills/setup/SKILL.md` 和 `post_invocation` hook。`settings.json` 的 `statusLine` 由安装后的 hook 在首次执行时写入；如果当前会话未立即生效，让 agy 执行 agy-hud 的 setup skill，或重启 / 新开 agy 会话。

### 方式二：本地开发

```bash
git clone https://github.com/icebear0828/agy-hud.git
cd agy-hud
./setup.sh
```

本地开发模式会安装插件，并把 `settings.json` 的 `statusLine` 指向当前仓库里的 `extensions/bin/agy-hud.js`。

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

Token 自动从 agy 的 OAuth 凭据读取：macOS / Linux 优先搜索 token 文件，Windows 使用 Credential Manager 和短期 token 镜像。Quota 结果本地缓存到重置时间为止，**无后台轮询，无性能影响**。

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
│       └── SKILL.md     # 安装后手动触发配置的 setup skill
├── extensions/
│   ├── index.js            # 插件入口，注册 on_step_complete 钩子并自动配置 statusLine
│   ├── bin/
│   │   ├── agy-hud.js      # 主程序：读取 stdin → 渲染输出
│   │   └── agy-hud.cmd     # Windows .cmd 启动封装（自动生成）
│   ├── statusline.js       # settings.json statusLine 自动配置（含 Windows shim）
│   ├── quota.js            # 账号 Quota 获取（含本地缓存）
│   ├── renderer.js         # ANSI 渲染器（进度条、颜色、倒计时）
│   ├── parser.js           # 解析 agy stdin JSON payload
│   ├── paths.js            # 跨平台 antigravity-cli 数据目录解析
│   ├── encoding.js         # Unicode / ASCII 终端能力检测
│   ├── install-statusline.js # 手动 statusLine 安装入口
│   ├── config.js           # 读取 agy-hud.config.json
│   └── agy-hud.config.json # 默认配置
└── hooks/
    ├── hooks.json          # 远程安装后的 post_invocation bootstrap hook
    ├── build-hook.js       # hook 构建脚本
    └── inline-bootstrap.js # 内联 bootstrap 逻辑
```

---

## 跨平台支持

Windows token 来源为 Credential Manager；hook / 状态栏进程会写入并优先复用短期 `agy-hud-token.json` 镜像。其他平台和文件回退按优先级搜索以下路径：

| 平台 | 路径 |
|---|---|
| macOS / Linux | `~/.gemini/antigravity-cli/antigravity-oauth-token` |
| Linux (XDG) | `$XDG_DATA_HOME/antigravity-cli/antigravity-oauth-token` |
| Windows | `%APPDATA%\antigravity-cli\antigravity-oauth-token` |
| Windows (alt) | `%LOCALAPPDATA%\antigravity-cli\antigravity-oauth-token` |

Windows 上 `statusLine` 命令通过自动生成的 `.cmd` 封装调用 Node.js，确保路径中有空格时也能正常工作。

---

## 致谢

本项目的灵感来自 [jarrodwatts/claude-hud](https://github.com/jarrodwatts/claude-hud) —— 一个面向 Claude Code 的同类 HUD 插件。感谢 Jarrod 的开源工作为这个方向提供了思路。

---

## License

MIT
