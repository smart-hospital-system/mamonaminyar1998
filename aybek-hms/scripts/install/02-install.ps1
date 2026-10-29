<#
.SYNOPSIS
  02 - Install every package the hospital needs.

.DESCRIPTION
  Uses the lockfile for a reproducible install. Works online (downloads from
  npm) and offline (installs from the packages folder that 04-build.ps1 puts
  on your USB stick). Press Ctrl+C at any time - running it again resumes.

.EXAMPLE
  .\scripts\install\02-install.ps1
  .\scripts\install\02-install.ps1 -OfflineFrom "E:\AybekOffline\npm-cache"
#>

param(
    [switch]$NoPause,
    [string]$Path,
    [switch]$Force,
    [string]$OfflineFrom
)

. "$PSScriptRoot\_common.ps1"

Write-Banner "AYBEK HOSPITAL - STEP 2: INSTALL PACKAGES"

$root = Get-HmsRoot -Override $Path
Set-Location -LiteralPath $root
Assert-Node -MinimumMajor 20 | Out-Null

# ------------------------------------------------------------ existing install
$nodeModules = Join-Path $root "node_modules"
if ((Test-Path -LiteralPath $nodeModules) -and -not $Force) {
    $count = (Get-ChildItem -LiteralPath $nodeModules -Directory | Measure-Object).Count
    Write-Ok "node_modules already contains $count packages"
    Write-Info "Use -Force to reinstall from scratch."
    Write-Banner "STEP 2 SKIPPED - ALREADY INSTALLED"
    Write-Host "      Next: .\scripts\install\03-seed.ps1" -ForegroundColor Cyan
    if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
    exit 0
}

# ------------------------------------------------------------------ offline mode
if ($OfflineFrom) {
    if (-not (Test-Path -LiteralPath $OfflineFrom)) {
        Stop-WithMessage "Offline package folder not found: $OfflineFrom" "Copy the npm-cache folder from the USB stick first."
    }
    Write-Step "Installing from the offline cache"
    $env:npm_config_cache = $OfflineFrom
    $env:npm_config_offline = "true"
} else {
    Write-Step "Installing from the internet"
    $env:npm_config_offline = "false"
}

$progress = $false
if (Test-Path -LiteralPath (Join-Path $root "package-lock.json")) {
    Write-Step "npm ci (reproducible install from package-lock.json)"
    & npm ci --no-audit --no-fund
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        Write-Warn "npm ci failed (exit $code) - falling back to npm install"
        & npm install --no-audit --no-fund
        $code = $LASTEXITCODE
    }
} else {
    Write-Step "npm install"
    & npm install --no-audit --no-fund
    $code = $LASTEXITCODE
}

if ($code -ne 0) {
    Stop-WithMessage "Package installation failed (exit $code)." `
        "Check the internet connection, or run the offline installer: .\scripts\install\02-install.ps1 -OfflineFrom `"E:\AybekOffline\npm-cache`""
}

# ------------------------------------------------------------------- verify
Write-Step "Verifying the install"
$checks = @("next", "react", "react-dom", "lucide-react", "bcryptjs", "tsx")
$missing = @()
foreach ($pkg in $checks) {
    if (-not (Test-Path -LiteralPath (Join-Path $nodeModules $pkg))) { $missing += $pkg }
}
if ($missing.Count -gt 0) {
    Stop-WithMessage "Missing packages after install: $($missing -join ', ')" "Run the script again; if it keeps failing delete node_modules and retry."
}
Write-Ok "All core packages installed"

Write-Banner "STEP 2 COMPLETE"
Write-Info "Next: step 3 - build the demo hospital database"
Write-Host "      .\scripts\install\03-seed.ps1" -ForegroundColor Cyan
Write-Host ""
if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
