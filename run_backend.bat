@echo off
title IT Complaint System - Backend
cd /d "%~dp0"
echo ===================================================
echo Starting IT Complaint System - FastAPI Backend
echo ===================================================
echo.

set PYTHON_CMD=
py --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=py
) else (
    python --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set PYTHON_CMD=python
    )
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python was not found!
    echo Please install Python and make sure to check "Add Python to PATH".
    pause
    exit /b 1
)

:: Start Backend
echo Starting server on http://0.0.0.0:8000 ...
%PYTHON_CMD% main.py
pause
