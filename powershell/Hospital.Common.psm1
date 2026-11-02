Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Get-PackageRoot { return (Split-Path -Parent $PSScriptRoot) }
function Invoke-SystemPython {
    param([string[]]$Arguments)
    if (Get-Command py -ErrorAction SilentlyContinue) { & py -3.11 @Arguments }
    elseif (Get-Command python -ErrorAction SilentlyContinue) { & python @Arguments }
    else { throw 'Install official Windows CPython 3.11 x64 first. Python is not bundled.' }
    if ($LASTEXITCODE -ne 0) { throw 'Python command failed. Read the error above; no automatic overwrite/retry.' }
}
function Get-HospitalRoot {
    param([string]$InstallPath)
    if (-not $InstallPath) { $InstallPath=Read-Host 'Installed hospital folder (example E:\Aybek-Hospital)' }
    $path=(Resolve-Path -LiteralPath $InstallPath -ErrorAction Stop).Path
    if (-not (Test-Path -LiteralPath (Join-Path $path '.venv\Scripts\python.exe'))) { throw 'This is not an installed hospital folder. Run script 02 first.' }
    return $path
}
function Invoke-HospitalPython {
    param([string]$Root,[string[]]$Arguments)
    Push-Location -LiteralPath $Root
    try {
        & (Join-Path $Root '.venv\Scripts\python.exe') @Arguments
        if ($LASTEXITCODE -ne 0) { throw 'Hospital command failed. Read the cause above. Existing data is not overwritten.' }
    } finally { Pop-Location }
}
Export-ModuleMember -Function Get-PackageRoot,Invoke-SystemPython,Get-HospitalRoot,Invoke-HospitalPython
