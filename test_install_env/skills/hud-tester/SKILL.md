# Skill: hud-tester
Description: Automated E2E testing tools for terminal HUDs.

## Directives
1. **Scenario Generation**: Ability to generate fake `transcript.jsonl` files with various agent states (thinking, tool_calling, error).
2. **Visual Snapshotting**: Capture terminal output and verify color/content presence.
3. **Performance Monitoring**: Measure the latency between a log write and the HUD update (Goal: <300ms).
