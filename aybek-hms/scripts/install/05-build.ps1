<#
.SYNOPSIS
  05 - Build the production copy. Legacy unsafe USB export is disabled.

.DESCRIPTION
  Runs type-check and production build. The old whole-folder USB exporter
  is refused because it copied private hospital data and environment secrets.
  Runtime remains offline once dependencies are installed.

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

if ($OfflineTarget) {
    Stop-WithMessage "Unsafe whole-folder portable export is disabled." "It could copy patient databases, uploads and private .env secrets. Use a reviewed source-only distribution; runtime remains offline after dependencies are installed. No portable package was created."
}

Assert-Node -MinimumMajor 22 | Out-Null

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

Write-Banner "STEP 5 COMPLETE"
Write-Info "Start the fast production server with:"
Write-Host "      .\scripts\install\04-start.ps1 -Mode prod" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close" | Out-Null
