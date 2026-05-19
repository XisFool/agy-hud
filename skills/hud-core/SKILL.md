# Skill: hud-core
Description: Standards and utilities for rendering premium terminal UIs in agy-hud.

## Core Directives
1. **ANSI Safety**: Always use `chalk` or validated ANSI escape codes. Never leak raw escape characters into logs.
2. **Buffering**: Implement a "virtual screen" logic to minimize terminal flickering.
3. **Themes**: Support "Glassmorphism" simulation using subtle gray gradients and high-saturation accents.

## UI Tokens
- Primary: `#00FFAA` (Spring Green)
- Warning: `#FFCC00` (Gold)
- Error: `#FF4444` (Coral)
- Thinking: `#888888` (Steel Gray)
