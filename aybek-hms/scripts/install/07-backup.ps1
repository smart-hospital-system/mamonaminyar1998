<#
.SYNOPSIS
  07 - Back up the whole hospital (database, settings and reference files).

.DESCRIPTION
  Copies the SQLite database with its WAL files, the hospital settings, and
  the uploaded logo folder into a timestamped folder under backups\. Old
  backups are pruned so the disk never fills up.

.EXAMPLE
  .\scripts\install\07-backup.ps1
  .\scripts\install\07-backup.ps1 -Keep 30
#>

param(
    [string]$Path,
    [int]$Keep = 14,
    [string]$Destination
)

. "$PSScriptRoot\_common.ps1"

Write-Banner "AYBEK HOSPITAL - BACKUP"

$root = Get-HmsRoot -Override $Path
Set-Location -LiteralPath $root

if ($Destination) {
    $folder = $Destination
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
} else {
    $folder = New-BackupFolder -Root $root
}
Write-Step "Backing up to $folder"

$files = @(
    @{ from = "data\slotly.db";     to = "slotly.db" },
    @{ from = "data\slotly.db-wal"; to = "slotly.db-wal" },
    @{ from = "data\slotly.db-shm"; to = "slotly.db-shm" }
)
foreach ($f in $files) {
    $source = Join-Path $root $f.from
    if (Test-Path -LiteralPath $source) {
        Copy-Item -LiteralPath $source -Destination (Join-Path $folder $f.to) -Force
        Write-Info "copied $($f.from)"
    }
}

Write-Step "Exporting settings and licence"
& npx tsx scripts/settings-export.ts (Join-Path $folder "settings.json")
if ($LASTEXITCODE -ne 0) { Write-Warn "Settings export failed - the database copy is still valid." }

$uploads = Join-Path $root "public\uploads"
if (Test-Path -LiteralPath $uploads) {
    Copy-Item -LiteralPath $uploads -Destination (Join-Path $folder "uploads") -Recurse -Force
}

$manifest = @(
    "Aybek Ten-Bed Specialy Surgical Hospital - backup",
    "created : $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
    "machine : $env:COMPUTERNAME",
    "path    : $root"
) -join "`r`n"
$manifest | Set-Content -LiteralPath (Join-Path $folder "MANIFEST.txt") -Encoding UTF8

$size = [math]::Round((Get-ChildItem -LiteralPath $folder -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 2)
Write-Ok "Backup complete ($size MB)"

# ------------------------------------------------------------------- pruning
$backupsRoot = Join-Path $root "backups"
if ((Test-Path -LiteralPath $backupsRoot) -and -not $Destination) {
    $old = Get-ChildItem -LiteralPath $backupsRoot -Directory | Sort-Object Name -Descending | Select-Object -Skip $Keep
    foreach ($o in $old) {
        Remove-Item -LiteralPath $o.FullName -Recurse -Force
        Write-Info "pruned old backup $($o.Name)"
    }
}

Write-Banner "BACKUP FINISHED"
Write-Info "Keep a copy on another disk or USB stick - a backup on the same disk does not survive a disk failure."
Write-Host ""
Read-Host "Press Enter to close" | Out-Null
