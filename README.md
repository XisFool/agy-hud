# agy-hud

A premium, multi-line terminal HUD for Antigravity CLI, inspired by `claude-hud`.

## ✨ Key Features (Beyond claude-hud)
- **Official Plugin Support**: Native integration with `agy plugin` system.
- **Git Intelligence**: Real-time branch and dirty-state detection.
- **Event-Driven Hooks**: Ultra-low latency updates via `on_step_complete`.
- **Dynamic Context Bar**: Smart color-coding based on configurable thresholds.
- **Bilingual Interface**: Full support for English and Simplified Chinese.
- **TDD Enforcement**: Built-in test suite and Git hooks for quality assurance.

## 🛠️ Installation

### Official Method (Recommended)
```bash
agy plugin install icebear0828/agy-hud
```

### Manual Method (Development)
```bash
git clone https://github.com/icebear0828/agy-hud.git
cd agy-hud
./setup.sh
```

## ⚙️ Configuration
Edit `agy-hud.config.json` to customize:
- `theme`: Colors for different states.
- `display`: Toggle Token Bar, Breadcrumbs, or Git Branch.
- `thresholds`: Set warning/critical levels for context usage.

## 📜 License
MIT
