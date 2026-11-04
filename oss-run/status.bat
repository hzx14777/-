@echo off
chcp 65001 >nul
title 砚考 exam-platform 状态检查
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\yk-runtime\ykctl.ps1" status
echo.
pause
