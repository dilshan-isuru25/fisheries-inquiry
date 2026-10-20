@echo off
title IT Complaint System - Desktop App
cd /d "%~dp0"
echo ===================================================
echo Launching Java Desktop Complaint App
echo ===================================================
echo.
for /f "usebackq tokens=1,2 delims==" %%G in (".env") do (
    if "%%G"=="DESKTOP_API_KEY" set DESKTOP_API_KEY=%%H
)
javac ComplaintApp.java
java -D"DESKTOP_API_KEY=%DESKTOP_API_KEY%" ComplaintApp
pause
