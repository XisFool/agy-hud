# agy-hud

为 Antigravity CLI 量身定制的高级多行终端看板（HUD），灵感源自 `claude-hud`。

## ✨ 核心特性 (超越 claude-hud)
- **官方插件支持**：原生集成 `agy plugin` 体系，支持标准化安装。
- **Git 智能感知**：实时检测分支名及仓库脏状态（Dirty state）。
- **事件驱动钩子**：基于 `on_step_complete` 实现极低延迟的状态更新。
- **动态上下文条**：根据可配置阈值自动切换颜色（绿/黄/红）。
- **原生双语界面**：完美支持中英文切换。
- **TDD 质量保证**：内置测试套件及 Git Hooks，确保每一行代码都经过验证。

## 🛠️ 安装

### 官方推荐方法
```bash
agy plugin install icebear0828/agy-hud
```

### 手动开发安装
```bash
git clone https://github.com/icebear0828/agy-hud.git
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
