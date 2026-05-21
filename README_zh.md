# agy-hud

为 Antigravity CLI 量身定制的多行终端状态 HUD，灵感源自 `claude-hud`。

## ✨ 核心特性

- **原生插件集成**：通过 `agy plugin install` 导入 setup skill 和 hook
- **真实 Quota 数据**：逆向 `/usage` 接口，直接显示各模型剩余额度 + 重置倒计时
- **跨平台兼容**：macOS / Linux / Windows 均支持，Unicode 能力自动检测
- **事件驱动**：agy 执行 `statusLine` 命令，步骤完成后刷新
- **可配置主题**：颜色、阈值、Nerd Font 全可自定义

## 🛠️ 安装

### Git URL（推荐）

```bash
agy plugin install https://github.com/icebear0828/agy-hud.git
```

安装命令会导入 `skills/setup/SKILL.md` 和 `post_invocation` hook。`settings.json` 的 `statusLine` 由安装后的 hook 在首次执行时写入；如果当前会话未立即生效，让 agy 执行 agy-hud 的 setup skill，或重启 / 新开 agy 会话。

### 本地开发

```bash
git clone https://github.com/icebear0828/agy-hud.git
cd agy-hud
./setup.sh
```

本地开发模式会把 `statusLine` 指向当前仓库。

## ⚙️ 配置

在项目根目录创建 `agy-hud.config.json`，或编辑 `extensions/agy-hud.config.json`：

```json
{
  "theme": { "primary": "green", "warning": "yellow", "critical": "red" },
  "display": { "useNerdFonts": false, "unicode": true, "showGitBranch": true },
  "thresholds": { "warning": 0.7, "critical": 0.9 },
  "language": "auto"
}
```

完整配置说明见 [README.md](./README.md)。

## 📜 License

MIT
