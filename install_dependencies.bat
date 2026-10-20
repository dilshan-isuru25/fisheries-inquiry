@echo off
title IT Complaint System - Installer
cd /d "%~dp0"
echo ===================================================
echo Installing Required Dependencies
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
    echo Please install Python (and make sure to check "Add Python to PATH" during installation).
    pause
    exit /b 1
)

echo [1/2] Installing Python backend packages...
%PYTHON_CMD% -m pip install -r requirements.txt

echo.
echo [2/2] Checking Frontend dependencies...
if exist "frontend\node_modules" (
    echo Frontend node_modules folder is already present.
) else (
    echo Installing frontend npm packages (this may take a few minutes)...
    cd frontend
    call npm install
    cd ..
)

echo.
echo ===================================================
echo All dependencies installed successfully!
echo You can now run 'run_all.bat' to start the system.
echo ===================================================
pause
