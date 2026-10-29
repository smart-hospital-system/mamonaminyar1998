<#
.SYNOPSIS
  03 - Build (or rebuild) the demonstration hospital database.

.DESCRIPTION
  Creates data\slotly.db with the complete demo hospital: 9 staff logins,
  26 patients, 10 beds, 32 medicines, dozens of prescriptions, laboratory and
  imaging orders, theatre cases, invoices, alarms and the 10 prescription
  templates. Prints the login list at the end.

  WARNING: rebuilding deletes the existing database. The script makes a backup
  first and asks for confirmation unless -Force is supplied.

.EXAMPLE
  .\scripts\install\03-seed.ps1
  .\scripts\install\03-seed.ps1 -Force
#>

param(
    [switch]$NoPause,
    [string]$Path,
    [switch]$Force,
    [switch]$KeepSettings
)

. "$PSScriptRoot\_common.ps1"

Write-Banner "AYBEK HOSPITAL - STEP 3: BUILD THE DATABASE"

$root = Get-HmsRoot -Override $Path
Set-Location -LiteralPath $root
Assert-Node -MinimumMajor 20 | Out-Null

$db = Join-Path $root "data\slotly.db"
if ((Test-Path -LiteralPath $db) -and -not $Force) {
    Write-Warn "A database already exists ($([math]::Round((Get-Item $db).Length/1MB,2)) MB)."
    if (-not (Confirm-Action "Rebuild it from scratch? All entered data would be lost.")) {
        Write-Info "Nothing was changed."
        if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
        exit 0
    }
}

# ------------------------------------------------------------------- backup
if (Test-Path -LiteralPath $db) {
    $folder = New-BackupFolder -Root $root
    Copy-Item -LiteralPath $db -Destination (Join-Path $folder "slotly.db") -Force
    Write-Ok "Existing database backed up to $folder"
}

# ------------------------------------------------------------------- settings
$settingsCopy = $null
if ($KeepSettings) {
    $settingsCopy = Join-Path $env:TEMP "aybek-settings-$([Guid]::NewGuid().ToString('N').Substring(0,6)).json"
    Write-Step "Preserving hospital identity and licence settings"
    & npx tsx scripts/settings-export.ts $settingsCopy
    if (Test-Path -LiteralPath $settingsCopy) { Write-Ok "Settings saved to $settingsCopy" }
}

# --------------------------------------------------------------------- seed
Write-Step "Clearing old database files"
& node scripts/reset-db.mjs
if ($LASTEXITCODE -ne 0) { Stop-WithMessage "Could not clear the old database." "Close the running hospital server (Ctrl+C) and run this script again." }

Write-Step "Seeding the demonstration hospital (this takes about 20 seconds)"
& npm run seed
if ($LASTEXITCODE -ne 0) { Stop-WithMessage "Seeding failed." "Run 'npm run seed' manually to see the full error message." }

Write-Step "Verifying the records"
& npx tsx scripts/verify-hms.ts
$verify = $LASTEXITCODE

if ($KeepSettings -and $settingsCopy -and (Test-Path -LiteralPath $settingsCopy)) {
    Write-Step "Re-applying the saved hospital identity"
    & npx tsx scripts/settings-import.ts $settingsCopy
    Write-Ok "Identity and licence restored (patients are the fresh demonstration set)"
}

Write-Banner "STEP 3 COMPLETE"
Write-Host ""
Write-Host "  DEMONSTRATION LOGINS (password for every account: mamonaminyar)" -ForegroundColor Cyan
Write-Host "  ---------------------------------------------------------------"
Write-Host "  doctor@aybek.hospital    Dr. Mamon Aminyar   owner / administrator"
Write-Host "  arash@aybek.hospital     Dr. Arash Shirazi   OPD physician"
Write-Host "  evelyn@aybek.hospital    Dr. Evelyn Reed     OPD physician"
Write-Host "  yusuf@aybek.hospital     Dr. Yusuf Karimi    consultant surgeon"
Write-Host "  zahra@aybek.hospital     Zahra Noori         pharmacist"
Write-Host "  samir@aybek.hospital     Samir Popal         laboratory"
Write-Host "  laila@aybek.hospital     Dr. Laila Aziz       radiology"
Write-Host "  nadia@aybek.hospital     Nadia Rahimi        nursing"
Write-Host "  reza@aybek.hospital      Reza Amin           reception"
Write-Host ""
if ($verify -ne 0) { Write-Warn "The verification reported empty tables - check the output above." }
Write-Info "Next: step 4 - start the hospital"
Write-Host "      .\scripts\install\04-start.ps1" -ForegroundColor Cyan
Write-Host ""
if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
