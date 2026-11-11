@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
echo Node.js is not found.
echo Please install Node.js first, then restart your PC and try again.
pause
exit /b 1
)
if exist serviceAccountKey.json (
if not exist node_modules\firebase-admin (
echo First time setup: installing Firebase library. Please wait...
call npm install --no-audit --no-fund
if errorlevel 1 (
echo npm install failed. Check your internet connection and try again.
pause
exit /b 1
)
)
)
echo Starting Bike GO! server...
echo Do not close this window.
node server.js
pause
