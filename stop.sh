#!/bin/bash

echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "        국어 지문 분석기 종료 중..."
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

pkill -f "next dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
pkill -f "localtunnel" 2>/dev/null || true

sleep 1

# 포트 3000에 남아있는 프로세스 강제 종료
PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PID" ]; then
  kill -9 "$PID" 2>/dev/null
  echo "  포트 3000 프로세스 강제 종료 (PID: $PID)"
fi

echo "  서버가 종료되었습니다."
echo ""
