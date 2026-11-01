<#
.SYNOPSIS
  06 - Put the hospital on the desktop and (optionally) start it with Windows.

.DESCRIPTION
  Creates a desktop shortcut that starts the server and opens the login page,
  and can register a scheduled task so the hospital is ready after every
  reboot. Both can be removed again with -Remove.

.EXAMPLE
  .\scripts\install\06-shortcut.ps1
  .\scripts\install\06-shortcut.ps1 -AutoStart -Remove
#>

param(
    [string]$Path,
    [switch]$AutoStart,
    [switch]$Remove
)

. "$PSScriptRoot\_common.ps1"

Write-Banner "AYBEK HOSPITAL - SHORTCUTS & AUTO-START"

$root = Get-HmsRoot -Override $Path
$desktop = [Environment]::GetFolderPath("Desktop")
$linkPath = Join-Path $desktop "Aybek Hospital.lnk"
$taskName = "Aybek Hospital Server"

if ($Remove) {
    if (Test-Path -LiteralPath $linkPath) { Remove-Item -LiteralPath $linkPath -Force; Write-Ok "Desktop shortcut removed" }
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existing) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false; Write-Ok "Auto-start task removed" }
    Read-Host "Press Enter to close" | Out-Null
    exit 0
}

# --------------------------------------------------------------------- shortcut
$launcher = Join-Path $root "aybek-hms\scripts\install\04-start.ps1"
Write-Step "Creating the desktop shortcut"
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($linkPath)
$link.TargetPath = "powershell.exe"
$link.Arguments = "-NoExit -ExecutionPolicy Bypass -File `"$launcher`" -Path `"$root`""
$link.WorkingDirectory = $root
$link.IconLocation = "powershell.exe,0"
$link.Description = "Start Aybek Ten-Bed Specialy Surgical Hospital"
$link.Save()
Write-Ok "Shortcut created: $linkPath"

# -------------------------------------------------------------------- auto-start
if ($AutoStart) {
    Write-Step "Registering the auto-start task"
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-WindowStyle Minimized -ExecutionPolicy Bypass -File `"$launcher`" -Path `"$root`" -Mode prod -NoBrowser"
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2)
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
        -Description "Aybek Ten-Bed Specialy Surgical Hospital - local server" -RunLevel Highest -Force | Out-Null
    Write-Ok "The hospital will start automatically after every reboot"
    Write-Info "It still needs a production build: run 05-build.ps1 once."
}

Write-Banner "DONE"
Write-Info "Double-click "Aybek Hospital" on the desktop to start the system."
Write-Host ""
Read-Host "Press Enter to close" | Out-Null
