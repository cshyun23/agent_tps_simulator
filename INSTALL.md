# 설치 가이드

## 전제 조건

- Python 3.9+
- Node.js 18+
- npm 또는 yarn

## 설치 단계

### 1. 저장소 클론

```bash
git clone <repository-url>
cd agent_tps_simulator
```

### 2. 백엔드 설정

```bash
cd backend

# Python 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치 (uv 사용)
# uv가 없으면: pip install -e .
uv pip install -e .

# 서버 실행
python main.py
```

서버가 `http://localhost:8000`에서 실행됩니다.

### 3. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

개발 서버가 `http://localhost:5173`에서 실행됩니다.

### 4. 접속

브라우저에서 `http://localhost:5173`을 열고 애플리케이션을 사용합니다.

---

## 빌드

### 프론트엔드 프로덕션 빌드

```bash
cd frontend
npm run build
```

빌드 결과는 `dist/` 디렉토리에 생성됩니다.

### 백엔드 배포

```bash
cd backend

# 프로덕션 서버 실행
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 테스트

### 프론트엔드 테스트 (선택사항)

```bash
cd frontend

# 테스트 실행 (Vitest 설정됨)
npm run test  # 스크립트 추가 필요
```

---

## 문제 해결

### 포트 충돌

만약 8000 또는 5173 포트가 이미 사용 중이면:

**백엔드:**
```bash
python main.py --port 8001
```

**프론트엔드:**
```bash
npm run dev -- --port 5174
```

그리고 `frontend/vite.config.ts`의 프록시 URL을 수정합니다.

### 의존성 문제

```bash
# 캐시 삭제 후 재설치
npm cache clean --force
npm install
```

---

## 개발 환경

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: FastAPI + Python 3.9+
- **상태관리**: Zustand (프론트)
- **차트**: Recharts
- **플로우 시각화**: React Flow v12
- **테스트**: Vitest + React Testing Library

---

## 디렉토리 구조

```
agent_tps_simulator/
├── backend/
│   ├── main.py              # 메인 진입점
│   ├── models/              # 데이터 모델
│   ├── api/                 # API 엔드포인트
│   ├── engine/              # 시뮬레이션 엔진
│   ├── data/                # 저장 데이터 (JSON)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # 페이지 컴포넌트
│   │   ├── components/      # 재사용 컴포넌트
│   │   ├── api/             # API 클라이언트
│   │   ├── store/           # Zustand store
│   │   ├── types/           # TypeScript 타입
│   │   └── __tests__/       # 테스트 파일
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   └── package.json
└── README.md
```
