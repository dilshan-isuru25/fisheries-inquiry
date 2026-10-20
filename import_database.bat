@echo off
title IT Complaint System - Database Importer
cd /d "%~dp0"
echo ===================================================
echo Importing it_complaint_db into MySQL
echo ===================================================
echo.

set MYSQL_EXE="C:\xampp\mysql\bin\mysql.exe"
if not exist %MYSQL_EXE% (
    set MYSQL_EXE=mysql
)

echo Creating database if not exists...
%MYSQL_EXE% -u root -e "CREATE DATABASE IF NOT EXISTS it_complaint_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Could not connect to MySQL.
    echo Please make sure MySQL is running in XAMPP Control Panel!
    pause
    exit /b 1
)

echo Importing tables and initial data from it_complaint_db.sql...
%MYSQL_EXE% -u root --default-character-set=utf8mb4 it_complaint_db < "it_complaint_db.sql"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to import database.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo Database imported successfully!
echo ===================================================
pause
