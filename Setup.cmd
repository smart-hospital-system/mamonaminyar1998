@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
    py -3.11 -m scripts.setup_wizard
) else (
    python -m scripts.setup_wizard
)
if errorlevel 1 (
    echo.
    echo Setup did not finish. Windows x64 and CPython 3.11 x64 must be installed.
    echo The package does not include a Python installer. See docs\UPGRADE_V04_FA.html.
    pause
)
endlocal
