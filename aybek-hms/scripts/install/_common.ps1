<#
.SYNOPSIS
  Shared helpers for every Aybek HMS installer script.

.DESCRIPTION
  Dot-source this file at the top of each script:

      . "$PSScriptRoot\_common.ps1"

  It resolves the project root (default E:\Mamonaminyar-HMS-Print-Design-v4 or
  the folder that contains this scripts\ folder), and provides logging helpers
  that work the same in Windows PowerShell 5.1 and PowerShell 7.
#>

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ---------------------------------------------------------------- project root
function Get-HmsRoot {
    param([string]$Override)

    if ($Override) { return (Resolve-Path -LiteralPath $Override).Path }

    if ($env:AYBEK_HMS_ROOT -and (Test-Path -LiteralPath $env:AYBEK_HMS_ROOT)) {
        return (Resolve-Path -LiteralPath $env:AYBEK_HMS_ROOT).Path
    }

    # scripts\install\_common.ps1  ->  project root is two levels up
    $candidate = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    if (Test-Path -LiteralPath (Join-Path $candidate "package.json")) { return $candidate }

    $preferred = "E:\Mamonaminyar-HMS-Print-Design-v4"
    if (Test-Path -LiteralPath (Join-Path $preferred "package.json")) { return $preferred }

    throw "Cannot find the project folder. Run the script with -Path `"D:\your\aybek-folder`" or set `$env:AYBEK_HMS_ROOT."
}

# ------------------------------------------------------------------- printing
function Write-Banner {
    param([string]$Text)
    $line = "=" * 74
    Write-Host ""
    Write-Host $line -ForegroundColor DarkCyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host $line -ForegroundColor DarkCyan
}

function Write-Step  { param([string]$Text) Write-Host "  ->  $Text" -ForegroundColor White }
function Write-Ok    { param([string]$Text) Write-Host "  OK  $Text" -ForegroundColor Green }
function Write-Warn  { param([string]$Text) Write-Host "  !!  $Text" -ForegroundColor Yellow }
function Write-Fail  { param([string]$Text) Write-Host "  XX  $Text" -ForegroundColor Red }
function Write-Info  { param([string]$Text) Write-Host "      $Text" -ForegroundColor DarkGray }

function Stop-WithMessage {
    param([string]$Text, [string]$Hint)
    Write-Fail $Text
    if ($Hint) { Write-Info $Hint }
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}

# -------------------------------------------------------------------- tooling
function Test-Command {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-NodeVersion {
    if (-not (Test-Command "node")) { return $null }
    try { return (& node --version).Trim() } catch { return $null }
}

function Assert-Node {
    param([int]$MinimumMajor = 20)

    $raw = Get-NodeVersion
    if (-not $raw) {
        Stop-WithMessage "Node.js is not installed (or not on PATH)." `
            "Install Node.js 22 LTS from https://nodejs.org (Windows Installer .msi), then reopen PowerShell."
    }
    $major = [int](($raw -replace "^v", "") -split "\.")[0]
    if ($major -lt $MinimumMajor) {
        Stop-WithMessage "Node.js $raw is too old - version $MinimumMajor or newer is required." `
            "Install Node.js 22 LTS from https://nodejs.org and run this script again."
    }
    Write-Ok "Node.js $raw detected"
    if (-not (Test-Command "npm")) { Stop-WithMessage "npm was not found next to Node.js." "Reinstall Node.js with the default options." }
    return $raw
}

function Get-NpmVersion {
    if (-not (Test-Command "npm")) { return "unknown" }
    return (& npm --version).Trim()
}

function Test-PortFree {
    param([int]$Port = 3000)
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener) { try { $listener.Stop() } catch { } }
    }
}

function Get-HmsUrl {
    param([int]$Port = 3000)
    return "http://localhost:$Port"
}

function Open-HmsUrl {
    param([string]$Path = "/hms/login", [int]$Port = 3000)
    $url = (Get-HmsUrl -Port $Port) + $Path
    Write-Info "Opening $url"
    Start-Process $url
}

function Confirm-Action {
    param([string]$Question, [switch]$DefaultYes)
    $suffix = if ($DefaultYes) { "[Y/n]" } else { "[y/N]" }
    $answer = Read-Host "$Question $suffix"
    if ([string]::IsNullOrWhiteSpace($answer)) { return [bool]$DefaultYes }
    return $answer.Trim().ToLower().StartsWith("y")
}

function New-BackupFolder {
    param([string]$Root)
    $stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
    $folder = Join-Path $Root "backups\$stamp"
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
    return $folder
}
