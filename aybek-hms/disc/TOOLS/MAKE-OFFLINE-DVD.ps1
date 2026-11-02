<#
.SYNOPSIS
  Builds a completely offline disc: the hospital plus its program libraries,
  so the target computer never needs the internet.

.DESCRIPTION
  The disc that ships with the project is small (about 35 MB) because the
  program libraries are normally downloaded once during installation. This
  script copies those libraries (node_modules, about 500 MB) into the disc
  folder, together with the Node.js installer if you put it in TOOLS first.

  The result fits on a DVD, or on a 700 MB CD when the libraries are the
  slim production set.

.PARAMETER Target
  Folder that will hold the offline disc. Default: C:\AybekDVD-Offline

.PARAMETER App
  The installed hospital folder that already has node_modules.
  Default: C:\AybekHMS

.PARAMETER NodeInstaller
  Full path to the Node.js .msi (node-v22.x.x-x64.msi). Optional, but without
  it the offline computer must install Node.js from somewhere else.

.PARAMETER Iso
  Also build an .iso from the result.

.PARAMETER Burn
  Burn the finished image; needs -Drive.

.EXAMPLE
  .\MAKE-OFFLINE-DVD.ps1 -Target "D:\AybekDVD-Offline" -NodeInstaller "C:\Users\Mamon\Downloads\node-v22.11.0-x64.msi"

.EXAMPLE
  .\MAKE-OFFLINE-DVD.ps1 -Target "D:\AybekDVD" -NodeInstaller "C:\node.msi" -Iso "D:\Aybek-offline.iso" -Burn -Drive "E:"
#>

param(
    [string]$Target = "C:\AybekDVD-Offline",
    [string]$App = "C:\AybekHMS",
    [string]$NodeInstaller,
    [string]$Iso,
    [switch]$Burn,
    [string]$Drive
)

$ErrorActionPreference = "Stop"

function Say($m)  { Write-Host "  $m" }
function Ok($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "  [X]  $m" -ForegroundColor Red; exit 1 }

$disc = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "  AYBEK HOSPITAL - BUILD OFFLINE DISC" -ForegroundColor Cyan
Write-Host "  -----------------------------------"
Say "Disc master : $disc"
Say "Installed app: $App"
Say "Output      : $Target"
Write-Host ""

if (-not (Test-Path -LiteralPath (Join-Path $disc "APP"))) { Die "Run this from the TOOLS folder of the Aybek disc." }
if (-not (Test-Path -LiteralPath $App)) {
    Die ("The installed hospital was not found at " + $App + ". Install it first with START-HERE.bat, or pass -App <folder>.")
}
if (-not (Test-Path -LiteralPath (Join-Path $App "node_modules"))) {
    Die ("No node_modules in " + $App + ". Run 02-install.ps1 there first, so the libraries exist to copy.")
}

# ------------------------------------------------------------------ copy disc
Say "1/4  Copying the disc content ..."
if (Test-Path -LiteralPath $Target) {
    Warn "Target already exists - updating it."
} else {
    New-Item -ItemType Directory -Path $Target | Out-Null
}
robocopy $disc $Target /E /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Die "Copy failed. Try running PowerShell as administrator." }
Ok "Disc content copied."

# ------------------------------------------------------------------ libraries
Say "2/4  Copying the program libraries (this takes a few minutes, about 500 MB) ..."
$destModules = Join-Path $Target "APP\node_modules"
robocopy (Join-Path $App "node_modules") $destModules /E /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Die "Could not copy node_modules." }

$optional = @(".next")
foreach ($extra in $optional) {
    $src = Join-Path $App $extra
    if (Test-Path -LiteralPath $src) {
        robocopy $src (Join-Path $Target ("APP\" + $extra)) /E /NFL /NDL /NJH /NJS /NP | Out-Null
    }
}
Ok "Libraries copied."

# ------------------------------------------------------------------ Node.js
Say "3/4  Looking for the Node.js installer ..."
$nodeTarget = Join-Path $Target "INSTALL-NODEJS-FIRST"
New-Item -ItemType Directory -Force -Path $nodeTarget | Out-Null

$found = $null
if ($NodeInstaller) {
    if (Test-Path -LiteralPath $NodeInstaller) { $found = $NodeInstaller }
    else { Warn "Not found: $NodeInstaller" }
}
if (-not $found) {
    $candidate = Get-ChildItem -LiteralPath (Join-Path $disc "TOOLS") -Filter "node-*-x64.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($candidate) { $found = $candidate.FullName }
}
if ($found) {
    Copy-Item -LiteralPath $found -Destination $nodeTarget -Force
    Ok ("Node.js installer included: " + (Split-Path $found -Leaf))
} else {
    Warn "No Node.js installer found. The offline computer must install Node.js 20+ separately."
    Warn "Put node-vXX.x.x-x64.msi into TOOLS and run this script again, or pass -NodeInstaller <path>."
}

# ------------------------------------------------------------------ note
$note = @"
AYBEK TEN-BED SPECIALY SURGICAL HOSPITAL - OFFLINE DISC
=======================================================

This disc already contains the program libraries, so the computer does NOT
need the internet.

  1. If the folder INSTALL-NODEJS-FIRST contains a .msi file, install it first
     (double-click, keep the default options). Skip this step if Node.js 20+
     is already on the computer.
  2. Double-click START-HERE.bat in the main disc folder.
  3. Sign in at http://localhost:3000 as doctor@aybek.hospital

Persian guide: RAHNAMA-FA.html
Built: $(Get-Date -Format 'yyyy-MM-dd HH:mm')
"@
Set-Content -LiteralPath (Join-Path $Target "READ-ME-OFFLINE.txt") -Value $note -Encoding UTF8
Ok "Offline note written."

# ------------------------------------------------------------------ report
Say "4/4  Done."
$size = (Get-ChildItem -LiteralPath $Target -Recurse -File | Measure-Object -Property Length -Sum).Sum
$mb = [math]::Round($size / 1MB, 0)
Ok ("Offline disc folder is ready: {0} ({1} MB)" -f $Target, $mb)
if ($mb -gt 700) {
    Say "This is larger than a CD (700 MB) - burn it to a DVD."
} else {
    Say "It fits on a standard CD (700 MB)."
}

if ($Iso -or $Burn) {
    if (-not $Iso) { $Iso = Join-Path (Split-Path $Target -Parent) "Aybek-offline.iso" }
    $isoScript = Join-Path $PSScriptRoot "MAKE-ISO.ps1"
    if ($Burn) {
        & $isoScript -Source $Target -Iso $Iso -Burn -Drive $Drive
    } else {
        & $isoScript -Source $Target -Iso $Iso
    }
} else {
    Write-Host ""
    Say "Next: insert a blank DVD and copy the folder to it with Windows Explorer,"
    Say "or run:  .\MAKE-ISO.ps1 -Source `"$Target`" -Iso `"D:\Aybek-offline.iso`" -Burn -Drive E:"
}
