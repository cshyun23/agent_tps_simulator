@echo off
REM Agent TPS Simulator 서버 시작 스크립트 (Windows)
REM 사용법: start.bat

setlocal enabledelayedexpansion

echo.
echo 🚀 Agent TPS Simulator 서버 시작
echo ================================
echo.

REM 현재 디렉토리 확인
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM 1. 백엔드 준비
echo [1/2] 백엔드 서버 준비 중...

if not exist "backend\" (
    echo ❌ backend 디렉토리를 찾을 수 없습니다
    pause
    exit /b 1
)

cd /d "%SCRIPT_DIR%backend"

REM Python 확인
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python이 설치되지 않았습니다
    echo 설치: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ 백엔드 준비 완료
echo.

REM 2. 프론트엔드 준비
echo [2/2] 프론트엔드 준비 중...

cd /d "%SCRIPT_DIR%frontend"

REM Node.js 확인
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js가 설치되지 않았습니다
    echo 설치: https://nodejs.org/
    pause
    exit /b 1
)

REM npm 의존성 확인
if not exist "node_modules\" (
    echo npm install 실행 중...
    call npm install >nul 2>&1
)

echo ✅ 프론트엔드 준비 완료
echo.

REM 3. 서버 시작
echo [3/3] 서버를 별도 창에서 시작합니다...
echo.

REM 백엔드 시작
cd /d "%SCRIPT_DIR%backend"
echo 📊 백엔드 서버 시작 중 (새 창에서)...
start "Agent TPS Simulator - Backend" cmd /k "python main.py"

REM 대기
timeout /t 3 /nobreak

REM 프론트엔드 시작
cd /d "%SCRIPT_DIR%frontend"
echo 💻 프론트엔드 서버 시작 중 (새 창에서)...
start "Agent TPS Simulator - Frontend" cmd /k "npm run dev"

REM 대기
timeout /t 5 /nobreak

REM 메시지
echo.
echo ========================================
echo ✅ 모든 서버가 실행 중입니다!
echo ========================================
echo.
echo 📍 프론트엔드: http://localhost:5173
echo 📍 백엔드 API: http://localhost:8000/api
echo.
echo 🌐 브라우저에서 다음 주소를 열어주세요:
echo    http://localhost:5173
echo.
echo ⚠️  서버 중지: 각 창의 cmd에서 Ctrl+C 입력
echo.
pause
