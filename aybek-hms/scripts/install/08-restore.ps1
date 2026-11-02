<#
.SYNOPSIS
  08 - Restore a backup.

.DESCRIPTION
  Lists the backups in backups\, asks which one to restore, backs up the
  current database first, then puts the chosen copy back and re-applies the
  saved settings. The server must be stopped.

.EXAMPLE
  .\scripts\install\08-restore.ps1
  .\scripts\install\08-restore.ps1 -Backup "E:\Aybek\backups\2026-10-29_1830"
#>

param(
    [string]$Path,
    [string]$Backup
)

. "$PSScriptRoot\_common.ps1"

Write-Banner "AYBEK HOSPITAL - RESTORE"

$root = Get-HmsRoot -Override $Path
Set-Location -LiteralPath $root

if (-not (Test-PortFree -Port 3000)) {
    Stop-WithMessage "The hospital server is still running." "Close the server window (Ctrl+C) and run this script again."
}

$backupsRoot = Join-Path $root "backups"
if (-not $Backup) {
    $all = Get-ChildItem -LiteralPath $backupsRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
    if (-not $all) { Stop-WithMessage "No backups found in $backupsRoot." "Run 07-backup.ps1 first, or pass -Backup with a folder path." }
    Write-Step "Available backups"
    $i = 1
    foreach ($b in $all) { Write-Host ("  [{0}] {1}  ({2})" -f $i, $b.Name, (Get-Item $b.FullName).LastWriteTime); $i++ }
    $choice = Read-Host "Which number should be restored?"
    $Backup = $all[[int]$choice - 1].FullName
}

if (-not (Test-Path -LiteralPath $Backup)) { Stop-WithMessage "Backup folder not found: $Backup" }
$dbFile = Join-Path $Backup "slotly.db"
if (-not (Test-Path -LiteralPath $dbFile)) { Stop-WithMessage "That folder does not contain slotly.db." "Choose a folder created by 07-backup.ps1." }

Write-Step "Saving the current database first"
$safety = New-BackupFolder -Root $root
Copy-Item -LiteralPath (Join-Path $root "data\slotly.db") -Destination (Join-Path $safety "slotly.db") -Force -ErrorAction SilentlyContinue
Write-Ok "Current state saved to $safety"

Write-Step "Restoring $Backup"
foreach ($name in @("slotly.db", "slotly.db-wal", "slotly.db-shm")) {
    $src = Join-Path $Backup $name
    if (Test-Path -LiteralPath $src) { Copy-Item -LiteralPath $src -Destination (Join-Path $root "data\$name") -Force }
}
$settingsFile = Join-Path $Backup "settings.json"
if (Test-Path -LiteralPath $settingsFile) {
    & npx tsx scripts/settings-import.ts $settingsFile
}

Write-Step "Verifying the restored database"
& npx tsx scripts/verify-hms.ts | Select-Object -Last 4

Write-Banner "RESTORE COMPLETE"
Write-Info "Start the hospital again with .\scripts\install\04-start.ps1"
Write-Host ""
Read-Host "Press Enter to close" | Out-Null
