#!/usr/bin/env bash
# ============================================================
#  服务器执行（root）：安装运行时 + 部署 + systemd 守护 + 自检
#  用法:
#    bash server-install.sh /tmp/yj-exam-xxx.tar.gz
#  可选环境变量:
#    YJ_PORT=8090            服务监听端口（默认 8090）
#    NODE_VERSION=v20.19.1   需要自动安装的 Node 版本
#  幂等: 重复执行 = 升级发布，会自动备份现有 db.json 并保留
# ============================================================
set -euo pipefail

PKG="${1:-}"
APP=/opt/yj-exam
RUN_USER=yj
PORT="${YJ_PORT:-8090}"
NODE_VERSION="${NODE_VERSION:-v20.19.1}"
NODE_MIN_MAJOR=18

log()  { printf '\033[36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
warn() { printf '\033[33m[WARN]\033[0m %s\n' "$*"; }
die()  { printf '\033[31m[ERR]\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "请用 root 执行"
[ -n "$PKG" ] || die "用法: bash server-install.sh <包路径>"
[ -f "$PKG" ] || die "找不到安装包: $PKG"

# ---------------- 1. Node 运行时 ----------------
node_major() {
  if command -v node >/dev/null 2>&1; then
    node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0
  else
    echo 0
  fi
}

install_node() {
  case "$(uname -m)" in
    x86_64|amd64) arch=x64 ;;
    aarch64|arm64) arch=arm64 ;;
    *) arch=x64 ;;
  esac
  name="node-${NODE_VERSION}-linux-${arch}"
  for base in \
    "https://mirrors.aliyun.com/nodejs-release/${NODE_VERSION}" \
    "https://mirrors.huaweicloud.com/nodejs/${NODE_VERSION}" \
    "https://nodejs.org/dist/${NODE_VERSION}" ; do
    log "尝试下载 ${base}/${name}.tar.xz"
    if curl -fL --connect-timeout 8 --max-time 300 "${base}/${name}.tar.xz" -o /tmp/node.tar.xz; then
      break
    fi
    rm -f /tmp/node.tar.xz
  done
  [ -s /tmp/node.tar.xz ] || die "Node 下载失败，请手动安装 Node ${NODE_MIN_MAJOR}+ 后重跑"

  tar -xJf /tmp/node.tar.xz -C /usr/local
  ln -sfn "/usr/local/${name}" /usr/local/node
  ln -sf /usr/local/node/bin/node /usr/local/bin/node
  ln -sf /usr/local/node/bin/npm  /usr/local/bin/npm
  ln -sf /usr/local/node/bin/npx  /usr/local/bin/npx
  rm -f /tmp/node.tar.xz
  hash -r
}

if [ "$(node_major)" -lt "$NODE_MIN_MAJOR" ]; then
  log "未检测到 Node ${NODE_MIN_MAJOR}+，安装官方二进制 ${NODE_VERSION}"
  install_node
fi
NODE_BIN="$(command -v node)"
log "Node: $($NODE_BIN -v)  ($NODE_BIN)"

# ---------------- 2. 运行用户 ----------------
if ! id "$RUN_USER" >/dev/null 2>&1; then
  log "创建系统用户 $RUN_USER"
  useradd -r -s /sbin/nologin -M "$RUN_USER"
fi

# ---------------- 3. 解包与数据保护 ----------------
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
tar xzf "$PKG" -C "$TMP"
[ -f "$TMP/yj-exam/yj-bff/server.js" ] || die "包结构异常：缺少 yj-exam/yj-bff/server.js"

mkdir -p "$APP/backup" "$APP/run-logs"

if [ -f "$APP/yj-bff/data/db.json" ]; then
  B="$APP/backup/db.json.$(date +%Y%m%d-%H%M%S)"
  cp "$APP/yj-bff/data/db.json" "$B"
  log "已备份线上数据 -> $B"
  cp "$B" "$TMP/yj-exam/yj-bff/data/db.json"
  log "本次发布沿用线上数据（不被安装包覆盖）"
fi

if [ -f "$APP/yj-bff/config.json" ] && [ ! -f "$TMP/yj-exam/yj-bff/config.json" ]; then
  cp "$APP/yj-bff/config.json" "$TMP/yj-exam/yj-bff/config.json"
  log "保留既有 config.json"
fi

log "替换代码目录"
rm -rf "$APP/yj-bff" "$APP/exam-front-react"
cp -r "$TMP/yj-exam/yj-bff" "$APP/yj-bff"
cp -r "$TMP/yj-exam/exam-front-react" "$APP/exam-front-react"

# ---------------- 4. 环境文件 ----------------
if [ -f "$APP/yj.env" ]; then
  log "保留既有 $APP/yj.env"
else
  cat > "$APP/yj.env" <<EOF
# 警院智慧考试平台 · 运行时配置（systemd EnvironmentFile）
YJ_PORT=$PORT
YJ_HOST=0.0.0.0
# 接入真实统一认证时改为 real 并填写下列三项
#YJ_SSO_MODE=real
#YJ_SSO_BASE_URL=https://sso.example.edu.cn
#YJ_SSO_CLIENT_ID=
#YJ_SSO_CLIENT_SECRET=
EOF
  log "生成 $APP/yj.env"
fi
chmod 600 "$APP/yj.env"
chown -R "$RUN_USER:$RUN_USER" "$APP"
chmod 755 "$APP" "$APP/yj-bff" "$APP/yj-bff/data"

# ---------------- 5. systemd ----------------
CAP=""
if [ "$PORT" -lt 1024 ]; then
  CAP="AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
"
fi

cat > /etc/systemd/system/yj-exam.service <<EOF
[Unit]
Description=YJ Exam Platform (yj-bff + static front)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_USER
WorkingDirectory=$APP/yj-bff
EnvironmentFile=$APP/yj.env
ExecStart=$NODE_BIN $APP/yj-bff/server.js
Restart=always
RestartSec=3
LimitNOFILE=65535
${CAP}SyslogIdentifier=yj-exam

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable yj-exam >/dev/null 2>&1
systemctl restart yj-exam
log "systemd 服务 yj-exam 已启动并设为开机自启"

# ---------------- 6. 自检 ----------------
probe() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/api/v1/health" >/dev/null 2>&1
  else
    "$NODE_BIN" -e "require('http').get('http://127.0.0.1:${PORT}/api/v1/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))" >/dev/null 2>&1
  fi
}

ok=0
for _ in $(seq 1 30); do
  if probe; then ok=1; break; fi
  sleep 1
done

echo
if [ "$ok" = "1" ]; then
  log "健康检查通过 ✅"
  curl -fsS --max-time 3 "http://127.0.0.1:${PORT}/api/v1/health" 2>/dev/null || true
  echo
  log "监听情况:"
  ss -lntp | grep -E ":${PORT}\b" || true
  log "页面入口: $(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${PORT}/yj/login") -> /yj/login"
else
  warn "健康检查失败，最近日志："
  journalctl -u yj-exam -n 40 --no-pager || true
  echo "---- run-logs/service.log ----"
  tail -n 30 "$APP/run-logs/service.log" 2>/dev/null || true
  die "部署未通过自检"
fi
