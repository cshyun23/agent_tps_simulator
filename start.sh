#!/bin/bash

# Agent TPS Simulator 서버 시작 스크립트
# 사용법: ./start.sh

set -e

echo "🚀 Agent TPS Simulator 서버 시작"
echo "================================"
echo ""

# 현재 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 백엔드 준비
echo -e "${BLUE}[1/3]${NC} 백엔드 서버 준비 중..."

if [ ! -d "backend" ]; then
    echo -e "${RED}❌ backend 디렉토리를 찾을 수 없습니다${NC}"
    exit 1
fi

cd "$SCRIPT_DIR/backend"

# Python 확인
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python이 설치되지 않았습니다${NC}"
    echo "   설치: https://www.python.org/downloads/"
    exit 1
fi

# 가상환경 생성 (없으면)
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}   가상환경 생성 중...${NC}"
    python3 -m venv venv || python -m venv venv
fi

# 가상환경 활성화
echo -e "${YELLOW}   가상환경 활성화 중...${NC}"
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    echo -e "${YELLOW}   ⚠️  가상환경 활성화 실패 (계속 진행)${NC}"
fi

# 의존성 설치
echo -e "${YELLOW}   의존성 확인 중...${NC}"
pip install -q -e . 2>/dev/null || true

echo -e "${GREEN}✅ 백엔드 준비 완료 (venv 활성화됨)${NC}"
echo ""

# 2. 프론트엔드 준비
echo -e "${BLUE}[2/3]${NC} 프론트엔드 준비 중..."

cd "$SCRIPT_DIR/frontend"

# Node.js 확인
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js가 설치되지 않았습니다${NC}"
    echo "   설치: https://nodejs.org/"
    exit 1
fi

# npm 의존성 확인
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}   npm install 실행 중...${NC}"
    npm install > /dev/null 2>&1
fi

echo -e "${GREEN}✅ 프론트엔드 준비 완료${NC}"
echo ""

# 3. 서버 시작
echo -e "${BLUE}[3/3]${NC} 서버 시작..."
echo ""

# 백엔드 백그라운드 시작
cd "$SCRIPT_DIR/backend"

# 가상환경 다시 활성화 (새 프로세스용)
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
fi

echo -e "${YELLOW}📊 백엔드 서버 시작...${NC}"
if command -v python3 &> /dev/null; then
    python3 main.py &
else
    python main.py &
fi
BACKEND_PID=$!

# 백엔드 시작 대기
sleep 3

# 백엔드 헬스 체크
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 백엔드 서버 실행 중 (PID: $BACKEND_PID)${NC}"
    echo -e "   URL: http://localhost:8000${NC}"
else
    echo -e "${RED}❌ 백엔드 서버 시작 실패${NC}"
    echo -e "${YELLOW}   백엔드 로그를 확인해주세요${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""

# 프론트엔드 시작
cd "$SCRIPT_DIR/frontend"
echo -e "${YELLOW}💻 프론트엔드 서버 시작...${NC}"
npm run dev &
FRONTEND_PID=$!

# 프론트엔드 시작 대기
sleep 5

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 모든 서버가 실행 중입니다!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📍 프론트엔드: ${BLUE}http://localhost:5173${NC}"
echo -e "📍 백엔드 API: ${BLUE}http://localhost:8000/api${NC}"
echo -e "📍 가상환경: ${BLUE}활성화됨 (backend/venv)${NC}"
echo ""
echo -e "🌐 브라우저에서 다음 주소를 열어주세요:"
echo -e "   ${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}⚠️  서버 중지: Ctrl+C 입력${NC}"
echo ""

# 프로세스 관리
cleanup() {
    echo ""
    echo -e "${YELLOW}서버 중지 중...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✅ 서버가 중지되었습니다${NC}"
}

trap cleanup EXIT

# 서버 실행 유지
wait
