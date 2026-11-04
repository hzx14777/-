@echo off
chcp 65001 >nul
title 砚考 exam-platform 应用层启动（基础设施已在运行）
set "JAVA_HOME=C:\yk-runtime\jdk-17.0.20.1+1"
set "JAVA=%JAVA_HOME%\bin\java.exe"
set "BE=C:\Users\24243\Desktop\考试平台2\oss-run\exam-platform-master\exam-back"
set "LOG=C:\Users\24243\Desktop\考试平台2\oss-run\run-logs"
if not exist "%LOG%" mkdir "%LOG%"

echo [1/3] Nacos ...
start "nacos" /min cmd /c "C:\yk-runtime\nacos\bin\startup.cmd -m standalone --server.port=8848"

echo [2/3] 微服务 ...
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

echo [3/3] 前端 ...
cd /d "C:\Users\24243\Desktop\考试平台2\oss-run\exam-platform-master\exam-front"
start "exam-front" /min cmd /c "npm run dev"

echo 已提交启动，等待约 90-120 秒完成注册
