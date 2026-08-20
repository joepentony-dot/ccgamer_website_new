@echo off
setlocal
cd /d "%~dp0\..\.."
echo.
echo CHEEKY COMMODORE QUEST - DEVELOPMENT TEST SERVER
echo ==================================================
echo.
echo Serving the repository at http://localhost:8765/
echo Game: http://localhost:8765/dev/ccg-quest/
echo.
echo Leave this window open while testing.
echo Press Ctrl+C here when you are finished.
echo.
start "" "http://localhost:8765/dev/ccg-quest/"
py -3 -m http.server 8765
if errorlevel 1 python -m http.server 8765
endlocal
