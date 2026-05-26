<#
.SYNOPSIS
    Automatically configure PowerShell and Git to use UTF-8 encoding on Windows.
.DESCRIPTION
    1. Checks and creates the PowerShell profile.
    2. Appends UTF-8 output encoding setup to the PowerShell profile.
    3. Configures global Git options to handle UTF-8/Chinese filenames and logs correctly.
#>

# 1. Configure PowerShell Profile
Write-Host "Configuring PowerShell Profile..." -ForegroundColor Cyan
$profileDir = Split-Path -Path $PROFILE -Parent
if (!(Test-Path -Path $profileDir)) {
    New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
    Write-Host "Created Profile Directory: $profileDir" -ForegroundColor Green
}

$utf8Config = @"

# Force PowerShell console input/output encoding to UTF-8
[System.Console]::OutputEncoding = [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8
`$OutputEncoding = [System.Text.Encoding]::UTF8
"@

if (Test-Path -Path $PROFILE) {
    $content = Get-Content -Path $PROFILE -Raw
    if ($content -notlike "*[System.Console]::OutputEncoding*") {
        Add-Content -Path $PROFILE -Value $utf8Config
        Write-Host "Appended UTF-8 configuration to existing Profile: $PROFILE" -ForegroundColor Green
    } else {
        Write-Host "UTF-8 configuration already exists in Profile: $PROFILE" -ForegroundColor Yellow
    }
} else {
    New-Item -ItemType File -Path $PROFILE -Force | Out-Null
    Set-Content -Path $PROFILE -Value $utf8Config
    Write-Host "Created new Profile and configured UTF-8: $PROFILE" -ForegroundColor Green
}

# 2. Configure Git Global Options
Write-Host "Configuring Git Global Encoding..." -ForegroundColor Cyan
git config --global core.quotepath false
git config --global gui.encoding utf-8
git config --global i18n.commitencoding utf-8
git config --global i18n.logoutputencoding utf-8
Write-Host "Git configured successfully!" -ForegroundColor Green

Write-Host "All configurations completed. Please restart your PowerShell terminal to apply changes." -ForegroundColor Cyan
