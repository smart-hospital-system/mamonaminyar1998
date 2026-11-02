$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Python = Join-Path $Root '.venv/Scripts/python.exe'
if (-not (Test-Path $Python)) { throw 'Run Install-Windows.ps1 first.' }
Write-Host 'Local URL: http://127.0.0.1:8000 — Ctrl+C to stop.'
& $Python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --no-access-log
if ($LASTEXITCODE -ne 0) { throw 'Server failed. Read the error above.' }
