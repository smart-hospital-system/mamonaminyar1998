[CmdletBinding()]
param([string]$InstallPath)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Hospital.Common.psm1') -Force
$root=Get-HospitalRoot $InstallPath
Invoke-HospitalPython -Root $root -Arguments @('-m','scripts.verify_release')
Invoke-HospitalPython -Root $root -Arguments @('-m','pip','check')
Start-Process -FilePath (Join-Path $root 'docs\UPGRADE_V04_FA.html')
Write-Host 'Verification passed. Clinical use still requires local security/clinical acceptance and tested backups.'
