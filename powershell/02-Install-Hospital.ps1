[CmdletBinding()]
param([switch]$Online)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Hospital.Common.psm1') -Force
Push-Location (Get-PackageRoot)
try {
    Invoke-SystemPython -Arguments @('-m','scripts.verify_release')
    $arguments=@('-m','scripts.setup_wizard')
    if ($Online) { $arguments+='--online' }
    Invoke-SystemPython -Arguments $arguments
} finally { Pop-Location }
