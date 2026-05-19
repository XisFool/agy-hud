# agy-hud

为 Antigravity CLI 量身定制的高级多行终端看板（HUD），灵感源自 `claude-hud`。

## 🚀 特性
- **实时状态**：监控 Agent 的思考过程和工具调用。
- **上下文健康度**：直观展示对话上下文的使用情况。
- **任务追踪**：实时同步项目进度。

## 🛠️ 安装
```bash
git clone https://github.com/user/agy-hud.git
cd agy-hud
./setup.sh
```

## ⚙️ 配置
编辑 `agy-hud.config.json` 来进行个性化定制：
- `theme`: 不同状态的颜色。
- `display`: 开关 Token 进度条、面包屑路径或 Git 分支显示。
- `thresholds`: 设置上下文消耗的警告/严重阈值。

## 📜 许可证
MIT
