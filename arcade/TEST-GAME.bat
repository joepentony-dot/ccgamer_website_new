@echo off
setlocal
cd /d "%~dp0.."

echo.
echo CHEEKY'S COMMODORE QUEST - LOCAL TEST
echo ======================================
echo.
echo Starting a local web server for the current repository branch.
echo Game URL: http://localhost:8766/arcade/quest/
echo.

where py >nul 2>nul
if not errorlevel 1 (
  start "CCG Quest Test Server" cmd /k "cd /d "%CD%" && py -3 -m http.server 8766"
  goto launch
)

where python >nul 2>nul
if not errorlevel 1 (
  start "CCG Quest Test Server" cmd /k "cd /d "%CD%" && python -m http.server 8766"
  goto launch
)

echo Python was not found on this PC.
echo Install Python or use another local web server, then open:
echo http://localhost:8766/arcade/quest/
pause
exit /b 1

:launch
timeout /t 2 /nobreak >nul
start "" "http://localhost:8766/arcade/quest/"
echo.
echo The game should now be open in your browser.
echo Leave the separate server window open while testing.
echo Close that server window when you are finished.
echo.
pause
