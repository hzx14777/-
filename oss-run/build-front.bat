@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title YJ Smart Exam Platform - Build Front-end

set "ROOT=%~dp0"
set "FRONT=%ROOT%exam-front-react"
set "QUIET=%~1"

set "NODE_EXE="
for /f "delims=" %%i in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%i"
if not defined NODE_EXE (
  for /f "delims=" %%d in ('dir /b /ad /o-n "%USERPROFILE%\.workbuddy\binaries\node\versions" 2^>nul') do (
    if not defined NODE_EXE if exist "%USERPROFILE%\.workbuddy\binaries\node\versions\%%d\node.exe" set "NODE_EXE=%USERPROFILE%\.workbuddy\binaries\node\versions\%%d\node.exe"
  )
)
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"

if not defined NODE_EXE (
  echo [ERROR] node.exe not found. install Node.js 18+ first.
  if not "%QUIET%"=="quiet" pause
  exit /b 1
)

if not exist "%FRONT%\node_modules\vite\bin\vite.js" (
  echo [ERROR] front-end dependencies missing: %FRONT%\node_modules
  echo         run:  cd /d "%FRONT%"  ^&^&  npm install
  if not "%QUIET%"=="quiet" pause
  exit /b 2
)

echo building front-end with %NODE_EXE% ...
cd /d "%FRONT%"
"%NODE_EXE%" "%FRONT%\node_modules\vite\bin\vite.js" build --mode production
if errorlevel 1 (
  echo [ERROR] build failed.
  if not "%QUIET%"=="quiet" pause
  exit /b 3
)
echo build ok -^> %FRONT%\dist
echo restart service to serve new assets: stop-platform.bat ^&^& start-platform.bat
if not "%QUIET%"=="quiet" pause
exit /b 0
