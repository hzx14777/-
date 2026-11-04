#!/usr/bin/env bash
# 砚考 exam-platform 后台启动（常驻任务持有，避免被会话回收）
# 用法：boot-core.sh | boot-exam.sh
set -u
unset HTTP_PROXY http_proxy HTTPS_PROXY https_proxy ALL_PROXY all_proxy SERVER__PORT

ROOT="C:/Users/24243/Desktop/考试平台2/oss-run/exam-platform-master/exam-back"
JAVA="C:/yk-runtime/jdk-17.0.20.1+1/bin/java.exe"
LOGS="C:/Users/24243/Desktop/考试平台2/oss-run/run-logs"
mkdir -p "$LOGS"

MODE="${1:-core}"

CORE="ruoyi-auth|ruoyi-auth|9300|20880
ruoyi-modules/ruoyi-system|ruoyi-system|9201|20881
ruoyi-modules/ruoyi-resource|ruoyi-resource|9204|20882
ruoyi-gateway|ruoyi-gateway|8080|0"

EXAM="ruoyi-modules/ruoyi-exam-question|ruoyi-exam-question|9211|20883
ruoyi-modules/ruoyi-exam-paper|ruoyi-exam-paper|9212|20884
ruoyi-modules/ruoyi-exam-answer|ruoyi-exam-answer|9214|20885
ruoyi-modules/ruoyi-exam-mark|ruoyi-exam-mark|9215|20886
ruoyi-modules/ruoyi-exam-stat|ruoyi-exam-stat|9216|20887
ruoyi-modules/ruoyi-exam-cert|ruoyi-exam-cert|9218|20888
ruoyi-modules/ruoyi-exam-manage|ruoyi-exam-manage|9213|20913
ruoyi-modules/ruoyi-exam-practice|ruoyi-exam-practice|9217|20917
ruoyi-modules/ruoyi-exam-proctor|ruoyi-exam-proctor|9219|20919
ruoyi-modules/ruoyi-exam-ai|ruoyi-exam-ai|9220|20920"

case "$MODE" in
  core) LIST="$CORE" ;;
  exam) LIST="$EXAM" ;;
  *) echo "用法: $0 core|exam"; exit 1 ;;
esac

while IFS='|' read -r dir jar port dport; do
  [ -z "$dir" ] && continue
  JAR="$ROOT/$dir/target/$jar.jar"
  if [ ! -f "$JAR" ]; then echo "[MISS] $jar"; continue; fi
  if [ "$dport" = "0" ]; then
    "$JAVA" -Xms128m -Xmx448m -XX:+UseSerialGC -Dfile.encoding=UTF-8 \
      -jar "$JAR" --server.port="$port" --spring.profiles.active=dev \
      > "$LOGS/$jar.log" 2>&1 &
  else
    "$JAVA" -Xms128m -Xmx448m -XX:+UseSerialGC -Dfile.encoding=UTF-8 \
      -jar "$JAR" --server.port="$port" --dubbo.protocol.port="$dport" --spring.profiles.active=dev \
      > "$LOGS/$jar.log" 2>&1 &
  fi
  echo "[START] $jar http=$port dubbo=$dport pid=$!"
  sleep 3
done <<< "$LIST"

echo "[INFO] 全部已拉起，等待注册 Nacos ..."
wait
