[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Hospital.Common.psm1') -Force
Push-Location (Get-PackageRoot)
try {
    Invoke-SystemPython -Arguments @('-c',"import os,sys,struct; assert os.name=='nt' and sys.version_info[:2]==(3,11) and struct.calcsize('P')==8, 'Windows CPython 3.11 x64 required'; print(sys.version)")
    Invoke-SystemPython -Arguments @('-m','scripts.verify_release')
    Write-Host 'Next: .\powershell\02-Install-Hospital.ps1 (offline by default)'
} finally { Pop-Location }
