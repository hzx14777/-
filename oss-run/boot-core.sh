#!/usr/bin/env bash
set -u
unset SERVER__PORT HTTP_PROXY http_proxy HTTPS_PROXY https_proxy ALL_PROXY all_proxy
ROOT="C:/Users/24243/Desktop/考试平台2/oss-run/exam-platform-master/exam-back"
JAVA="C:/yk-runtime/jdk-17.0.20.1+1/bin/java.exe"
LOGS="C:/Users/24243/Desktop/考试平台2/oss-run/run-logs"
mkdir -p "$LOGS"
run(){ d=$1;j=$2;p=$3;dp=$4;
  if [ "$dp" = "0" ]; then
    "$JAVA" -Xms128m -Xmx384m -XX:+UseSerialGC -Dfile.encoding=UTF-8 -jar "$ROOT/$d/target/$j.jar" --server.port="$p" --spring.profiles.active=dev > "$LOGS/$j.log" 2>&1 &
  else
    "$JAVA" -Xms128m -Xmx384m -XX:+UseSerialGC -Dfile.encoding=UTF-8 -jar "$ROOT/$d/target/$j.jar" --server.port="$p" --dubbo.protocol.port="$dp" --spring.profiles.active=dev > "$LOGS/$j.log" 2>&1 &
  fi
  echo "[START] $j http=$p dubbo=$dp pid=$!"; }
run ruoyi-auth ruoyi-auth 9300 20880
run ruoyi-modules/ruoyi-system ruoyi-system 9201 20881
run ruoyi-modules/ruoyi-resource ruoyi-resource 9204 20882
run ruoyi-gateway ruoyi-gateway 8080 0
wait
