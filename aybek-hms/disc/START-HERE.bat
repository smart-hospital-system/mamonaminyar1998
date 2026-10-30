@echo off
setlocal
title Aybek Ten-Bed Specialy Surgical Hospital - install from disc
cd /d "%~dp0"

echo ==============================================================
echo   Aybek Ten-Bed Specialy Surgical Hospital   -   version 6
echo   Installing from this disc onto the local disk
echo ==============================================================
echo.
echo   Persian guide ....... RAHNAMA-FA.html  (open in a browser)
echo   English guide ....... DOCS\INSTALL-WINDOWS.md
echo   Give to a colleague . COPY-TO-ANOTHER-PC\*.zip
echo.

rem ---------------------------------------------------------------- Node.js
where node >nul 2>nul
if errorlevel 1 goto nonode
for /f "tokens=1 delims=v." %%a in ('node -v') do set MAJOR=%%a
if not defined MAJOR goto nonode
if %MAJOR% LSS 20 goto oldnode

rem ---------------------------------------------------------------- target
set "TARGET=C:\AybekHMS"
if exist "%TARGET%\package.json" goto update

echo [1/5] Copying the hospital to %TARGET% ...
robocopy "%~dp0APP" "%TARGET%" /E /NFL /NDL /NJH /NJS /NP /XF slotly.db slotly.db-wal slotly.db-shm >nul
if errorlevel 8 goto copyfail
goto copied

:update
echo A copy already exists in %TARGET%.
choice /C YN /M "  Update the program files and keep the existing patient data"
if errorlevel 2 goto cancelled
echo [1/5] Updating the program in %TARGET% ...
robocopy "%~dp0APP" "%TARGET%" /E /NFL /NDL /NJH /NJS /NP /XF slotly.db slotly.db-wal slotly.db-shm >nul
if errorlevel 8 goto copyfail
goto copied

:copied
echo [1/5] Copy finished.
cd /d "%TARGET%"

rem ---------------------------------------------------------------- env check
echo.
echo [2/5] Checking the computer
powershell -NoProfile -ExecutionPolicy Bypass -File "%TARGET%\aybek-hms\scripts\install\01-setup.ps1" -NoPause
if errorlevel 1 goto failed

rem ---------------------------------------------------------------- packages
echo.
echo [3/5] Installing the program libraries (first time only, 3-10 minutes)
if exist "%TARGET%\node_modules\next" (
    echo     Already installed - skipping.
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%TARGET%\aybek-hms\scripts\install\02-install.ps1" -NoPause
    if errorlevel 1 goto failed
)

rem ---------------------------------------------------------------- data
echo.
echo [4/5] Preparing the database
if exist "%TARGET%\data\slotly.db" (
    echo     Database found - keeping the existing patients.
) else (
    if exist "%TARGET%\data\demo-hospital.db" (
        echo     Installing the demonstration hospital that ships on this disc.
        copy /Y "%TARGET%\data\demo-hospital.db" "%TARGET%\data\slotly.db" >nul
    ) else (
        powershell -NoProfile -ExecutionPolicy Bypass -File "%TARGET%\aybek-hms\scripts\install\03-seed.ps1" -NoPause
        if errorlevel 1 goto failed
    )
)

echo.
echo [5/5] Starting the server - keep this window open while you work.
echo       The browser opens by itself as soon as the hospital is ready.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%TARGET%\aybek-hms\scripts\install\04-start.ps1"
goto done

rem ---------------------------------------------------------------- errors
:nonode
echo.
echo [X] Node.js was not found on this computer.
echo.
echo     Install Node.js 20 LTS or newer, then double-click START-HERE.bat again.
echo     Online .... https://nodejs.org/en/download
echo     Offline ... put the installer in TOOLS\ and read
echo                 TOOLS\PUT-NODEJS-INSTALLER-HERE.txt
echo.
echo     Persian explanation: RAHNAMA-FA.html - section 6
pause
exit /b 1

:oldnode
echo.
echo [X] This computer has an old Node.js. Version 20 or newer is required.
echo     Remove the old one, install the new one, run this file again.
pause
exit /b 1

:copyfail
echo.
echo [X] Could not copy the files to %TARGET%.
echo     Close any window that is using that folder, or right-click
echo     START-HERE.bat and choose "Run as administrator".
pause
exit /b 1

:failed
echo.
echo [X] A setup step failed. The message above says why.
echo     For a full diagnosis run:
echo        powershell -ExecutionPolicy Bypass -File "%TARGET%\aybek-hms\scripts\install\10-doctor.ps1"
pause
exit /b 1

:cancelled
echo Nothing was changed.
pause
exit /b 0

:done
echo.
echo The server stopped. Your data is in %TARGET%\data\slotly.db
pause
exit /b 0
