<#
.SYNOPSIS
  04 - Start the hospital and open it in the browser.

.DESCRIPTION
  Starts the Next.js server on this machine (all interfaces, so tablets and
  the reception PC can connect too), waits until it answers, then opens the
  sign-in page. Press Ctrl+C in this window to stop the hospital.

.PARAMETER Mode
  dev    - development server, recompiles as files change (default when no
           production build exists)
  prod   - production server (fast; needs step 05 first)

.EXAMPLE
  .\scripts\install\04-start.ps1
  .\scripts\install\04-start.ps1 -Mode prod -Port 3000
#>

param(
    [string]$Path,
    [ValidateSet("auto", "dev", "prod")]
    [string]$Mode = "auto",
    [int]$Port = 3000,
    [switch]$NoBrowser
)

. "$PSScriptRoot\_common.ps1"

Write-Banner "AYBEK HOSPITAL - STEP 4: START THE SYSTEM"

$root = Get-HmsRoot -Override $Path
Set-Location -LiteralPath $root
Assert-Node -MinimumMajor 20 | Out-Null

if (-not (Test-Path -LiteralPath (Join-Path $root "node_modules\next"))) {
    Stop-WithMessage "The packages are not installed yet." "Run .\scripts\install\02-install.ps1 first."
}
if (-not (Test-Path -LiteralPath (Join-Path $root "data\slotly.db"))) {
    Write-Warn "No database found - the hospital will seed itself on first request."
}

$buildId = Join-Path $root ".next\BUILD_ID"
if ($Mode -eq "auto") { $Mode = if (Test-Path -LiteralPath $buildId) { "prod" } else { "dev" } }

if (-not (Test-PortFree -Port $Port)) {
    Write-Warn "Port $Port is busy - another copy is probably running."
    if (Confirm-Action "Open the browser on http://localhost:$Port instead of starting a second copy?" -DefaultYes) {
        if (-not $NoBrowser) { Open-HmsUrl -Path "/hms/login" -Port $Port }
        exit 0
    }
    $Port = $Port + 1
    Write-Info "Starting on port $Port instead."
}

$env:NODE_OPTIONS = "--max-old-space-size=4096"
$env:PORT = "$Port"

if ($Mode -eq "prod") {
    if (-not (Test-Path -LiteralPath $buildId)) {
        Stop-WithMessage "There is no production build in .next yet." "Run .\scripts\install\05-build.ps1, or start in development mode: .\scripts\install\04-start.ps1 -Mode dev"
    }
    Write-Step "Starting the production server on port $Port"
    $command = "npm run start -- -p $Port"
} else {
    Write-Step "Starting the development server on port $Port (first page takes ~20 s)"
    $command = "npm run dev -- -p $Port"
}

# Tell the user where to connect from other devices.
$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
        Select-Object -First 1).IPAddress
Write-Info "This computer : http://localhost:$Port/hms/login"
if ($ip) { Write-Info "Other devices : http://${ip}:$Port/hms/login" }
Write-Host ""
Write-Host "  Keep this window open while the hospital is in use." -ForegroundColor Yellow
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""

# Open the browser as soon as the server answers.
if (-not $NoBrowser) {
    Start-Job -ScriptBlock {
        param($p)
        for ($i = 0; $i -lt 120; $i++) {
            try {
                $r = Invoke-WebRequest -Uri "http://localhost:$p/hms/login" -UseBasicParsing -TimeoutSec 2
                if ($r.StatusCode -eq 200) { Start-Process "http://localhost:$p/hms/login"; break }
            } catch { Start-Sleep -Seconds 1 }
        }
    } -ArgumentList $Port | Out-Null
}

Invoke-Expression $command
