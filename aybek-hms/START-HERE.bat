@echo off
REM ===========================================================================
REM  Aybek Ten-Bed Specialy Surgical Hospital - one-click installation
REM  Runs scripts 01 -> 04 in the correct order and stops on the first error.
REM ===========================================================================
title Aybek Hospital - Installation
color 0B
cd /d "%~dp0.."

echo.
echo  ======================================================================
echo   AYBEK TEN-BED SPECIALY SURGICAL HOSPITAL
echo   Installation - steps 1 to 4
echo  ======================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\01-setup.ps1" -NoPause
if errorlevel 1 goto failed

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\02-install.ps1" -NoPause
if errorlevel 1 goto failed

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\03-seed.ps1" -NoPause
if errorlevel 1 goto failed

echo.
echo  Installation finished. Starting the hospital...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\04-start.ps1"
goto end

:failed
echo.
echo  ----------------------------------------------------------------------
echo   A step failed. Read the message above, fix it, then run START-HERE.bat
echo   again. Nothing was left half-installed - every step is safe to repeat.
echo  ----------------------------------------------------------------------
pause

:end
