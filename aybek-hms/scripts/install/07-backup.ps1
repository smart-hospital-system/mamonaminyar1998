<#
.SYNOPSIS
  07 - Consistent SQLite database snapshot, including committed WAL writes.
.DESCRIPTION
  Never raw-copies WAL/SHM files, exports settings separately, or automatically
  deletes old backups. Database settings/licences are already inside the snapshot.
  Uploads and private .env keys require a separate protected backup procedure.
#>
param(
    [string]$Path,
    [int]$Keep = 14,
    [string]$Destination,
    [switch]$Schedule,
    [string]$At = "20:00",
    [switch]$NoPause
)
. "$PSScriptRoot\_common.ps1"
$root = Get-HmsRoot -Override $Path
Set-Location -LiteralPath $root
Assert-Node -MinimumMajor 22 | Out-Null
if ($Schedule) {
    $scriptPath = Join-Path $PSScriptRoot "07-backup.ps1"
    $action = "powershell.exe -NoProfile -File `"$scriptPath`" -Path `"$root`" -NoPause"
    & schtasks /Create /TN "AybekHMS-Backup" /TR $action /SC DAILY /ST $At /F | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not register scheduled backup; check Task Scheduler permissions." }
    Write-Info "Task registered; verify its execution history and storage capacity."
}
$folder = if ($Destination) { $Destination } else { New-BackupFolder -Root $root }
if (-not (Test-Path -LiteralPath $folder)) { New-Item -ItemType Directory -Path $folder | Out-Null }
& node scripts/sqlite-maintenance.mjs backup --output (Join-Path $folder "slotly.db")
if ($LASTEXITCODE -ne 0) { throw "Backup failed; do not treat the destination as recoverable until reviewed." }
Write-Ok "Verified database snapshot created. Keep is a legacy argument: NO backups were automatically deleted."
Write-Warn "Contains sensitive data. Protect/encrypt it and test restore to a NEW path. Uploads and private .env keys are not included."
if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
