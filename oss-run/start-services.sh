#!/usr/bin/env bash
# 砚考 exam-platform 本地启动脚本（Windows / Git Bash）
# 用法：./start-services.sh core|exam|all
# 依赖：MySQL 3306、Redis 6379(密码 ruoyi123)、Nacos 8848
set -u

ROOT="C:/Users/24243/Desktop/考试平台2/oss-run/exam-platform-master/exam-back"
JAVA="C:/yk-runtime/jdk-17.0.20.1+1/bin/java.exe"
LOGS="C:/Users/24243/Desktop/考试平台2/oss-run/run-logs"
mkdir -p "$LOGS"

CORE=(
  "ruoyi-auth|ruoyi-auth|9300"
  "ruoyi-modules/ruoyi-system|ruoyi-system|9201"
  "ruoyi-modules/ruoyi-resource|ruoyi-resource|9204"
  "ruoyi-gateway|ruoyi-gateway|8080"
)

EXAM=(
  "ruoyi-modules/ruoyi-exam-question|ruoyi-exam-question|9211"
  "ruoyi-modules/ruoyi-exam-paper|ruoyi-exam-paper|9212"
  "ruoyi-modules/ruoyi-exam-manage|ruoyi-exam-manage|9213"
  "ruoyi-modules/ruoyi-exam-answer|ruoyi-exam-answer|9214"
  "ruoyi-modules/ruoyi-exam-mark|ruoyi-exam-mark|9215"
  "ruoyi-modules/ruoyi-exam-stat|ruoyi-exam-stat|9216"
  "ruoyi-modules/ruoyi-exam-practice|ruoyi-exam-practice|9217"
  "ruoyi-modules/ruoyi-exam-cert|ruoyi-exam-cert|9218"
  "ruoyi-modules/ruoyi-exam-proctor|ruoyi-exam-proctor|9219"
  "ruoyi-modules/ruoyi-exam-ai|ruoyi-exam-ai|9220"
)

MODE="${1:-all}"
case "$MODE" in
  core) LIST=("${CORE[@]}") ;;
  exam) LIST=("${EXAM[@]}") ;;
  all)  LIST=("${CORE[@]}" "${EXAM[@]}") ;;
  *) echo "用法: $0 core|exam|all"; exit 1 ;;
esac

PIDS=()
for item in "${LIST[@]}"; do
  IFS='|' read -r dir jar port <<< "$item"
  JAR="$ROOT/$dir/target/$jar.jar"
  if [ ! -f "$JAR" ]; then echo "[MISS] $jar"; continue; fi
  echo "[START] $jar :$port"
  "$JAVA" -Xms192m -Xmx512m -XX:+UseSerialGC -Dfile.encoding=UTF-8 \
    -jar "$JAR" \
    --server.port="$port" \
    --spring.profiles.active=dev \
    > "$LOGS/$jar.log" 2>&1 &
  PIDS+=($!)
  sleep 3
done

echo "[INFO] 已启动 ${#PIDS[@]} 个进程，日志目录：$LOGS"
wait
