# 전체 데이터 흐름 설계

## 1. 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React)                          │
├─────────────────────────────────────────────────────────────┤
│  AgentPage                                                  │
│  ├─ Sidebar (플로우 목록)                                   │
│  ├─ FlowEditor (플로우 편집)  ← User Interaction           │
│  ├─ SimPanel (제어 & 그래프)   ← User Input (설정)         │
│  └─ NodeMonitor (실시간 메트릭) ← WebSocket (메트릭)        │
└─────────────────────────────────────────────────────────────┘
                        ↑ HTTP / WebSocket
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                  Backend (FastAPI)                          │
├─────────────────────────────────────────────────────────────┤
│  API Routes                                                 │
│  ├─ /flows/* (CRUD)                                         │
│  ├─ /simulations/start (POST)                               │
│  ├─ /simulations/ws (WebSocket)                             │
│  └─ /simulations/pause (POST)                               │
│                        ↑ HTTP / WS Protocol
│                        ↓
│  DESSimulator (DES Engine)                                  │
│  ├─ Events (우선순위 큐)                                    │
│  ├─ NodeMetrics[] (메트릭 수집)                             │
│  ├─ FlowMetrics (플로우 메트릭)                             │
│  └─ Snapshots (주기적 생성)                                 │
│                        │
│                        ↓
│  Flow & Node Config                                         │
│  Database (JSON files or PostgreSQL)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 주요 데이터 흐름

### 2.1 플로우 생성/편집 흐름

```
User @ FlowEditor
   │
   ├─ 노드 추가/삭제
   ├─ 엣지 생성/삭제
   └─ 노드 설정 변경
        │
        ↓ (onChange → debounce 1sec)
   
useFlowStore.updateFlow()
   │
   ├─ 로컬 상태 업데이트 (즉시)
   │
   └─→ API.flows.update(flow_id, {...})
        │
        ↓ (PUT /api/flows/{flow_id})
   
Backend: api/flow.py
   │
   ├─ 유효성 검증
   │  ├─ Start 노드 1개 확인
   │  ├─ End 노드 1개 이상 확인
   │  └─ DAG 검증
   │
   └─→ DB 저장
        │
        ↓ (JSON 직렬화)
   
Response: { flow_id, updated_at, ... }
   │
   └─→ Client: useFlowStore 상태 업데이트 완료
```

### 2.2 시뮬레이션 시작 흐름

```
User @ SimPanel
   │
   ├─ 도착 패턴 설정 (Ramp-up / Wave)
   ├─ 시뮬레이션 기간 설정
   ├─ 속도 설정 (1x ~ 10x)
   └─ [시작] 버튼 클릭
        │
        ↓
useSimStore.startSimulation({config})
   │
   ├─ 로컬 상태: status = 'running'
   ├─ 로컬 상태: snapshots = []
   │
   └─→ WebSocket 연결
        │
        ├─ ws = new WebSocket('ws://...')
        │
        ├─ ws.onopen → POST /api/simulations/start
        │  (config를 JSON으로 전송)
        │
        └─→ Backend 수신
```

### 2.3 시뮬레이션 실행 & 메트릭 스트리밍

```
Backend: api/simulation.py (WebSocket handler)
   │
   ├─ SimulationConfig 파싱
   ├─ Flow 로드
   └─ DESSimulator 생성
        │
        ↓
Simulator.run_until(duration_sec)
   │
   ├─ 이벤트 처리 루프
   │  ├─ 요청 도착 → _on_enqueue
   │  │  ├─ NodeMetrics.queue_depth++
   │  │  └─ Request.node_enqueue_times 기록
   │  │
   │  ├─ 처리 시작 → _on_process
   │  │  ├─ wait_ms 계산
   │  │  ├─ NodeMetrics.record_wait(wait_ms)
   │  │  ├─ NodeMetrics.queue_depth--
   │  │  └─ NodeMetrics.active_requests++
   │  │
   │  ├─ 처리 완료 → _on_complete
   │  │  ├─ process_ms 계산
   │  │  ├─ NodeMetrics.record_process(process_ms)
   │  │  ├─ NodeMetrics.tick_completed()
   │  │  └─ NodeMetrics.active_requests--
   │  │
   │  └─ 주기적 (500ms) 스냅샷 생성
   │     │
   │     ├─ 모든 NodeMetrics 순회
   │     ├─ avg_wait_ms, avg_process_ms 계산
   │     ├─ bottleneck_node_id 결정
   │     │  (max avg_wait_ms인 노드)
   │     │
   │     └─→ FlowMetricSnapshot 생성
   │
   └─→ WebSocket으로 클라이언트로 전송
        │
        └─ ws.send_json(snapshot.dict())
```

### 2.4 메트릭 수신 & UI 업데이트

```
Frontend: WebSocket listener
   │
   ├─ ws.onmessage
   │  └─ snapshot = JSON.parse(event.data)
   │
   └─→ useSimStore.recordSnapshot(snapshot)
        │
        ├─ 로컬 상태: snapshots.push(snapshot)
        │  (최신순으로 유지, 길이 제한)
        │
        └─→ 구독자들 자동 업데이트
             │
             ├─ NodeMonitor
             │  ├─ useMemo로 latestSnap = snapshots[-1]
             │  ├─ NodeCard 렌더링
             │  │  ├─ queue_depth → 게이지 바
             │  │  ├─ avg_wait_ms → 대기 시간
             │  │  ├─ avg_process_ms → 처리 시간
             │  │  ├─ tps → 처리량
             │  │  └─ bottleneck_node_id → BOTTLENECK 배지
             │  │
             │  └─ 게이지 색상 업데이트
             │     (maxQueueDepth 재계산)
             │
             └─ SimPanel
                ├─ LineChart 업데이트
                │  ├─ TPS 추이 (x: 시뮬레이션 시간)
                │  ├─ flow_tps 라인 업데이트
                │  └─ avg_node_tps 라인 업데이트
                │
                └─ 처리량 요약 박스 업데이트
                   ├─ total_completed
                   ├─ total_failed
                   ├─ avg_e2e_ms
                   └─ P95/P99 (선택적)
```

### 2.5 일시정지/종료 흐름

```
User @ SimPanel
   │
   └─ [일시정지] 또는 [초기화] 버튼
        │
        ↓
useSimStore.pauseSimulation()
   │
   ├─ 로컬 상태: status = 'paused'
   ├─ WebSocket 연결 종료: ws.close()
   │
   └─→ Backend
        │
        └─ WebSocket 핸들러 종료
           (저절로 종료되거나 CLOSE 프레임 수신)
```

---

## 3. 상태 관리 (Zustand Stores)

### 3.1 useFlowStore (플로우 관리)

```typescript
interface FlowStore {
  // 상태
  flows: Flow[]
  summaries: FlowSummary[]
  currentFlowId: string | null
  
  // 액션
  fetchSummaries: () => Promise<void>
  setCurrentFlow: (flow_id: string) => void
  createFlow: (name: string) => Promise<void>
  updateFlow: (flow_id: string, flow: Flow) => Promise<void>
  deleteFlow: (flow_id: string) => Promise<void>
  duplicateFlow: (flow_id: string) => Promise<void>
}

// 사용 위치
// - AgentPage: flows 조회, currentFlow 관리
// - FlowEditor: 플로우 데이터 바인딩
// - SimPanel: startNode, endNodes 조회
```

### 3.2 useSimStore (시뮬레이션 상태)

```typescript
interface SimStore {
  // 상태
  snapshots: FlowMetricSnapshot[]    // 최신순, 길이 제한
  status: 'idle' | 'running' | 'paused'
  ws: WebSocket | null
  
  // 액션
  startSimulation: (config: SimulationConfig) => Promise<void>
  pauseSimulation: () => Promise<void>
  resumeSimulation: () => Promise<void>
  recordSnapshot: (snapshot: FlowMetricSnapshot) => void
  clearSnapshots: () => void
}

// 사용 위치
// - SimPanel: 시작/중지 제어, 그래프 업데이트
// - NodeMonitor: 메트릭 표시
// - AgentPage: 시뮬레이션 상태 감지
```

### 3.3 useToastStore (알림)

```typescript
interface ToastStore {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void
}

// 사용 위치
// - API 호출 성공/실패
// - 플로우 검증 에러
// - 시뮬레이션 시작 실패
```

---

## 4. 데이터 구조 (End-to-End)

### 4.1 Request (요청) 객체 생명주기

```python
# 백엔드에서 추적
@dataclass
class Request:
    req_id: str
    start_time_ms: float           # 플로우 시작 시각
    current_node_id: str           # 현재 위치 노드
    hop_count: int = 0
    node_enqueue_times: dict = {}  # node_id → enqueue_time_ms
    failed: bool = False

# Timeline
# t=0ms:    생성 (start_time_ms = 0)
# t=10ms:   node1 진입 (node_enqueue_times['node1'] = 10)
# t=50ms:   node1 처리 시작 (wait_ms = 50-10=40)
# t=80ms:   node1 완료 (process_ms = 80-50=30)
# t=85ms:   node2 진입 (node_enqueue_times['node2'] = 85)
# ...
# t=200ms:  완료 (end_node 진입) → e2e_latency = 200ms
#          flow_metrics.record_e2e(200)
```

### 4.2 스냅샷 → UI 매핑

```
FlowMetricSnapshot
├─ sim_time_sec: 10.5
├─ nodes[0]
│  ├─ node_id: "node-1"
│  ├─ queue_depth: 5
│  ├─ active_requests: 2
│  ├─ avg_wait_ms: 45.2
│  ├─ avg_process_ms: 234.1
│  ├─ tps: 12.4
│  ├─ p95_latency_ms: 456.7
│  └─ retry_count: 2
│
└─ bottleneck_node_id: "node-1"

        ↓ (NodeCard 렌더링)

┌─────────────────────────┐
│ 🧠 node-1 [BOTTLENECK] │
│ LLM                     │
├─────────────────────────┤
│ 큐    대기  처리  처리량 │
│ ░░░░  45ms 234ms 12.4TPS│
│ 5개   ⏱️   ⚙️    🔄 2회  │
│ 活:2                    │
└─────────────────────────┘
```

---

## 5. 통신 프로토콜

### 5.1 HTTP Endpoints

#### 플로우 관리
```
GET    /api/flows                 → FlowSummary[]
POST   /api/flows                 → Flow (name, nodes, edges)
GET    /api/flows/{flow_id}       → Flow
PUT    /api/flows/{flow_id}       → Flow (update)
DELETE /api/flows/{flow_id}       → {}
POST   /api/flows/{flow_id}/clone → Flow (copy)
```

#### 시뮬레이션 제어
```
POST   /api/simulations/start     (Body: SimulationConfig)
POST   /api/simulations/pause     (No body)
POST   /api/simulations/resume    (No body)
```

### 5.2 WebSocket Protocol

```
Connection URL: ws://server:8000/api/simulations/ws

Message Format (Server → Client):
{
  "sim_time_sec": 10.5,
  "wall_time_sec": 3.2,
  "total_completed": 1234,
  "total_failed": 5,
  "nodes": [
    {
      "node_id": "node-1",
      "queue_depth": 5,
      "active_requests": 2,
      "avg_wait_ms": 45.2,
      "avg_process_ms": 234.1,
      "tps": 12.4,
      "p95_latency_ms": 456.7,
      "p99_latency_ms": 678.9,
      "retry_count": 2
    },
    ...
  ],
  "bottleneck_node_id": "node-1",
  "flow_tps": 12.4
}

Sending Frequency:
- 1x speed: 500ms (2 messages/sec)
- 2x speed: 250ms (4 messages/sec)
- 5x speed: 100ms (10 messages/sec)
- 10x speed: 50ms (20 messages/sec)
```

---

## 6. 에러 처리 및 엣지 케이스

### 6.1 에러 시나리오

```
시뮬레이션 시작 실패
├─ Flow 검증 실패 (Start/End 없음)
├─ DAG 검증 실패 (사이클 감지)
├─ Config 검증 실패 (필수 파라미터 없음)
└─ → useToastStore.addToast('에러 메시지', 'error')

WebSocket 연결 끊김
├─ 네트워크 오류
├─ 서버 종료
└─ → useSimStore 상태 'paused'로 변경
    → useToastStore 알림

메트릭 계산 오류
├─ avg_wait_ms 음수 (타이밍 이슈)
├─ → max(0.0, wait_ms) 처리
└─ P95/P99 데이터 부족
    → None 반환 → UI에서 표시 안함
```

### 6.2 엣지 케이스

```
빈 플로우
├─ nodes = []
└─ → Start 또는 End 없음 → 시작 불가

메모리 관리
├─ 매우 긴 시뮬레이션 (수시간)
└─ → deque maxlen으로 자동 관리

그래프 성능
├─ 매우 높은 TPS (1000+ req/sec)
├─ 매우 많은 노드 (100+)
└─ → 스냅샷 스킵 또는 리샘플링 고려
```

---

## 7. 파일 구조 매핑

```
frontend/
├─ src/
│  ├─ pages/
│  │  └─ AgentPage.tsx            # 메인 레이아웃 (3컬럼)
│  ├─ components/
│  │  ├─ FlowEditor/
│  │  │  ├─ index.tsx              # ReactFlow 초기화
│  │  │  └─ nodeTypes/             # 노드 렌더링
│  │  ├─ SimPanel/
│  │  │  ├─ index.tsx              # 제어 UI + 그래프
│  │  │  └─ ControlPanel.tsx       # 설정 폼 (선택)
│  │  └─ NodeMonitor/
│  │     ├─ index.tsx              # 메트릭 패널
│  │     └─ NodeCard.tsx           # 개별 노드 카드
│  ├─ store/
│  │  └─ index.ts                  # Zustand (FlowStore, SimStore)
│  └─ api/
│     └─ client.ts                 # API 클라이언트

backend/
├─ api/
│  ├─ flow.py                      # /api/flows/*
│  └─ simulation.py                # /api/simulations/*
├─ engine/
│  ├─ simulator.py                 # DES 시뮬레이터
│  ├─ metrics.py                   # NodeMetrics, FlowMetrics
│  └─ arrival.py                   # 도착 패턴 (Ramp-up, Wave)
└─ models/
   └─ simulation.py                # Pydantic 모델
```

---

## 8. 성능 특성

### 시간 복잡도

```
시뮬레이션 엔진
- 이벤트 처리: O(log n) (우선순위 큐 heappop)
- 메트릭 업데이트: O(1) (append to deque)
- 스냅샷 생성: O(m) (m = 노드 수)
- 전체: O(events × (log n + m))

프론트엔드 렌더링
- NodeMonitor: O(n) (n = 노드 수)
- SimPanel 그래프: O(k) (k = 데이터 포인트 수)
```

### 메모리 사용

```
서버 메모리
- NodeMetrics per node: ~80KB (10000 deque entries)
- FlowMetrics: ~400KB (50000 deque entries)
- 전체 (100 노드): ~8.4MB

클라이언트 메모리
- snapshots 배열: ~5KB × 100 = 500KB (길이 제한)
- DOM: ~50KB (렌더링된 NodeCard들)
```

---

## 9. 테스트 시나리오

```
E2E 테스트
1. 플로우 생성 (5개 노드)
2. 시뮬레이션 시작 (Ramp-up 10→100명)
3. 30초 실행
4. NodeMonitor 메트릭 업데이트 확인
5. 시뮬레이션 일시정지
6. 초기화

성능 테스트
1. 매우 큰 플로우 (200+ 노드)
2. 매우 높은 부하 (1000+ req/sec)
3. 장시간 실행 (1시간)
4. 메모리 누수 검증
```

