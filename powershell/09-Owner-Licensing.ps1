[CmdletBinding()]
param([string]$InstallPath,[ValidateSet('Help','KeyGen','Issue','BuildCustomer')][string]$Action='Help')
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Hospital.Common.psm1') -Force
$root=Get-HospitalRoot $InstallPath
if ($Action -eq 'Help') {
    Write-Host 'Owner only: KeyGen -> BuildCustomer with PUBLIC key -> Issue signed activation file.'
    Write-Host 'Private keys/passphrases must stay outside all source, install and customer folders.'
    Write-Host 'You decide free/paid issuance. No payment service or theft-proof protection is included.'
} elseif ($Action -eq 'KeyGen') {
    $private=Read-Host 'Private key output OUTSIDE hospital/package folder'
    $public=Read-Host 'Public key output file'
    $full=[IO.Path]::GetFullPath($private)
    if ($full.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $full.StartsWith((Get-PackageRoot)+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Private key must be outside application and package.' }
    Invoke-HospitalPython -Root $root -Arguments @('-m','scripts.license_admin','keygen','--private',$private,'--public',$public)
} elseif ($Action -eq 'Issue') {
    $private=Read-Host 'Encrypted issuer PRIVATE key file (owner machine only)'
    $organization=Read-Host 'Customer organization'
    $id=Read-Host 'Installation ID shown by customer wizard'
    $days=Read-Host 'Validity days (1-3650)'
    $output=Read-Host 'NEW output activation JSON file'
    Invoke-HospitalPython -Root $root -Arguments @('-m','scripts.license_admin','issue','--private',$private,'--organization',$organization,'--installation-id',$id,'--days',$days,'--output',$output)
} else {
    $public=Read-Host 'Issuer PUBLIC key file (never private)'
    $output=Read-Host 'NEW customer ZIP output path'
    Invoke-HospitalPython -Root $root -Arguments @('-m','scripts.package_unified','--public-key',$public,'--output',$output,'--wheelhouse',(Join-Path $root 'wheelhouse'))
}
