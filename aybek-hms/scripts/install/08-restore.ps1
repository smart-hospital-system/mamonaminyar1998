<#
.SYNOPSIS
  08 - Validate and restore to a NEW SQLite path; never overwrite the live hospital.
.DESCRIPTION
  Sessions in the new copy are invalidated. No automatic cutover or settings import.
  After independent verification, stop the server and explicitly select the new DB.
#>
param([string]$Path, [string]$Backup, [string]$RestoreTarget, [switch]$NoPause)
. "$PSScriptRoot\_common.ps1"
$root = Get-HmsRoot -Override $Path
Set-Location -LiteralPath $root
Assert-Node -MinimumMajor 22 | Out-Null
if (-not $Backup) { throw "Supply -Backup with the verified snapshot file or backup folder. No live files were modified." }
if (Test-Path -LiteralPath $Backup -PathType Container) { $Backup = Join-Path $Backup "slotly.db" }
if (-not $RestoreTarget) { $RestoreTarget = Join-Path $root (".data\restored_" + [Guid]::NewGuid().ToString("N") + ".db") }
& node scripts/sqlite-maintenance.mjs restore --source $Backup --output $RestoreTarget
if ($LASTEXITCODE -ne 0) { throw "Restore failed/refused. The current hospital was not replaced." }
Write-Ok "NEW restore verified; existing hospital unchanged."
Write-Info "After independent verification, stop ALL server instances. Then set this in .env.local and restart:"
Write-Host ("SLOTLY_DB_PATH=" + [IO.Path]::GetFullPath($RestoreTarget)) -ForegroundColor Cyan
Write-Warn "Upload files and private licence-signing keys need their own protected recovery. No automatic cutover occurred."
if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
