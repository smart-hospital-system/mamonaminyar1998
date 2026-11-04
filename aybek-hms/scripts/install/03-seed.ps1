<#
.SYNOPSIS
  03 - Create a NEW isolated synthetic hospital, never reset an existing one.
.DESCRIPTION
  Honors SLOTLY_DB_PATH and .env.local through the Node helper. An existing
  database is preserved without opening it. No raw copy of a live WAL database,
  implicit reset, settings overwrite or destructive reseed is performed.
  Force/KeepSettings parameters remain accepted for compatibility but never
  authorize destruction. Separate demo reset tools require explicit opt-in.
#>
param(
    [switch]$NoPause,
    [string]$Path,
    [switch]$Force,
    [switch]$KeepSettings
)
. "$PSScriptRoot\_common.ps1"
Write-Banner "AYBEK HOSPITAL - STEP 3: SAFE FIRST INSTALL"
$root = Get-HmsRoot -Override $Path
Set-Location -LiteralPath $root
Assert-Node -MinimumMajor 22 | Out-Null
if ($Force -or $KeepSettings) {
    Write-Warn "Existing records are always preserved. Force/KeepSettings do not reset or replace a database."
}
& node scripts/init-next-demo.mjs
if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Safe demo initialization failed." "Check the configured path and permissions. No existing hospital was reset."
}
Write-Ok "First-install check completed; any existing database was preserved."
Write-Warn "This is unvalidated development software. Demo account passwords are public; change them before any real records."
Write-Info "Next: step 4 - start the hospital"
if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
