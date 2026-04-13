#!/bin/bash

# 국어 분석기 서버 시작 스크립트
# 사용법: ./start.sh

# ── NVM 로드 ──────────────────────────────────
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh" --silent
nvm use 20 --silent 2>/dev/null

cd "$(dirname "$0")"

# ── 이전 프로세스 정리 ────────────────────────
pkill -f "next start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
pkill -f "localtunnel" 2>/dev/null || true

# 포트 3000 점유 프로세스 강제 종료
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PORT_PID" ]; then
  kill -9 "$PORT_PID" 2>/dev/null || true
fi
sleep 1

echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "        국어 지문 분석기 시작 중..."
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 프로덕션 빌드 ─────────────────────────────
echo "  [1/3] 빌드 중..."
npm run build 2>&1 | grep -E "✓|error|Error" | head -5
echo ""

# ── 프로덕션 서버 시작 ────────────────────────
npm run start -- -H 0.0.0.0 > /tmp/nextjs-server.log 2>&1 &
NEXT_PID=$!

printf "  [2/3] 서버 시작 중"
for i in $(seq 1 20); do
  sleep 1
  printf "."
  grep -q "Ready\|started\|listening" /tmp/nextjs-server.log 2>/dev/null && break
done
echo " ✓"

# ── localtunnel 시작 ──────────────────────────
npx --yes localtunnel --port 3000 > /tmp/lt-server.log 2>&1 &
LT_PID=$!

printf "  [3/3] 외부 터널 연결 중"
TUNNEL_URL=""
for i in $(seq 1 15); do
  sleep 1
  printf "."
  TUNNEL_URL=$(grep -o 'https://[^ ]*\.loca\.lt' /tmp/lt-server.log 2>/dev/null | head -1)
  [ -n "$TUNNEL_URL" ] && break
done
echo " ✓"
echo ""

# ── 접속 주소 출력 ────────────────────────────
echo "  ┌─────────────────────────────────────────────┐"
echo "  │  접속 주소                                  │"
echo "  ├─────────────────────────────────────────────┤"
echo "  │  로컬   →  http://localhost:3000            │"
if [ -n "$TUNNEL_URL" ]; then
  printf "  │  외부   →  %-33s│\n" "$TUNNEL_URL"
else
  echo "  │  외부   →  터널 연결 실패 (로컬만 사용)   │"
fi
echo "  └─────────────────────────────────────────────┘"
echo ""
echo "  종료: Ctrl+C"
echo ""

# ── 종료 처리 ─────────────────────────────────
cleanup() {
  echo ""
  echo "  서버를 종료합니다..."
  kill "$NEXT_PID" "$LT_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

while kill -0 "$NEXT_PID" 2>/dev/null && kill -0 "$LT_PID" 2>/dev/null; do
  sleep 3
done
cleanup
