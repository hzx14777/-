#!/usr/bin/env bash
# 重启指定服务并指定 dubbo 端口，避免固定端口竞争
# 用法：./restart-svc.sh <module-dir> <jar> <http-port> <dubbo-port>
set -u
ROOT="C:/Users/24243/Desktop/考试平台2/oss-run/exam-platform-master/exam-back"
JAVA="C:/yk-runtime/jdk-17.0.20.1+1/bin/java.exe"
LOGS="C:/Users/24243/Desktop/考试平台2/oss-run/run-logs"
dir="$1"; jar="$2"; port="$3"; dport="$4"
"$JAVA" -Xms192m -Xmx512m -XX:+UseSerialGC -Dfile.encoding=UTF-8 \
  -jar "$ROOT/$dir/target/$jar.jar" \
  --server.port="$port" \
  --dubbo.protocol.port="$dport" \
  --spring.profiles.active=dev \
  > "$LOGS/$jar.log" 2>&1
