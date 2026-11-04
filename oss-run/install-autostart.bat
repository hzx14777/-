@echo off
rem Register the logon scheduled task (idempotent, safe to run many times)
setlocal
chcp 65001 >nul
title YJ Smart Exam Platform - Enable Logon Autostart

echo registering scheduled task ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-task.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] registration failed. See the message above.
  pause
  exit /b 1
)

echo.
echo verify:
powershell -NoProfile -Command "$t = Get-ScheduledTask -TaskName 'YJ-Exam-Platform' -ErrorAction SilentlyContinue; if ($t) { '  task : ' + $t.State } else { '  task : NOT FOUND' }"
echo.
echo Now the service starts automatically after you log in to Windows.
echo Open: http://127.0.0.1/yj/login
ping -n 5 127.0.0.1 >nul
exit /b 0
