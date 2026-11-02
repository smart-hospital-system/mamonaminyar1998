[CmdletBinding()]
param([string]$InstallPath,[string]$Backup,[string]$NewDatabase)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Hospital.Common.psm1') -Force
$root=Get-HospitalRoot $InstallPath
if (-not $Backup) { $Backup=Read-Host 'Backup file path' }
if (-not $NewDatabase) { $NewDatabase=Read-Host 'NEW output database path (must not exist)' }
if ((Read-Host 'Stop server. Type RESTORE to restore to a NEW file only') -cne 'RESTORE') { throw 'Cancelled.' }
Invoke-HospitalPython -Root $root -Arguments @('-m','scripts.manage','restore',$Backup,$NewDatabase)
Write-Host 'Original database preserved. Validate new copy before explicitly selecting it. See guide.'
