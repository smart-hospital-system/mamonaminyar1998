[CmdletBinding()]
param([string]$InstallPath,[switch]$Demo)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Hospital.Common.psm1') -Force
$root=Get-HospitalRoot $InstallPath
$db=Join-Path $root '.data\ash.sqlite3'
if ($Demo) { $db=Join-Path $root '.data\demo.sqlite3' }
if (-not (Test-Path -LiteralPath $db)) { throw 'Selected database does not exist. Complete setup or create demo first.' }
$old=$env:ASH_DB_PATH
try {
    $env:ASH_DB_PATH=$db
    Invoke-HospitalPython -Root $root -Arguments @('-m','scripts.launcher')
} finally { $env:ASH_DB_PATH=$old }
