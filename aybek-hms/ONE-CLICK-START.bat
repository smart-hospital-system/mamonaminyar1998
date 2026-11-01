@echo off
REM Start the hospital (production build if it exists, otherwise dev mode).
title Aybek Hospital
color 0A
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install\04-start.ps1"
