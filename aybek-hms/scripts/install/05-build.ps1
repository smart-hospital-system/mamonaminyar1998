<#
.SYNOPSIS
  05 - Build the production copy and prepare the offline USB package.

.DESCRIPTION
  Runs a clean type-check, the production build, then optionally copies
  everything another computer needs (source, packages, database, Node.js
  installer) onto a folder or USB stick. The building blocks are identical to
  the online version: nothing is removed offline.

.EXAMPLE
  .\scripts\install\05-build.ps1
  .\scripts\install\05-build.ps1 -OfflineTarget "F:\AybekOffline"
#>

param(
    [string]$Path,
    [switch]$SkipTypeCheck,
    [string]$OfflineTarget
)

. "$PSScriptRoot\_common.ps1"

Write-Banner "AYBEK HOSPITAL - STEP 5: PRODUCTION BUILD"

$root = Get-HmsRoot -Override $Path
Set-Location -LiteralPath $root
Assert-Node -MinimumMajor 20 | Out-Null

$running = -not (Test-PortFree -Port 3000)
if ($running) {
    Write-Warn "The development server appears to be running (port 3000)."
    Write-Info "A build while dev mode runs can corrupt the dev cache - stop it first if the app misbehaves afterwards."
}

if (-not $SkipTypeCheck) {
    Write-Step "Type-checking every file"
    & npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) { Stop-WithMessage "Type errors were found - the build was not started." "Fix the reported files, or pass -SkipTypeCheck for an emergency build." }
    Write-Ok "Types are clean"
}

Write-Step "Building (about 1-3 minutes)"
$env:NODE_OPTIONS = "--max-old-space-size=4096"
& npm run build
if ($LASTEXITCODE -ne 0) { Stop-WithMessage "The build failed." "Copy the error above into the support chat; the source is unchanged." }

Write-Ok "Production build ready in .next\"

if ($OfflineTarget) {
    Write-Banner "PREPARING THE OFFLINE PACKAGE"
    $target = $OfflineTarget
    if (-not (Test-Path -LiteralPath $target)) { New-Item -ItemType Directory -Force -Path $target | Out-Null }

    Write-Step "Copying the application"
    $exclude = @(".git", ".next\cache", "node_modules\.cache", "logs", "backups", ".arena")
    & robocopy $root $target /E /NFL /NDL /NJH /NJS /XD $exclude /XF "*.log" | Out-Null
    if ($LASTEXITCODE -ge 8) { Stop-WithMessage "Copying to $target failed (robocopy $LASTEXITCODE)." }

    Write-Step "Caching the npm packages for a no-internet install"
    $cache = Join-Path $target "npm-cache"
    & npm config get cache | Out-Null
    $npmCache = (& npm config get cache).Trim()
    if (Test-Path -LiteralPath $npmCache) {
        & robocopy $npmCache $cache /E /NFL /NDL /NJH /NJS | Out-Null
        Write-Ok "npm cache copied ($([math]::Round((Get-ChildItem $cache -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum/1MB,0)) MB)"
    }

    Write-Step "Copying the Node.js installer, if it is on this machine"
    $msi = Get-ChildItem -Path "$env:USERPROFILE\Downloads", "$env:TEMP" -Filter "node-v*-x64.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($msi) {
        Copy-Item -LiteralPath $msi.FullName -Destination $target -Force
        Write-Ok "Copied $($msi.Name) - no internet needed on the other computer"
    } else {
        Write-Warn "No node-v*.msi found in Downloads or TEMP."
        Write-Info "Download it once from https://nodejs.org (Windows Installer 64-bit) and copy it into $target."
    }

    Copy-Item -LiteralPath (Join-Path $root "aybek-hms\docs\INSTALL-OFFLINE.md") -Destination $target -Force -ErrorAction SilentlyContinue
    Write-Ok "Offline package is ready at $target"
}

Write-Banner "STEP 5 COMPLETE"
Write-Info "Start the fast production server with:"
Write-Host "      .\scripts\install\04-start.ps1 -Mode prod" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close" | Out-Null
