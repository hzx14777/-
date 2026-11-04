@echo off
rem ============================================================
rem   YJ Smart Exam Platform - one click launcher
rem   1) already running -> open browser
rem   2) scheduled task YJ-Exam-Platform -> run it
rem   3) fallback -> run-bff.cmd in a minimized window
rem   Never relies on node.exe being in PATH.
rem ============================================================
setlocal enabledelayedexpansion
chcp 65001 >nul
title YJ Smart Exam Platform - Launcher

set "ROOT=%~dp0"
set "BFF=%ROOT%yj-bff"
set "LOG=%ROOT%run-logs"
set "DIST=%ROOT%exam-platform-master\exam-front\dist"
set "TASK=YJ-Exam-Platform"

echo ============================================================
echo   YJ Smart Exam Platform   (exam-platform + yj-bff)
echo   port 80  -  http://127.0.0.1/yj/login
echo ============================================================
echo.

call :probe
if defined FOUND_PORT (
  echo [1/3] service : already running on port !FOUND_PORT!
  goto open
)

rem ---------- port 80 taken by another program? ----------
netstat -ano | findstr /r /c:":80 .*LISTENING" >nul 2>&1
if errorlevel 1 goto locate_node
echo [WARN] port 80 is occupied by another program:
netstat -ano | findstr /r /c:":80 .*LISTENING"
echo        close that program, or the service will fall back to port 8090 automatically.
echo.

rem ---------- locate node.exe ----------
:locate_node
set "NODE_EXE="
for /f "delims=" %%i in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%i"
if not defined NODE_EXE (
  for /f "delims=" %%d in ('dir /b /ad /o-n "%USERPROFILE%\.workbuddy\binaries\node\versions" 2^>nul') do (
    if not defined NODE_EXE if exist "%USERPROFILE%\.workbuddy\binaries\node\versions\%%d\node.exe" set "NODE_EXE=%USERPROFILE%\.workbuddy\binaries\node\versions\%%d\node.exe"
  )
)
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"

if not defined NODE_EXE (
  echo [ERROR] node.exe not found.
  echo         install Node.js 18+ from https://nodejs.org and run this again.
  pause
  exit /b 1
)
echo [1/3] runtime : %NODE_EXE%

if not exist "%BFF%\server.js" (
  echo [ERROR] %BFF%\server.js missing, folder is broken.
  pause
  exit /b 2
)

if exist "%DIST%\index.html" goto start_svc
echo [WARN] front-end build missing, building now (about 90s) ...
call "%ROOT%build-front.bat" quiet
if not exist "%DIST%\index.html" (
  echo [ERROR] build failed, run build-front.bat alone to see the reason.
  pause
  exit /b 5
)

rem ---------- start ----------
:start_svc
if not exist "%LOG%" mkdir "%LOG%"
echo [2/3] service : starting ...

powershell -NoProfile -Command "if (Get-ScheduledTask -TaskName '%TASK%' -ErrorAction SilentlyContinue) { Start-ScheduledTask -TaskName '%TASK%'; exit 0 } else { exit 1 }"
if errorlevel 1 goto fallback
echo        via scheduled task "%TASK%"
set /a n=0
:wait_a
set /a n+=1
call :probe
if defined FOUND_PORT goto ready
if %n% geq 10 goto fallback
ping -n 2 127.0.0.1 >nul
goto wait_a

:fallback
echo        via run-bff.cmd ^(fallback^)
start "yj-bff" /min "%ROOT%run-bff.cmd"
set /a n=0
:wait
set /a n+=1
call :probe
if defined FOUND_PORT goto ready
if %n% geq 40 goto failed
ping -n 2 127.0.0.1 >nul
goto wait

:ready
echo        ready on port !FOUND_PORT!.
goto open

:failed
echo.
echo [ERROR] service did not answer in 60s.
echo ----- run-logs\service.log -----
type "%LOG%\service.log" 2>nul
echo ----- run-logs\launcher.log -----
type "%LOG%\launcher.log" 2>nul
echo.
echo next: run check-env.bat to see the whole picture.
pause
exit /b 3

:open
if not defined FOUND_PORT set "FOUND_PORT=80"
if "!FOUND_PORT!"=="80" (
  set "URL=http://127.0.0.1/yj/login"
) else (
  set "URL=http://127.0.0.1:!FOUND_PORT!/yj/login"
)
echo [3/3] open    : !URL!
if not defined YJ_NO_BROWSER start "" "!URL!"
ping -n 3 127.0.0.1 >nul
exit /b 0

rem ---------- helper: is the service answering, and on which port ----------
:probe
set "FOUND_PORT="
curl.exe -s --noproxy "*" -o nul --max-time 2 http://127.0.0.1/api/v1/health
if not errorlevel 1 set "FOUND_PORT=80"
if defined FOUND_PORT exit /b 0
curl.exe -s --noproxy "*" -o nul --max-time 2 http://127.0.0.1:8090/api/v1/health
if not errorlevel 1 set "FOUND_PORT=8090"
exit /b 0
