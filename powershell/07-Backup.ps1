[CmdletBinding()]
param([string]$InstallPath,[string]$Destination,[switch]$Demo)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Hospital.Common.psm1') -Force
$root=Get-HospitalRoot $InstallPath
if (-not $Destination) { $Destination=Join-Path $root ('backups\snapshot-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.sqlite3') }
$db=Join-Path $root '.data\ash.sqlite3'
if ($Demo) { $db=Join-Path $root '.data\demo.sqlite3' }
Invoke-HospitalPython -Root $root -Arguments @('-m','scripts.manage','--db',$db,'backup',$Destination)
Write-Host 'Backup contains sensitive records and is not encrypted. Secure it and test a restore to NEW path.'
