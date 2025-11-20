@echo off
echo.
echo ========================================
echo   CodeArena Backend Server
echo ========================================
echo.
echo Starting server with NEW code...
echo.
cd /d "%~dp0"
node src\server.js
pause
