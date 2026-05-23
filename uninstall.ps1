# Remove agy-hud from this machine (Windows).
# 1. Run runtime\uninstall.js (clears settings.statusLine, removes runtime dir, tmp tokens)
# 2. Run `agy plugin uninstall agy-hud`
$ErrorActionPreference = 'Continue'

$Runtime = Join-Path $env:USERPROFILE '.gemini\antigravity-cli\agy-hud-runtime\runtime\uninstall.js'

if ((Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path $Runtime)) {
    node $Runtime
} else {
    Write-Error "agy-hud uninstall: runtime not found at $Runtime - skipping settings cleanup"
}

if (Get-Command agy -ErrorAction SilentlyContinue) {
    agy plugin uninstall agy-hud
} else {
    Write-Error "agy-hud uninstall: agy CLI not on PATH - skipping plugin uninstall"
}

Write-Host "agy-hud uninstall complete"
