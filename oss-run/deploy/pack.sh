#!/usr/bin/env bash
# ============================================================
#  本机执行：构建前端 + 打包发布物
#  用法:
#    bash pack.sh                  # 构建并带上当前 data/db.json
#    WITH_DATA=0 bash pack.sh      # 不带数据（服务器首次启动生成种子数据）
#    SKIP_BUILD=1 bash pack.sh     # 复用现有 dist，不重新构建
#  产物: deploy/out/yj-exam-<时间戳>.tar.gz
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # -> oss-run
OUT="${ROOT}/deploy/out"
STAMP="$(date +%Y%m%d-%H%M%S)"
PKG="${OUT}/yj-exam-${STAMP}.tar.gz"

die() { printf '\033[31m[ERR]\033[0m %s\n' "$*" >&2; exit 1; }
log() { printf '\033[36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }

[ -f "${ROOT}/yj-bff/server.js" ] || die "找不到 yj-bff/server.js，确认脚本在 oss-run/deploy 下"

# ---------- 1. 前端构建 ----------
if [ "${SKIP_BUILD:-0}" != "1" ]; then
  command -v npm >/dev/null 2>&1 || die "npm 不在 PATH（或设 SKIP_BUILD=1 复用现有 dist）"
  log "[1/4] 构建前端 (tsc --noEmit && vite build)"
  ( cd "${ROOT}/exam-front-react" && npm run build )
else
  log "[1/4] 跳过构建，复用现有 dist"
fi

[ -f "${ROOT}/exam-front-react/dist/index.html" ] || die "dist/index.html 不存在，构建失败"

# ---------- 2. 组装 ----------
log "[2/4] 组装发布目录"
STAGE="$(mktemp -d)"
PKGROOT="${STAGE}/yj-exam"
mkdir -p "${PKGROOT}/yj-bff/data" "${PKGROOT}/exam-front-react"

cp "${ROOT}/yj-bff/server.js" "${ROOT}/yj-bff/engine.js" "${ROOT}/yj-bff/seed.js" "${PKGROOT}/yj-bff/"
cp -r "${ROOT}/exam-front-react/dist" "${PKGROOT}/exam-front-react/"

if [ -f "${ROOT}/yj-bff/config.json" ]; then
  cp "${ROOT}/yj-bff/config.json" "${PKGROOT}/yj-bff/"
  log "      包含 config.json"
fi

# ---------- 3. 数据 ----------
if [ "${WITH_DATA:-1}" = "1" ] && [ -f "${ROOT}/yj-bff/data/db.json" ]; then
  cp "${ROOT}/yj-bff/data/db.json" "${PKGROOT}/yj-bff/data/db.json"
  log "[3/4] 携带现有数据 db.json ($(du -h "${ROOT}/yj-bff/data/db.json" | cut -f1))"
else
  log "[3/4] 不带数据：服务器首次启动由 seed.js 生成种子数据"
fi

# ---------- 4. 打包 ----------
mkdir -p "${OUT}"
log "[4/4] 打包 -> ${PKG}"
tar czf "${PKG}" -C "${STAGE}" yj-exam
rm -rf "${STAGE}" 2>/dev/null || true

log "完成: $(ls -lh "${PKG}" | awk '{print $5}')"
echo "${PKG}"
