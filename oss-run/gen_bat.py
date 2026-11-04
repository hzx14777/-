import io, os

BAT = r"""@echo off
chcp 65001 >nul
title 砚考 exam-platform 一键启动
echo ============================================
echo   砚考 exam-platform 本地启动
echo   MySQL 3306 / Redis 6379 / Nacos 8848
echo ============================================

if not exist "C:\yk-runtime\mysql-data" (
  echo [ERROR] 未找到 C:\yk-runtime，请先按《本地运行说明》准备运行时
  pause
  exit /b 1
)

echo [1/5] 启动 MySQL ...
start "mysql" /min "C:\yk-runtime\mysql-8.0.39-winx64\bin\mysqld.exe" --defaults-file=C:\yk-runtime\my.ini --console
timeout /t 10 >nul

echo [2/5] 启动 Redis ...
start "redis" /min "C:\yk-runtime\redis-7.4.0-windows-x64-msys2\redis-server.exe" "C:\yk-runtime\redis-7.4.0-windows-x64-msys2\redis.conf"
timeout /t 3 >nul

echo [3/5] 启动 Nacos ...
set "JAVA_HOME=C:\yk-runtime\jdk-17.0.20.1+1"
start "nacos" /min cmd /c "C:\yk-runtime\nacos\bin\startup.cmd -m standalone --server.port=8848"
timeout /t 30 >nul

echo [4/5] 启动微服务 ...
set "JAVA=%JAVA_HOME%\bin\java.exe"
set "BE=C:\Users\24243\Desktop\考试平台2\oss-run\exam-platform-master\exam-back"
set "LOG=C:\Users\24243\Desktop\考试平台2\oss-run\run-logs"
if not exist "%LOG%" mkdir "%LOG%"

start "auth"         /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-auth\target\ruoyi-auth.jar" --server.port=9300 --dubbo.protocol.port=20880 --spring.profiles.active=dev > "%LOG%\ruoyi-auth.log" 2>&1
start "system"       /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-system\target\ruoyi-system.jar" --server.port=9201 --dubbo.protocol.port=20881 --spring.profiles.active=dev > "%LOG%\ruoyi-system.log" 2>&1
start "resource"     /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-resource\target\ruoyi-resource.jar" --server.port=9204 --dubbo.protocol.port=20882 --spring.profiles.active=dev > "%LOG%\ruoyi-resource.log" 2>&1
start "question"     /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-exam-question\target\ruoyi-exam-question.jar" --server.port=9211 --dubbo.protocol.port=20883 --spring.profiles.active=dev > "%LOG%\ruoyi-exam-question.log" 2>&1
start "paper"        /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-exam-paper\target\ruoyi-exam-paper.jar" --server.port=9212 --dubbo.protocol.port=20884 --spring.profiles.active=dev > "%LOG%\ruoyi-exam-paper.log" 2>&1
start "manage"       /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-exam-manage\target\ruoyi-exam-manage.jar" --server.port=9213 --dubbo.protocol.port=20913 --spring.profiles.active=dev > "%LOG%\ruoyi-exam-manage.log" 2>&1
start "answer"       /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-exam-answer\target\ruoyi-exam-answer.jar" --server.port=9214 --dubbo.protocol.port=20885 --spring.profiles.active=dev > "%LOG%\ruoyi-exam-answer.log" 2>&1
start "mark"         /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-exam-mark\target\ruoyi-exam-mark.jar" --server.port=9215 --dubbo.protocol.port=20886 --spring.profiles.active=dev > "%LOG%\ruoyi-exam-mark.log" 2>&1
start "stat"         /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-exam-stat\target\ruoyi-exam-stat.jar" --server.port=9216 --dubbo.protocol.port=20887 --spring.profiles.active=dev > "%LOG%\ruoyi-exam-stat.log" 2>&1
start "practice"     /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-exam-practice\target\ruoyi-exam-practice.jar" --server.port=9217 --dubbo.protocol.port=20917 --spring.profiles.active=dev > "%LOG%\ruoyi-exam-practice.log" 2>&1
start "cert"         /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-exam-cert\target\ruoyi-exam-cert.jar" --server.port=9218 --dubbo.protocol.port=20888 --spring.profiles.active=dev > "%LOG%\ruoyi-exam-cert.log" 2>&1
start "proctor"      /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-exam-proctor\target\ruoyi-exam-proctor.jar" --server.port=9219 --dubbo.protocol.port=20919 --spring.profiles.active=dev > "%LOG%\ruoyi-exam-proctor.log" 2>&1
start "ai"           /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-modules\ruoyi-exam-ai\target\ruoyi-exam-ai.jar" --server.port=9220 --dubbo.protocol.port=20920 --spring.profiles.active=dev > "%LOG%\ruoyi-exam-ai.log" 2>&1
start "gateway"      /min "%JAVA%" -Xmx512m -jar "%BE%\ruoyi-gateway\target\ruoyi-gateway.jar" --server.port=8080 --spring.profiles.active=dev > "%LOG%\ruoyi-gateway.log" 2>&1

echo 等待服务注册到 Nacos（约 90 秒）...
timeout /t 90 >nul

echo [5/5] 启动前端 ...
cd /d "C:\Users\24243\Desktop\考试平台2\oss-run\exam-platform-master\exam-front"
start "exam-front" /min cmd /c "npm run dev"

echo.
echo 启动完成，首次访问约需等待前端依赖预构建 1-3 分钟
echo   访问地址: http://127.0.0.1/
echo   账号密码: admin / admin123
echo   Nacos:    http://127.0.0.1:8848/nacos (nacos/nacos)
echo 日志目录: %LOG%
pause
"""

STOP = r"""@echo off
chcp 65001 >nul
echo 停止砚考相关进程 ...
for %%P in (ruoyi-auth ruoyi-system ruoyi-resource ruoyi-gateway) do (
  for /f "tokens=2 delims=," %%i in ('tasklist /fi "imagename eq java.exe" /fo csv /nh ^| findstr /i "%%P"') do taskkill /pid %%~i /f >nul 2>&1
)
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'ruoyi|exam-platform' -and $_.Name -eq 'java.exe' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'vite|npm run dev' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo 已停止 Java 服务与前端。MySQL/Redis/Nacos 如无需保留可手动关闭。
pause
"""

base = r"C:\Users\24243\Desktop\考试平台2\oss-run"
for name, content in [("start-all.bat", BAT), ("stop-all.bat", STOP)]:
    with open(os.path.join(base, name), "w", encoding="utf-8", newline="\r\n") as f:
        f.write(content)
    print("written", name)
