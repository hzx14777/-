@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title YJ Smart Exam Platform - Stop

echo stopping yj-bff (node server.js) ...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*server.js*' -and $_.CommandLine -notlike '*--disable-warning*' } | ForEach-Object { Write-Host ('  kill pid ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

rem stop the scheduled task first, otherwise it may restart or look 'Running' forever
powershell -NoProfile -Command "Stop-ScheduledTask -TaskName 'YJ-Exam-Platform' -ErrorAction SilentlyContinue"

curl.exe -s --noproxy "*" -o nul --max-time 2 http://127.0.0.1/api/v1/health
if errorlevel 1 (
  echo service stopped, port 80 released.
) else (
  echo [WARN] port 80 still answering, another program may be serving it.
  netstat -ano | findstr /r /c:":80 .*LISTENING"
)
echo.
ping -n 3 127.0.0.1 >nul
exit /b 0
