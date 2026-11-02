[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
& '.venv/Scripts/python.exe' -m scripts.manage backup $Destination
if ($LASTEXITCODE -ne 0) { throw 'Backup failed.' }
