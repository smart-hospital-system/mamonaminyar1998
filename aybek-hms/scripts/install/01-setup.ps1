<#
.SYNOPSIS
  01 - One-shot setup for Aybek Ten-Bed Specialy Surgical Hospital.

.DESCRIPTION
  Checks the machine (Windows version, Node.js, PowerShell, free port, disk
  space), creates the folder skeleton, writes a local .env file and confirms
  the project files are complete. It changes nothing outside the project
  folder, so it is safe to run twice.

.EXAMPLE
  .\scripts\install\01-setup.ps1
  .\scripts\install\01-setup.ps1 -Path "D:\Aybek"
#>

param(
    [switch]$NoPause,
    [string]$Path,
    [int]$Port = 3000
)

. "$PSScriptRoot\_common.ps1"

Write-Banner "AYBEK TEN-BED SPECIALY SURGICAL HOSPITAL - STEP 1: SETUP"

$root = Get-HmsRoot -Override $Path
Set-Location -LiteralPath $root
Write-Step "Project folder: $root"

# ------------------------------------------------------------------ Windows
Write-Step "Checking Windows and PowerShell"
Write-Info ("Windows      : " + [System.Environment]::OSVersion.VersionString)
Write-Info ("PowerShell   : " + $PSVersionTable.PSVersion)
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Stop-WithMessage "PowerShell 5.1 or newer is required." "Use the built-in Windows PowerShell or install PowerShell 7."
}

# ------------------------------------------------------------------- Node.js
Write-Step "Checking Node.js"
Assert-Node -MinimumMajor 20 | Out-Null
Write-Info ("npm          : " + (Get-NpmVersion))

# -------------------------------------------------------------- disk & port
Write-Step "Checking free disk space"
$drive = (Get-Item -LiteralPath $root).PSDrive
$freeGb = [math]::Round($drive.Free / 1GB, 1)
Write-Info "Free space on $($drive.Name): $freeGb GB"
if ($freeGb -lt 2) { Write-Warn "Less than 2 GB free - the installer needs roughly 1.5 GB for packages and the database." }

Write-Step "Checking port $Port"
if (Test-PortFree -Port $Port) {
    Write-Ok "Port $Port is free"
} else {
    Write-Warn "Port $Port is already in use - probably a previous copy of the hospital is running."
    Write-Info "Close it, or start this copy with: npm run start -- -p 3001"
}

# ------------------------------------------------------------------ folders
Write-Step "Creating the folder skeleton"
foreach ($folder in @("data", "logs", "backups", "public\hms\reference", "public\uploads", "scripts\install", "scripts\wizards")) {
    $full = Join-Path $root $folder
    if (-not (Test-Path -LiteralPath $full)) {
        New-Item -ItemType Directory -Force -Path $full | Out-Null
        Write-Info "created $folder\"
    }
}
Write-Ok "Folders are in place"

# --------------------------------------------------------------- env file
Write-Step "Writing the local .env file"
$envFile = Join-Path $root ".env.local"
if (Test-Path -LiteralPath $envFile) {
    Write-Warn ".env.local already exists - kept untouched"
} else {
    $secret = -join ((1..48) | ForEach-Object { "abcdefghijklmnopqrstuvwxyz0123456789"[(Get-Random -Maximum 36)] })
    $lines = @(
        "# Aybek HMS - local configuration. Keep this file on this computer only.",
        "AYBEK_HOSPITAL_NAME=Aybek Ten-Bed Specialy Surgical Hospital",
        "AYBEK_LICENSE_SECRET=aybek-hms::2026::ten-bed-surgical",
        "AYBEK_SESSION_SECRET=$secret",
        "AYBEK_PORT=$Port",
        "SLOTLY_DB_PATH=$($root)\data\slotly.db",
        "NODE_OPTIONS=--max-old-space-size=4096"
    )
    ($lines -join "`r`n") | Set-Content -LiteralPath $envFile -Encoding UTF8
    Write-Ok "Created .env.local (session secret generated)"
}

# --------------------------------------------------------- project integrity
Write-Step "Checking project files"
$required = @(
    "package.json", "next.config.ts", "middleware.ts", "tsconfig.json",
    "app\hms\layout.tsx", "app\hms\login\page.tsx", "app\hms\(workspace)\page.tsx",
    "lib\hms\db.ts", "lib\hms\seed.ts", "lib\hms\auth.ts", "lib\hms\license.ts",
    "components\hms\shell.tsx", "components\hms\rx-sheet.tsx", "components\hms\ui.tsx"
)
$missing = @()
foreach ($file in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $file))) { $missing += $file }
}
if ($missing.Count -gt 0) {
    Write-Warn "These files are missing:"
    $missing | ForEach-Object { Write-Info "  - $_" }
    Stop-WithMessage "The project folder is incomplete." "Copy the WHOLE Aybek folder again - do not copy only part of it."
}
Write-Ok "All $($required.Count) core files are present"

# ----------------------------------------------------------------- done
Write-Banner "STEP 1 COMPLETE"
Write-Info "Next: step 2 - install the packages"
Write-Host "      .\scripts\install\02-install.ps1" -ForegroundColor Cyan
Write-Host ""
if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
