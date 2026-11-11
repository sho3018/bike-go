@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist cloudflared.exe (
echo cloudflared.exe is not found in this folder.
pause
exit /b 1
)
curl -s -o nul http://localhost:3000/api/health
if errorlevel 1 (
echo Server is not running.
echo Please double-click start.bat first, wait for the server to start, then double-click start-tunnel.bat again.
pause
exit /b 1
)
echo Starting tunnel...
echo Do not close this window while sharing.
echo Your public URL will appear below. Look for https://....trycloudflare.com
echo Copy that URL and send it to your friends.
cloudflared.exe tunnel --url http://localhost:3000
pause
