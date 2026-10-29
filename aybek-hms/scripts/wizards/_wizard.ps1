<#
  Shared engine for the department wizards.
  Each wizard calls:  Invoke-DepartmentWizard -Name "Pharmacy" -Path "/hms/pharmacy" -Steps @( ... ) -Login "zahra@aybek.hospital"
#>

function Invoke-DepartmentWizard {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string[]]$Steps,
        [string]$Login = "doctor@aybek.hospital",
        [string]$Password = "mamonaminyar",
        [int]$Port = 3000
    )

    Write-Host ""
    Write-Host ("=" * 74) -ForegroundColor DarkCyan
    Write-Host "  $Name WIZARD - Aybek Ten-Bed Specialy Surgical Hospital" -ForegroundColor Cyan
    Write-Host ("=" * 74) -ForegroundColor DarkCyan
    Write-Host ""

    # 1. is the server up?
    $base = "http://localhost:$Port"
    $up = $false
    try {
        $r = Invoke-WebRequest -Uri "$base/hms/login" -UseBasicParsing -TimeoutSec 4
        $up = ($r.StatusCode -eq 200)
    } catch { $up = $false }

    if (-not $up) {
        Write-Host "  The hospital server is not running." -ForegroundColor Yellow
        if (-not (Confirm-Action "Start it now in a new window?" -DefaultYes)) {
            Write-Host "  Start it later with .\scripts\install\04-start.ps1" -ForegroundColor Gray
            Read-Host "Press Enter to close" | Out-Null
            return
        }
        $starter = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "install\04-start.ps1"
        Start-Process powershell -ArgumentList "-NoExit","-ExecutionPolicy","Bypass","-File","`"$starter`"","-NoBrowser"
        for ($i = 0; $i -lt 90; $i++) {
            Start-Sleep -Seconds 2
            try {
                $r = Invoke-WebRequest -Uri "$base/hms/login" -UseBasicParsing -TimeoutSec 2
                if ($r.StatusCode -eq 200) { $up = $true; break }
            } catch { }
        }
        if (-not $up) {
            Write-Host "  The server did not answer in three minutes. Check the other window for errors." -ForegroundColor Red
            Read-Host "Press Enter to close" | Out-Null
            return
        }
    }
    Write-Host "  Server is running at $base" -ForegroundColor Green
    Write-Host ""

    # 2. the checklist
    Write-Host "  Your shift, step by step" -ForegroundColor Cyan
    Write-Host "  ------------------------"
    $i = 1
    foreach ($s in $Steps) {
        Write-Host ("  {0}. {1}" -f $i, $s)
        $i++
    }
    Write-Host ""
    Write-Host "  Sign in as : $Login" -ForegroundColor Yellow
    Write-Host "  Password   : $Password" -ForegroundColor Yellow
    Write-Host ""

    # 3. open the right screen
    $url = "$base$Path"
    if (Confirm-Action "Open $url now?" -DefaultYes) { Start-Process $url }

    Write-Host ""
    Write-Host "  Everything you do here is written to the audit trail, and the" -ForegroundColor DarkGray
    Write-Host "  health monitor checks your department every 30 minutes." -ForegroundColor DarkGray
    Write-Host ""
    Read-Host "Press Enter to close" | Out-Null
}
