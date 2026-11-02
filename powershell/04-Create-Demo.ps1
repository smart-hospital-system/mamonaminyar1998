[CmdletBinding()]
param([string]$InstallPath)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Hospital.Common.psm1') -Force
$root=Get-HospitalRoot $InstallPath
Invoke-HospitalPython -Root $root -Arguments @('-m','scripts.demo','--db',(Join-Path $root '.data\demo.sqlite3'))
Write-Host 'Demo username: owner. Next: script 05 with -Demo. Never enter real patient data.'
