@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Application environment missing. Run Setup.cmd first.
    pause
    exit /b 1
)
".venv\Scripts\python.exe" -m scripts.launcher
if errorlevel 1 pause
endlocal
