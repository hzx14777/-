@echo off
rem 旧入口保留，转为调用新的启动器（单端口 80，不再需要 npm run dev）
call "%~dp0start-platform.bat"
