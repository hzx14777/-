@echo off
rem ============================================================
rem  Manual start of yj-bff (fallback path used by start-platform.bat)
rem  Resolves node.exe by itself, does not rely on system PATH.
rem ============================================================
setlocal enabledelayedexpansion
chcp 65001 >nul
set "ROOT=%~dp0"
set "BFF=%ROOT%yj-bff"
set "LOG=%ROOT%run-logs"
if not exist "%LOG%" mkdir "%LOG%"

rem 1) system PATH
set "NODE_EXE="
for /f "delims=" %%i in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%i"

rem 2) WorkBuddy bundled runtime (case of this machine)
if not defined NODE_EXE (
  for /f "delims=" %%d in ('dir /b /ad /o-n "%USERPROFILE%\.workbuddy\binaries\node\versions" 2^>nul') do (
    if not defined NODE_EXE if exist "%USERPROFILE%\.workbuddy\binaries\node\versions\%%d\node.exe" set "NODE_EXE=%USERPROFILE%\.workbuddy\binaries\node\versions\%%d\node.exe"
  )
)

rem 3) standard install locations
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"

if not defined NODE_EXE (
  echo [%date% %time%] ERROR node.exe not found >> "%LOG%\launcher.log"
  echo [ERROR] node.exe not found, install Node.js 18+ first.
  exit /b 1
)

echo [%date% %time%] manual start: %NODE_EXE% >> "%LOG%\launcher.log"
cd /d "%BFF%"
"%NODE_EXE%" server.js
