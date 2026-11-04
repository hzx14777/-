@echo off
chcp 65001 >nul
title 砚考 exam-platform 停止
echo 正在停止砚考平台全部进程 ...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\yk-runtime\ykctl.ps1" stop
echo.
pause
