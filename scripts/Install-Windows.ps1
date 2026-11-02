[CmdletBinding()]
param([switch]$Offline)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
Get-Command python -ErrorAction Stop | Out-Null
& python -c "import sys; assert sys.version_info >= (3,11), 'Python 3.11+ required'"
if ($LASTEXITCODE -ne 0) { throw 'Python 3.11+ is required.' }
if (-not (Test-Path '.venv/Scripts/python.exe')) {
    & python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Could not create virtual environment.' }
}
$Python = Join-Path $Root '.venv/Scripts/python.exe'
if ($Offline) {
    if (-not (Test-Path 'wheelhouse')) { throw 'Offline wheelhouse is missing.' }
    & $Python -m pip install --no-index --find-links wheelhouse -r requirements.txt
} else {
    & $Python -m pip install -r requirements.txt
}
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
& $Python -m pip check
if ($LASTEXITCODE -ne 0) { throw 'Dependency validation failed.' }
if (-not (Test-Path '.data/ash.sqlite3')) {
    & $Python -m scripts.manage init
    if ($LASTEXITCODE -ne 0) { throw 'Administrator setup failed.' }
} else {
    Write-Host 'Existing database preserved; setup skipped.'
}
Write-Host 'Setup complete. Run: .\scripts\Start-Windows.ps1'
