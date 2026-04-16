# 서버 실행 가이드

Agent TPS Simulator는 **백엔드(Python)**와 **프론트엔드(React)** 두 개의 서버가 필요합니다.

---

## 🟦 백엔드 서버 (Python/FastAPI)

### 준비 사항

```bash
# 저장소 디렉토리로 이동
cd /Users/sunghyun_choi/agent_tps_simulator/backend
```

### 서버 시작

**Option 1: 기본 실행 (권장)**

```bash
python main.py
```

**출력:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

**Option 2: 다른 포트 사용**

```bash
python main.py --port 8001
```

**Option 3: uvicorn 직접 실행**

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 서버 정상 작동 확인

브라우저 또는 Terminal에서:

```bash
curl http://localhost:8000/health
```

**성공 응답:**
```json
{"status": "ok"}
```

### 포트 변경했을 경우

프론트엔드 `vite.config.ts`의 프록시 URL 수정:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8001',  // ← 변경
    changeOrigin: true,
    ws: true,
  },
}
```

### 서버 중단

```bash
Ctrl + C
```

---

## 🟦 프론트엔드 서버 (Node.js/Vite)

### 준비 사항

```bash
# 저장소 디렉토리로 이동
cd /Users/sunghyun_choi/agent_tps_simulator/frontend

# 의존성 설치 (처음 한 번만)
npm install
```

### 개발 서버 시작

```bash
npm run dev
```

**출력:**
```
  VITE v5.4.21  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### 브라우저 접속

자동으로 열리거나, 수동으로 접속:

```
http://localhost:5173
```

### 다른 포트 사용

```bash
npm run dev -- --port 5174
```

### 개발 서버 중단

```bash
Ctrl + C
```

---

## ⚙️ 올바른 실행 순서

### 처음 시작하기

**1단계: 백엔드 서버 시작**

```bash
# 터미널 1
cd backend
python main.py
# 대기: Uvicorn running on http://127.0.0.1:8000
```

**2단계: 프론트엔드 서버 시작**

```bash
# 터미널 2
cd frontend
npm run dev
# 대기: ➜  Local: http://localhost:5173
```

**3단계: 브라우저에서 접속**

```
http://localhost:5173
```

✅ **준비 완료!**

---

## 🔍 서버 상태 확인

### 백엔드 헬스 체크

```bash
# 터미널에서
curl http://localhost:8000/health

# 응답
{"status": "ok"}
```

또는 브라우저:
```
http://localhost:8000/health
```

### 프론트엔드 확인

브라우저에서 접속 가능하면 정상:
```
http://localhost:5173
```

### API 엔드포인트 테스트

```bash
# 플로우 목록 조회
curl http://localhost:8000/api/flows/

# 응답 (JSON)
[...]
```

---

## 🛠️ 일반적인 문제 & 해결

### 1. "Port already in use" 에러

**증상:**
```
[Errno 48] Address already in use
```

**원인:** 포트가 이미 사용 중

**해결:**

**방법 A: 다른 포트 사용**
```bash
python main.py --port 8001
```

**방법 B: 기존 프로세스 종료**

```bash
# macOS/Linux - 포트 8000을 사용하는 프로세스 찾기
lsof -i :8000

# 프로세스 ID로 종료
kill -9 <PID>

# Windows (PowerShell)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### 2. "Cannot connect to localhost:8000" 에러

**확인:**
1. 백엔드 서버 실행 중인가?
   ```bash
   curl http://localhost:8000/health
   ```

2. 포트 번호 맞는가?
   - 기본값: 8000
   - 변경했으면 프론트엔드 설정도 수정

3. 방화벽 차단 여부 확인

### 3. "npm: command not found"

**원인:** Node.js/npm 미설치

**해결:**
```bash
# Node.js 설치 확인
node --version

# 미설치 시 설치
# macOS: brew install node
# 또는 https://nodejs.org에서 다운로드
```

### 4. Python 모듈 에러

**증상:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**해결:**
```bash
# 가상환경 활성화
source venv/bin/activate  # macOS/Linux
# 또는
venv\Scripts\activate  # Windows

# 의존성 설치
pip install -r requirements.txt
```

### 5. "Permission denied" (macOS/Linux)

**증상:**
```
Permission denied: python
```

**해결:**
```bash
# 실행 권한 추가
chmod +x main.py

# 또는 python3 사용
python3 main.py
```

---

## 🚀 프로덕션 배포

### 프론트엔드 빌드

```bash
cd frontend
npm run build

# 결과: dist/ 디렉토리 생성
```

빌드된 파일을 웹 서버(Nginx, Apache)에서 제공:

```bash
# 로컬에서 빌드 결과 확인
npm run preview
```

### 백엔드 프로덕션 실행

```bash
# 여러 워커로 실행 (성능 향상)
cd backend

uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4

# Windows
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker로 배포 (선택사항)

**Dockerfile 예시 (백엔드):**
```dockerfile
FROM python:3.9
WORKDIR /app
COPY backend .
RUN pip install -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# 빌드
docker build -t agent-tps-simulator-backend .

# 실행
docker run -p 8000:8000 agent-tps-simulator-backend
```

---

## 📋 체크리스트

백엔드 시작 전:
- [ ] `cd backend` 했는가?
- [ ] Python 3.9+ 설치되었는가?
- [ ] 가상환경 활성화되었는가? (venv)
- [ ] 의존성 설치했는가? (`pip install -e .`)

프론트엔드 시작 전:
- [ ] `cd frontend` 했는가?
- [ ] Node.js 18+ 설치되었는가?
- [ ] 의존성 설치했는가? (`npm install`)
- [ ] 백엔드 서버 실행 중인가?

---

## 🎯 한 줄 요약

**새로운 터미널 2개를 열어서:**

```bash
# 터미널 1
cd backend && python main.py

# 터미널 2
cd frontend && npm run dev
```

**그 다음: `http://localhost:5173` 방문**

---

## 📞 도움말

더 자세한 정보:
- 설치: `INSTALL.md`
- 사용법: `USER_MANUAL.md` 또는 `QUICK_START.md`
- API: `API.md`

서버가 잘 실행되었나요? 🚀
