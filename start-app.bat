@echo off
title COHO OpsHub Launcher
echo ====================================================
echo Starting COHO OpsHub - Property Operations Center...
echo ====================================================
echo.

:: Check if python is available to start a local server, otherwise open directly
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python detected. Starting lightweight local server on http://localhost:8080 ...
    start "" http://localhost:8080
    python -m http.server 8080
) else (
    echo [INFO] Opening COHO OpsHub directly in your browser...
    start "" "%~dp0index.html"
)

pause
