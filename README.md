# Antigravity HUD (agy-hud) 🚀

Premium 风格的状态栏 HUD 插件，专为 **Antigravity CLI (agy)** 设计。

![HUD Preview](https://github.com/icebear0828/agy-hud/raw/main/preview.png)

## 📦 安装指南

由于 Antigravity CLI 对插件格式有严格要求，请选择以下官方支持的安装方式：

### 1. 推荐：通过 Git 直接安装 (最稳健)
```bash
agy plugin install https://github.com/icebear0828/agy-hud.git
```

### 2. 开发者安装 (本地源码)
1. 克隆仓库：`git clone https://github.com/icebear0828/agy-hud.git`
2. 进入目录并安装：`agy plugin install .`

### 3. 从 Claude Code 迁移
如果你已在 Claude 环境安装过，可直接导入：
```bash
agy plugin import claude
```

## ✨ 核心功能

- **实时状态追踪**：同步显示当前会话的 Steps、Tokens 和 Git 分支。
- **Premium 设计**：采用 256 色终端渲染，支持 Powerline 风格符号。
- **自动挂载**：安装后自动注册到 `on_step_complete` 钩子，无感运行。

## 🛠️ 插件结构说明

本插件遵循 **pi-coding-agent** 官方协议开发：
- `extensions/index.js`: CommonJS 格式的工厂函数入口。
- `mcp_config.json`: 符合 Model Context Protocol 规范的服务器配置。
- `skills/`: 自动加载的辅助技能说明。

## 📄 开源协议
MIT
