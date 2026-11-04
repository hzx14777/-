@echo off
chcp 65001 >nul
title 砚考 exam-platform 一键启动
echo ==================================================
echo   砚考 exam-platform 本地启动
echo   MySQL 3306 / Redis 6379 / Nacos 8848 / 前端 80
echo ==================================================
echo.

if not exist "C:\yk-runtime\ykctl.ps1" (
  echo [ERROR] 未找到 C:\yk-runtime\ykctl.ps1
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\yk-runtime\ykctl.ps1" start all

echo.
echo 访问地址: http://127.0.0.1/    账号 admin / admin123
echo 日志目录: C:\Users\24243\Desktop\考试平台2\oss-run\run-logs
pause
