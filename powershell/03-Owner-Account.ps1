[CmdletBinding()]
param([string]$InstallPath,[string]$Username='owner',[switch]$EnableExistingOwner)
$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'Hospital.Common.psm1') -Force
$root=Get-HospitalRoot $InstallPath
$db=Join-Path $root '.data\ash.sqlite3'
if ($EnableExistingOwner) {
    if ((Read-Host 'Stop server and back up first. Type GRANT to enable physician-owner') -cne 'GRANT') { throw 'Cancelled.' }
    Invoke-HospitalPython -Root $root -Arguments @('-m','scripts.manage','--db',$db,'enable-owner-doctor','--username',$Username)
} elseif (Test-Path -LiteralPath $db) {
    Write-Host 'Existing database/account preserved. No reset, password change or duplicate owner.'
} else {
    Invoke-HospitalPython -Root $root -Arguments @('-m','scripts.manage','--db',$db,'init','--username',$Username,'--physician-owner')
}
