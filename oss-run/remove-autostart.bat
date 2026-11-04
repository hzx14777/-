@echo off
rem Remove the logon scheduled task (service keeps running until you stop it)
setlocal
chcp 65001 >nul
title YJ Smart Exam Platform - Disable Logon Autostart

powershell -NoProfile -Command "if (Get-ScheduledTask -TaskName 'YJ-Exam-Platform' -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName 'YJ-Exam-Platform' -Confirm:$false; exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo [OK] autostart was not enabled.
) else (
  echo [OK] autostart disabled. The service is still running now.
  echo      run stop-platform.bat to shut it down.
)
echo.
ping -n 4 127.0.0.1 >nul
exit /b 0
