[CmdletBinding()]
param([string]$InstallPath,[switch]$Watch,[switch]$Demo)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Hospital.Common.psm1') -Force
$root=Get-HospitalRoot $InstallPath
$db=Join-Path $root '.data\ash.sqlite3'
if ($Demo) { $db=Join-Path $root '.data\demo.sqlite3' }
$arguments=@('-m','scripts.healthcheck','--db',$db)
if ($Watch) { $arguments+='--watch' }
Invoke-HospitalPython -Root $root -Arguments $arguments
