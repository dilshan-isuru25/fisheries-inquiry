@echo off
title IT Complaint System - Launcher
cd /d "%~dp0"
echo ===================================================
echo Starting IT Complaint System (Backend + Frontend)
echo ===================================================
echo.

:: Check if MySQL is running on port 3306
netstat -ano | findstr :3306 >nul
if %ERRORLEVEL% NEQ 0 (
    echo [NOTICE] MySQL is not running on port 3306.
    echo Trying to start XAMPP MySQL...
    if exist "C:\xampp\mysql_start.bat" (
        start "" /min "C:\xampp\mysql_start.bat"
        timeout /t 3 /nobreak >nul
    ) else (
        echo [WARNING] Please open XAMPP Control Panel and Start MySQL!
    )
)

echo Starting Backend...
start "IT Complaint Backend" cmd /c "run_backend.bat"

timeout /t 2 /nobreak >nul

echo Starting Frontend...
start "IT Complaint Frontend" cmd /c "run_frontend.bat"

echo.
echo Both servers have been launched!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
