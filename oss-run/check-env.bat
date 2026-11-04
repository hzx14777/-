@echo off
setlocal
chcp 65001 >nul
title YJ Smart Exam Platform - Environment Check

set "ROOT=%~dp0"
echo ============ 1. node runtime ============
where node 2>nul || echo   node.exe NOT in system PATH  ^(normal on this machine^)
echo   bundled runtimes:
dir /b /ad "%USERPROFILE%\.workbuddy\binaries\node\versions" 2>nul || echo   none found
if exist "%ROOT%run-logs\node-path.txt" (
  echo   last registered node:
  type "%ROOT%run-logs\node-path.txt"
)

echo.
echo ============ 2. files ============
if exist "%ROOT%yj-bff\server.js" (echo   yj-bff\server.js        OK) else (echo   yj-bff\server.js        MISSING)
if exist "%ROOT%yj-bff\data\db.json" (echo   yj-bff\data\db.json     OK) else (echo   yj-bff\data\db.json     will be created on first run)
if exist "%ROOT%exam-platform-master\exam-front\dist\index.html" (echo   dist\index.html         OK) else (echo   dist\index.html         MISSING - run build-front.bat)
if exist "%ROOT%exam-platform-master\exam-front\node_modules\vite" (echo   node_modules            OK) else (echo   node_modules            MISSING - run npm install)

echo.
echo ============ 3. port 80 ============
netstat -ano | findstr /r /c:":80 .*LISTENING" || echo   nothing listening on port 80

echo.
echo ============ 4. health ============
curl.exe -s --noproxy "*" --max-time 3 http://127.0.0.1/api/v1/health
echo.
powershell -NoProfile -Command "try { $r = Invoke-WebRequest 'http://127.0.0.1/yj/login' -UseBasicParsing -TimeoutSec 3; '  page /yj/login : HTTP ' + $r.StatusCode } catch { '  page /yj/login : UNREACHABLE - ' + $_.Exception.Message }"

echo.
echo ============ 5. logon autostart ============
powershell -NoProfile -Command "if (Get-ScheduledTask -TaskName 'YJ-Exam-Platform' -ErrorAction SilentlyContinue) { $t = Get-ScheduledTask -TaskName 'YJ-Exam-Platform'; '  logon autostart : ON   (state=' + $t.State + ')' } else { '  logon autostart : OFF   (run install-autostart.bat)' }"

echo.
echo ============ 6. recent log ============
if exist "%ROOT%run-logs\service.log" (
  powershell -NoProfile -Command "Get-Content '%ROOT%run-logs\service.log' -Tail 6 -Encoding UTF8"
) else (
  echo   no service.log yet
)

echo.
pause
exit /b 0
