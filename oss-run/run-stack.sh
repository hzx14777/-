#!/usr/bin/env bash
# 常驻运行砚考后端全部微服务（会话内保持存活）
set -u
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
export JAVA_HOME="C:/yk-runtime/jdk-17.0.20.1+1"
JAVA="$JAVA_HOME/bin/java.exe"
BE="C:/Users/24243/Desktop/考试平台2/oss-run/exam-platform-master/exam-back"
LOG="C:/Users/24243/Desktop/考试平台2/oss-run/run-logs"
mkdir -p "$LOG"

run() {
  d=$1; j=$2; p=$3; dp=$4
  if [ "$dp" = "0" ]; then
    "$JAVA" -Xms256m -Xmx512m -Dfile.encoding=UTF-8 -jar "$BE/$d/target/$j.jar" \
      --server.port="$p" --spring.profiles.active=dev > "$LOG/$j.log" 2>&1 &
  else
    "$JAVA" -Xms256m -Xmx512m -Dfile.encoding=UTF-8 -jar "$BE/$d/target/$j.jar" \
      --server.port="$p" --dubbo.protocol.port="$dp" --spring.profiles.active=dev > "$LOG/$j.log" 2>&1 &
  fi
  echo "[start] $j http=$p"
}

run ruoyi-auth ruoyi-auth 9300 20880
run ruoyi-modules/ruoyi-system ruoyi-system 9201 20881
run ruoyi-modules/ruoyi-resource ruoyi-resource 9204 20882
run ruoyi-modules/ruoyi-exam-question ruoyi-exam-question 9211 20883
run ruoyi-modules/ruoyi-exam-paper ruoyi-exam-paper 9212 20884
run ruoyi-modules/ruoyi-exam-manage ruoyi-exam-manage 9213 20913
run ruoyi-modules/ruoyi-exam-answer ruoyi-exam-answer 9214 20885
run ruoyi-modules/ruoyi-exam-mark ruoyi-exam-mark 9215 20886
run ruoyi-modules/ruoyi-exam-stat ruoyi-exam-stat 9216 20887
run ruoyi-modules/ruoyi-exam-practice ruoyi-exam-practice 9217 20917
run ruoyi-modules/ruoyi-exam-cert ruoyi-exam-cert 9218 20888
run ruoyi-modules/ruoyi-exam-proctor ruoyi-exam-proctor 9219 20919
run ruoyi-modules/ruoyi-exam-ai ruoyi-exam-ai 9220 20920
run ruoyi-gateway ruoyi-gateway 8080 0

wait
