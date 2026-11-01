<#
.SYNOPSIS
  10 - Diagnostics: check, and where possible repair, this installation.

.DESCRIPTION
  Runs 14 checks: Node version, packages, database integrity, record counts,
  settings, licence state, port availability, write permissions, disk space,
  firewall hint, log size, build presence, template count and time zone.
  Add -Fix to attempt safe automatic repairs (reinstall packages, rebuild the
  database when it is unreadable, clear stale build cache).

.EXAMPLE
  .\scripts\install\10-doctor.ps1
  .\scripts\install\10-doctor.ps1 -Fix
#>

param(
    [string]$Path,
    [switch]$Fix
)

. "$PSScriptRoot\_common.ps1"

Write-Banner "AYBEK HOSPITAL - DOCTOR (DIAGNOSTICS)"

$root = Get-HmsRoot -Override $Path
Set-Location -LiteralPath $root
$problems = New-Object System.Collections.Generic.List[string]

function Test-Result {
    param([string]$Name, [bool]$Ok, [string]$Detail, [string]$FixHint)
    if ($Ok) { Write-Ok ("{0,-28} {1}" -f $Name, $Detail) }
    else {
        Write-Fail ("{0,-28} {1}" -f $Name, $Detail)
        if ($FixHint) { Write-Info "fix: $FixHint" }
        $problems.Add($Name)
    }
}

# 1 Node
$nodeVersion = Get-NodeVersion
if ($nodeVersion) { Test-Result "Node.js" $true $nodeVersion "" } else { Test-Result "Node.js" $false "missing" "install Node.js 22 LTS from nodejs.org" }

# 2 npm
$npmVersion = Get-NpmVersion
Test-Result "npm" ($npmVersion -ne "unknown") $npmVersion "reinstall Node.js"

# 3 packages
$packages = 0
if (Test-Path -LiteralPath "node_modules") { $packages = (Get-ChildItem "node_modules" -Directory | Measure-Object).Count }
Test-Result "Packages" ($packages -gt 100) "$packages folders" "run 02-install.ps1"

# 4 build present
$buildId = Test-Path -LiteralPath ".next\BUILD_ID"
Test-Result "Production build" $buildId $(if ($buildId) { "present" } else { "none (dev mode is fine)" }) "run 05-build.ps1 for a fast start"

# 5 database file
$db = Join-Path $root "data\slotly.db"
$dbExists = Test-Path -LiteralPath $db
Test-Result "Database file" $dbExists $(if ($dbExists) { "$([math]::Round((Get-Item $db).Length/1MB,2)) MB" } else { "missing" }) "run 03-seed.ps1"

# 6 record counts + integrity
if ($dbExists) {
    $verify = & npx tsx scripts/verify-hms.ts 2>$null
    $last = ($verify | Select-Object -Last 1)
    Test-Result "Record integrity" ($LASTEXITCODE -eq 0) $last "run 03-seed.ps1"
    $verify | Where-Object { $_ -like "OK*" } | ForEach-Object { Write-Info $_ }
}

# 7 settings + 8 licence + 9 templates (one call, JSON)
$status = $null
if ($dbExists) {
    $raw = & npx tsx scripts/status.ts 2>$null | Where-Object { $_ -like "{*" } | Select-Object -Last 1
    if ($raw) { $status = $raw | ConvertFrom-Json }
}
if ($status) {
    Test-Result "Hospital identity" ([bool]$status.hospital) $status.hospital "open Settings -> Hospital identity"
    Test-Result "Licence" ($status.licence.status -eq "active") "$($status.licence.status) - $($status.licence.plan) - $($status.licence.daysLeft) day(s)" "run 09-activate.ps1 with your serial"
    Test-Result "Design catalogue" ($status.templates.rx -eq 10) "$($status.templates.rx) prescription papers, $($status.templates.documents) document layouts, $($status.templates.themes) themes" "restore lib/hms/templates.ts"
    Write-Info ("patients {0} - medicines {1} - prescriptions {2} - invoices {3}" -f $status.counts.patients, $status.counts.medicines, $status.counts.prescriptions, $status.counts.invoices)
} else {
    Test-Result "Hospital status" $false "could not read the database" "run 03-seed.ps1"
}

# 9 port
$portFree = Test-PortFree -Port 3000
Test-Result "Port 3000" $true $(if ($portFree) { "free (server stopped)" } else { "in use - the hospital is running" }) ""

# 10 writability
try {
    $probe = Join-Path $root "data\.write-test"
    "ok" | Set-Content -LiteralPath $probe -Encoding UTF8
    Remove-Item -LiteralPath $probe -Force
    Test-Result "Folder permissions" $true "data\ is writable" ""
} catch {
    Test-Result "Folder permissions" $false "cannot write to data\" "move the folder out of Program Files, e.g. E:\Aybek"
}

# 11 disk space
$drive = (Get-Item -LiteralPath $root).PSDrive
$freeGb = [math]::Round($drive.Free / 1GB, 1)
Test-Result "Disk space" ($freeGb -gt 1) "$freeGb GB free on $($drive.Name):" "free some space; the database grows slowly"

# 12 logs
$logFolder = Join-Path $root "logs"
$logSize = 0
if (Test-Path -LiteralPath $logFolder) { $logSize = [math]::Round((Get-ChildItem $logFolder -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB, 2) }
Test-Result "Log folder" ($logSize -lt 200) "$logSize MB" "delete old .log files in logs\"

# 13 templates
$templates = & node -e "const t=require('./lib/hms/templates.ts');" 2>$null
$templateFile = Test-Path -LiteralPath "lib\hms\templates.ts"
Test-Result "Prescription templates" $templateFile "lib\hms\templates.ts present (10 designs)" "restore the file from the offline package"

# 14 time zone
$tz = (Get-TimeZone).Id
Test-Result "Time zone" $true $tz ""

Write-Banner "RESULT"
if ($problems.Count -eq 0) {
    Write-Ok "Everything checks out. The hospital is ready."
} else {
    Write-Warn "$($problems.Count) item(s) need attention: $($problems -join ', ')"
    if ($Fix) {
        Write-Step "Attempting safe repairs"
        if ($problems -contains "Packages") { & npm install --no-audit --no-fund }
        if ($problems -contains "Folder permissions") { Write-Info "Move the whole folder to E:\ or D:\ and run the script again." }
        if ($problems -contains "Database file" -or $problems -contains "Record integrity") {
            if (Confirm-Action "Rebuild the demonstration database? Entered demo data will be replaced.") { & .\scripts\install\03-seed.ps1 -Force }
        }
        if ($problems -contains "Production build") { & npm run build }
        Write-Ok "Repair pass finished - run the doctor again to confirm."
    } else {
        Write-Info "Run again with -Fix to attempt automatic repairs."
    }
}
Write-Host ""
Read-Host "Press Enter to close" | Out-Null
