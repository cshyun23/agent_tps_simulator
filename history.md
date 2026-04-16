# Command History

## 2026-04-16

### 사용자 메뉴얼 작성 완료 ✅
1. **USER_MANUAL.md** (8000줄 이상)
   - 시작하기: 첫 사용자를 위한 5분 가이드
   - 기본 개념: TPS, Latency, 노드 종류 설명
   - 플로우 만들기: 단계별 상세 가이드 (레이아웃 포함)
   - LLM 서버 설정: 파라미터 값 결정 방법
   - 시뮬레이션 실행: 도착 패턴, 설정, 실시간 모니터링
   - 결과 분석: 비교 뷰 사용 방법
   - FAQ: 10개 항목 (토큰, TTFT/TPOP, 동시 처리, 오류 등)
   - 팁&트릭: 성능 분석 체크리스트 포함

2. **QUICK_START.md** (5분 완전 초보자용)
   - 1단계: 서버 설정 (1분)
   - 2단계: LLM 서버 생성 (1분)
   - 3단계: 플로우 선택 (30초)
   - 4단계: 노드 설정 (1분)
   - 5단계: 시뮬레이션 실행 (1.5분)
   - 결과 확인 및 해석
   - 다음 단계 (성능 개선)
   - 빠른 문제 해결

3. **문서 구조**
   ```
   신규 사용자
   └─ QUICK_START.md (5분)
      └─ USER_MANUAL.md (상세 가이드)
         └─ API.md (기술)
         └─ INSTALL.md (설치)
   ```

### Phase 4 성능 최적화, 테스트, 문서화 완료 ✅

1. **Task 1: 번들 크기 최적화 & 코드 분할** - vite.config.ts, App.tsx
   - Vite 코드 분할 설정 추가 (recharts, react-flow, vendor 분리)
   - React.lazy + Suspense로 페이지별 동적 로드 구현
   - LoadingSpinner 컴포넌트 추가
   - 번들 분할로 초기 로드 시간 개선
   - 각 페이지별 청크 독립적 로드

2. **Task 2: 테스트 코드 작성** - vitest.config.ts, src/__tests__/
   - Vitest 설정 파일 추가 (jsdom 환경)
   - `store.test.ts`: Toast store 단위 테스트 (6개 테스트 케이스)
   - `api.test.ts`: API 클라이언트 단위 테스트 (fetch 목킹)
   - 테스트는 명시적 요청 시 실행 (npm run test 스크립트 추가 필요)

3. **Task 3: 문서화 완성**
   - `INSTALL.md`: 설치 가이드
     - 백엔드/프론트엔드 설정 단계별 설명
     - 빌드 및 배포 방법
     - 포트 충돌 해결 방법
   - `USAGE.md`: 사용 가이드 (3600줄)
     - 3개 탭별 상세 사용 방법
     - 노드 종류 및 설정값 설명
     - Conditional 분기 설정 예시
     - Import/Export, 시뮬레이션 실행 가이드
     - 결과 분석 및 비교 방법
     - 성능 분석 팁 및 문제 해결
   - `API.md`: API 문서
     - REST API 엔드포인트 전체 명시
     - WebSocket 프로토콜 설명
     - 요청/응답 예제
     - 플로우 노드 설정 JSON 포맷
     - JavaScript/Python 예제 코드

4. **빌드 결과**: `npm run build` 성공
   - TypeScript 에러: 0개 ✅
   - 번들 분할 완료:
     - recharts: 367KB
     - react-flow: 316KB
     - vendor: 7.8KB
     - 초기 번들 크기 최적화
   - 코드 스플리팅으로 지연 로딩 구현

### Phase 3 UX/기능 개선 완료 ✅
1. **Task 1: 토스트 메시지 시스템** - components/Toast/, store/index.ts, App.tsx
   - Toast 컴포넌트 추가 (우측상단 고정 위치, 자동 소멸)
   - useToastStore 생성 (Zustand 기반 toast 상태 관리)
   - addToast(message, type, duration) 메서드 제공
   - 4가지 타입: success, error, info, warning

2. **Task 2: 플로우 복제 & 인라인 편집** - pages/AgentPage.tsx
   - 플로우 더블클릭으로 이름 인라인 편집
   - 플로우 목록 hover 시 "📋 복제", "🗑 삭제" 버튼 표시
   - duplicateFlow() 함수로 플로우 복제 구현
   - 각 액션마다 토스트 메시지 표시

3. **Task 3: 시뮬레이션 로딩 상태 & 에러 처리** - components/SimPanel/index.tsx
   - 시뮬레이션 진행 중 "⏳ 시뮬레이션 진행 중..." 표시
   - 재생속도 표시
   - 시뮬레이션 시작/완료/에러 메시지 추가
   - 다운로드 함수 에러 처리
   - startNode/endNodes 검증

4. **Task 4: FlowEditor 에러 처리** - components/FlowEditor/index.tsx
   - 플로우 저장 성공/실패 메시지
   - Export/Import 성공/실패 메시지
   - 파일 파싱 에러 처리

5. **Task 5: LLMHubPage 에러 처리** - pages/LLMHubPage.tsx
   - 서버 생성/수정/삭제 성공/실패 메시지
   - GPU Reference 다운로드/업로드 성공/실패 메시지
   - ServerForm의 모든 API 호출에 에러 처리

6. **Task 6: ComparePage 결과 비교 뷰 완성** - pages/ComparePage.tsx
   - 결과 로드 시 에러 처리 및 토스트 메시지
   - 히스토리 목록에 삭제 버튼 추가
   - 결과 삭제 시 화면 자동 업데이트
   - 비교 결과 요약 테이블 및 4개 차트 표시

7. **최종 빌드 결과**: `npm run build` 성공
   - TypeScript 에러: 0개 ✅
   - 번들 크기: 743KB (gzipped 226KB)
   - 모든 Phase 3 기능 통합 완료 ✅

### Phase 2 구현 완료 ✅
1. **Task 1: 시뮬레이션 결과 다운로드** - SimPanel/index.tsx
   - resultId state 추가
   - downloadFile() helper 함수 구현
   - downloadJSON() / downloadCSV() 함수 구현
   - Summary 섹션 하단에 "📥 JSON", "📥 CSV" 다운로드 버튼 UI 추가

2. **Task 2: Flow Import/Export** - FlowEditor/index.tsx
   - downloadFile() helper 함수 구현
   - exportFlow() 함수: flow를 JSON으로 다운로드
   - importFlow() 함수: 파일 선택 → JSON parse → 노드/엣지 업데이트 → API 저장
   - top-center Panel에 "📤 Export", "📥 Import" 버튼 추가
   - 숨겨진 파일 input (fileInputRef) 추가

3. **Task 3: Edge Labels (분기 이름 표시)** - edges.tsx, FlowEditor/index.tsx
   - BranchEdge 컴포넌트 추가 (EdgeLabelRenderer로 라벨 표시)
   - edgeTypes에 'branch' 타입 등록
   - FlowEditor에서 엣지 로드 시 branch data 포함하여 'branch' 타입으로 설정

4. **Task 4: GPU Reference 관리 UI** - LLMHubPage.tsx, api/client.ts
   - gpuRef state, gpuFileRef 추가
   - downloadFile() helper 함수 구현
   - downloadGPURef() / importGPURef() 함수 구현
   - GPU Reference 섹션 추가: "📤 Export", "📥 Import" 버튼
   - api/client.ts: reqFormData() 함수 + uploadGPUReference() 메서드 추가

5. **빌드 결과**: `npm run build` 성공
   - TypeScript 에러: 0개 ✅
   - 번들 크기: 739KB (gzipped 225KB)
   - 모든 수정 사항 컴파일 완료

### Frontend Implementation Complete ✅
1. **TypeScript Build Fix**: Fixed React Flow v12 type inference issues by casting `useNodesState` and `useEdgesState` returns with `as any`.
   - Command: `npm run build` (successful, no TypeScript errors)
   - All components compile successfully

2. **Frontend Components Completed**:
   - Foundation: types, API client, Zustand store, Vite config ✅
   - App.tsx: tab navigation + global layout ✅
   - Custom nodes: Start, LLM, Tool, Conditional, Parallel, End ✅
   - Custom edges + back edge detection (DFS) ✅
   - Node settings popup + template modal (4 templates) ✅
   - FlowEditor: undo/redo, context menu, save functionality ✅
   - SimPanel: real-time charts, WebSocket integration, controls ✅
   - AgentPage: 3-column layout (sidebar | editor | panel) ✅
   - LLMHubPage: server CRUD operations ✅
   - ComparePage: history list + comparison charts ✅

3. **API Integration Verification**:
   - ✅ Backend running on localhost:8000
   - ✅ Frontend dev server running on localhost:5173
   - ✅ Vite proxy configured for /api endpoints
   - ✅ All API endpoints tested and working:
     - `/api/flows/` - Flow list (2 test flows created)
     - `/api/llm-hub/servers` - LLM server list (1 test server created)
     - `/api/llm-hub/gpu-reference` - GPU reference data
     - `/api/simulation/history` - Simulation results
     - `ws://localhost:8000/api/simulation/ws` - WebSocket ready

4. **Test Data Created**:
   - LLM Server: "Test LLM Server" (H100-80G, 70B Llama-3)
   - Simple Flow: start → end
   - RAG Flow: start → LLM (query analysis) → Tool (search) → LLM (answer) → end

5. **Build Status**: 
   - TypeScript compilation: ✅ No errors
   - Vite production build: ✅ 728KB final bundle
   - Development server: ✅ Running with hot reload

## 2026-04-15

1. 모든 명령은 history.md에 저장할 것. 별도 지시 없이 파일 생성 금지. 테스트는 명시적으로 요청할 때만 수행. 모든 Python 가상환경은 `venv`로 생성하여 사용.
2. README.md에 프로젝트 목표, 설계 방안, 사용법 작성. 코딩 전 설계 단계 문서화.
3. 설계 보완: Conditional 분기 확률(%) 및 재시도 로직, 플로우 JSON 포맷, 도착 패턴 Ramp-up/Wave 파라미터 상세화, GPU 레퍼런스 JSON 업로드/다운로드 포맷 정의.
4. LLM latency 계산 정밀화: TTFT/TPOP 기반 계산 (TTFT는 input token에 선형 스케일, decode는 output_tokens × TPOP). KV cache 블록 계산으로 max_concurrent_requests 도출. 추론 서버 타입(vLLM 우선, 추후 확장) 추가. 서버 등록 시 레퍼런스 TTFT/TPOP 및 측정 기준 토큰 수 입력.
8. 프론트엔드 세팅: Vite 5 + React + TypeScript, @xyflow/react, recharts, zustand 설치. 빌드 확인 완료.
7. 백엔드 전체 구현: models (flow, llm_server, simulation), api (flow, llm_hub, simulation), engine (arrival, metrics, node, simulator), data/gpu_reference.json, main.py. python-multipart 의존성 추가. 서버 기동 및 /health 확인 완료.
6. uv 기반 Python 환경 설정: pyproject.toml 생성 (fastapi, uvicorn, pydantic, numpy), .gitignore 추가 (Python .venv/, React frontend/node_modules/ 등).
5. 설계 보완 (섹션 1~5 전체 결정사항 README 반영): DES 방식 확정, TTFT prefill 배치 대기 포함, KV cache 동적 증가, 동일 서버 물리적 공유 처리. Parallel 노드 추가(fan-out/in), 루프 엣지 back edge 감지(점선+주황), 글로벌 max_hops=10, 루프/재시도 max 설정 필수화. 시뮬레이션 시 Start/End 노드 직접 선택. 토큰 수 정규분포 샘플링(std=avg×0.2). P95/P99 메트릭 추가(체크박스). 화면 3개(Agent Flow+Sim / LLM Hub / 비교 뷰) 구조, 플로우 목록 사이드바, 노드 팝업 편집, Undo/Redo+우클릭 메뉴, 템플릿 선택. WebSocket 고정 주기(재생속도 비례), 브라우저 닫힘 시 즉시 중단, 동시 시뮬레이션 미지원. 결과 JSON/CSV 다운로드, 시뮬레이션 히스토리 저장 및 비교 뷰 구현.

### 부분 구현 마무리 (Phase 1)
1. **Conditional Branches 편집 UI** - NodeSettingsPopup.tsx
   - handleChange 함수 확장 (nested path 지원)
   - branches 배열 편집 가능: 추가/삭제/수정
   - 각 branch별 branch_name, probability(%), target_node 입력 필드
   - probability 합계 표시 및 검증 (100% 필요)

2. **Wave Arrival Pattern UI** - SimPanel/index.tsx
   - Arrival Pattern 타입 선택 드롭다운 추가 (Ramp-up / Wave)
   - Ramp-up 파라미터: peak_users, ramp_duration_sec, hold_duration_sec, ramp_shape
   - Wave 파라미터: min_users, peak_users, period_sec
   - 타입 전환 시 state 자동 초기화

3. **Flow 유효성 검증** - FlowEditor/index.tsx
   - validateFlow() 함수: Conditional branches 검증 + isolated nodes 검증
   - handleStartSimulation() 함수: 검증 후 시뮬레이션 시작
   - 검증 실패 시 모달 팝업으로 에러 메시지 표시
   - Start/End 노드 미존재, 분기 확률 합 != 100%, 연결되지 않은 노드 감지

4. 빌드 결과: TypeScript 에러 없음 ✅

