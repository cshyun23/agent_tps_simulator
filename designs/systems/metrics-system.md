# 메트릭 시스템 설계

## 1. 개요

### 목적
시뮬레이션 실행 중 각 노드 및 전체 플로우의 성능 메트릭을 수집, 계산, 저장하고 클라이언트에 실시간 전송합니다.

### 범위
- **노드별 메트릭**: 큐 깊이, 대기시간, 처리시간, TPS, 재시도 횟수, P95/P99
- **플로우 메트릭**: 전체 TPS, 평균 E2E 레이턴시, 완료/실패 요청 수
- **수집 주기**: 1회/500ms(speed 1x), 50ms(speed 10x) 등으로 조정
- **저장소**: 메모리 (최근 N개 유지), 선택적 데이터베이스
- **전송**: WebSocket Push (Snapshot 배열)

### 핵심 개념
- **Event-Driven**: 요청 도착/처리/완료 시 메트릭 업데이트
- **Window-based**: TPS는 최근 1초 윈도우 기준 계산
- **Percentile**: 완료된 요청 시간들로부터 P95/P99 계산
- **Realtime**: 스냅샷 주기마다 JSON으로 직렬화해 클라이언트로 전송

---

## 2. 상세 설계

### 2.1 메트릭 수집 구조

#### 계층 구조
```
┌─────────────────────────────────────────┐
│ FlowMetrics (전체 플로우)               │
│ - total_completed: int                  │
│ - total_failed: int                     │
│ - e2e_times: deque[float]              │
│ - flow_tps: float                       │
└─────────────────────────────────────────┘
         ↑ 구성
         │
┌─────────────────────────────────────────┐
│ NodeMetrics[] (각 노드)                 │
│ - node_id: string                       │
│ - queue_depth: int                      │
│ - active_requests: int                  │
│ - wait_times: deque[float]              │
│ - process_times: deque[float]           │
│ - retry_count: int                      │
│ - tps: float                            │
└─────────────────────────────────────────┘
```

#### NodeMetrics 상세

**실시간 상태**
```python
class NodeMetrics:
    node_id: str
    
    # 현재 상태
    queue_depth: int = 0        # 현재 큐에 있는 요청 수
    active_requests: int = 0    # 현재 처리 중인 요청 수
    
    # 히스토리 (최근 N개)
    _wait_times: deque = deque(maxlen=10000)      # 큐 대기시간 기록
    _process_times: deque = deque(maxlen=10000)   # 처리시간 기록
    
    # 윈도우 기반 (TPS 계산)
    _completed_in_window: int = 0   # 최근 1초 내 완료 수
    _window_start: float = 0        # 윈도우 시작 시간
    
    # 누적 통계
    _total_processed: int = 0       # 총 처리한 요청 수
    _retry_count: int = 0           # 총 재시도 횟수
```

**계산 메서드**
```python
class NodeMetrics:
    def avg_wait_ms(self) -> float:
        """평균 큐 대기시간"""
        return np.mean(self._wait_times) if self._wait_times else 0.0
    
    def avg_process_ms(self) -> float:
        """평균 처리시간"""
        return np.mean(self._process_times) if self._process_times else 0.0
    
    def p95_ms(self) -> Optional[float]:
        """95 백분위수 (처리시간)"""
        if len(self._process_times) < 20:
            return None  # 데이터 부족
        return np.percentile(list(self._process_times), 95)
    
    def p99_ms(self) -> Optional[float]:
        """99 백분위수 (처리시간)"""
        if len(self._process_times) < 100:
            return None
        return np.percentile(list(self._process_times), 99)
    
    def tps(self, window_sec: float = 1.0) -> float:
        """초당 처리 요청 수"""
        return self._completed_in_window / max(window_sec, 1e-9)
    
    def record_wait(self, wait_ms: float):
        """큐 대기시간 기록"""
        self._wait_times.append(wait_ms)
    
    def record_process(self, process_ms: float):
        """처리시간 기록"""
        self._process_times.append(process_ms)
        self._total_processed += 1
    
    def record_retry(self):
        """재시도 횟수 증가"""
        self._retry_count += 1
    
    def tick_completed(self):
        """요청 완료 시 호출 (TPS 윈도우 업데이트)"""
        self._completed_in_window += 1
    
    def reset_window(self):
        """TPS 윈도우 리셋 (1초 주기)"""
        self._completed_in_window = 0
```

#### FlowMetrics 상세

```python
class FlowMetrics:
    # 히스토리 (최근 N개)
    _e2e_times: deque = deque(maxlen=50000)     # 엔드-투-엔드 레이턴시
    
    # 누적 통계
    _total_completed: int = 0      # 총 완료 요청 수
    _total_failed: int = 0         # 총 실패 요청 수
    
    # 윈도우 기반
    _completed_in_window: int = 0  # 최근 1초 내 완료 수

class FlowMetrics:
    def avg_e2e_ms(self) -> float:
        """평균 엔드-투-엔드 레이턴시"""
        return np.mean(self._e2e_times) if self._e2e_times else 0.0
    
    def p95_e2e_ms(self) -> Optional[float]:
        if len(self._e2e_times) < 20:
            return None
        return np.percentile(list(self._e2e_times), 95)
    
    def tps(self, window_sec: float = 1.0) -> float:
        """전체 플로우의 TPS (완료 기준)"""
        return self._completed_in_window / max(window_sec, 1e-9)
    
    def record_e2e(self, latency_ms: float):
        """요청 완료 시 호출"""
        self._e2e_times.append(latency_ms)
        self._total_completed += 1
        self._completed_in_window += 1
    
    def record_failed(self):
        """요청 실패 시 호출"""
        self._total_failed += 1
    
    def reset_window(self):
        """TPS 윈도우 리셋 (1초 주기)"""
        self._completed_in_window = 0
```

### 2.2 메트릭 수집 이벤트

#### 요청 생명주기

```
1. 도착 (Arrival)
   ├─ node.queue_depth += 1
   ├─ request.node_enqueue_times[node_id] = now_ms
   └─ [데이터: 진입 시각]

2. 처리 시작 (Dequeue)
   ├─ wait_ms = now_ms - request.node_enqueue_times[node_id]
   ├─ node.record_wait(wait_ms)
   ├─ node.queue_depth -= 1
   ├─ node.active_requests += 1
   └─ [데이터: 대기 시간]

3. 처리 완료 (Complete)
   ├─ process_ms = now_ms - dequeue_time
   ├─ node.record_process(process_ms)
   ├─ node.active_requests -= 1
   ├─ node.tick_completed()
   └─ [데이터: 처리 시간]

4. 플로우 완료 (E2E)
   ├─ e2e_ms = now_ms - request.start_time_ms
   ├─ flow.record_e2e(e2e_ms)
   └─ [데이터: 엔드투엔드 시간]

5. 재시도 (Retry)
   ├─ node.record_retry()
   └─ [데이터: 재시도 횟수]
```

#### 호출 위치 (backend/engine/simulator.py)

| 이벤트 | 메서드 | 호출 코드 |
|--------|--------|----------|
| 도착 | _on_enqueue | `nm.queue_depth += 1` |
| 처리시작 | _on_enqueue | `nm.record_wait(wait_ms); nm.queue_depth -= 1` |
| 처리완료 | _on_complete | `nm.record_process(process_ms); nm.tick_completed()` |
| E2E완료 | _complete_flow | `flow_metrics.record_e2e(e2e_ms)` |
| 재시도 | _on_retry | `nm.record_retry()` |

### 2.3 스냅샷 생성 및 전송

#### 스냅샷 구조
```python
class NodeMetricSnapshot(BaseModel):
    node_id: str
    queue_depth: int
    active_requests: int
    avg_wait_ms: float
    avg_process_ms: float
    tps: float
    p95_latency_ms: Optional[float]
    p99_latency_ms: Optional[float]
    retry_count: int

class FlowMetricSnapshot(BaseModel):
    sim_time_sec: float         # 시뮬레이션 시간
    wall_time_sec: float        # 실제 경과 시간
    total_completed: int        # 누적 완료 요청
    total_failed: int          # 누적 실패 요청
    nodes: List[NodeMetricSnapshot]  # 모든 노드의 메트릭
    bottleneck_node_id: str     # 병목 노드 ID
    flow_tps: float            # 플로우 전체 TPS
```

#### 스냅샷 생성 로직
```python
def create_snapshot(self, now_ms: float) -> FlowMetricSnapshot:
    """현재 시각의 메트릭 스냅샷 생성"""
    
    node_snaps = []
    max_wait = 0
    bottleneck_id = None
    
    # 각 노드의 메트릭 계산
    for node_id, nm in self._node_metrics.items():
        avg_wait = nm.avg_wait_ms()
        if avg_wait > max_wait:
            max_wait = avg_wait
            bottleneck_id = node_id
        
        node_snaps.append(NodeMetricSnapshot(
            node_id=node_id,
            queue_depth=nm.queue_depth,
            active_requests=nm.active_requests,
            avg_wait_ms=avg_wait,
            avg_process_ms=nm.avg_process_ms(),
            tps=nm.tps(window_sec=1.0),
            p95_latency_ms=nm.p95_ms() if self.config.show_p95 else None,
            p99_latency_ms=nm.p99_ms() if self.config.show_p99 else None,
            retry_count=nm.total_retries
        ))
    
    # 플로우 메트릭
    flow_snap = FlowMetricSnapshot(
        sim_time_sec=now_ms / 1000.0,
        wall_time_sec=(time.time() - self.start_wall_time),
        total_completed=self.flow_metrics.total_completed,
        total_failed=self.flow_metrics.total_failed,
        nodes=node_snaps,
        bottleneck_node_id=bottleneck_id,
        flow_tps=self.flow_metrics.tps(window_sec=1.0)
    )
    
    return flow_snap
```

#### 전송 주기 (playback_speed에 따라)
```python
SNAPSHOT_INTERVAL_MS = {
    1: 500,    # 1x: 500ms (초당 2회)
    2: 250,    # 2x: 250ms (초당 4회)
    5: 100,    # 5x: 100ms (초당 10회)
    10: 50     # 10x: 50ms (초당 20회)
}
```

#### WebSocket 전송
```python
# API 엔드포인트에서
websocket.send_json(snapshot.dict())
```

---

## 3. 데이터 모델

### 3.1 Python (백엔드)

**메트릭 클래스 계층**
```python
# backend/engine/metrics.py

@dataclass
class NodeMetrics:
    node_id: str
    _wait_times: deque[float] = field(default_factory=...)
    _process_times: deque[float] = field(default_factory=...)
    queue_depth: int = 0
    active_requests: int = 0
    # ... (메서드는 위 2.1 참조)

@dataclass
class FlowMetrics:
    _e2e_times: deque[float] = field(default_factory=...)
    _total_completed: int = 0
    _total_failed: int = 0
    _completed_in_window: int = 0
    # ... (메서드는 위 2.1 참조)
```

**스냅샷 모델 (models/simulation.py)**
```python
class NodeMetricSnapshot(BaseModel):
    node_id: str
    queue_depth: int
    active_requests: int
    avg_wait_ms: float
    avg_process_ms: float
    tps: float
    p95_latency_ms: Optional[float] = None
    p99_latency_ms: Optional[float] = None
    retry_count: int = 0

class FlowMetricSnapshot(BaseModel):
    sim_time_sec: float
    wall_time_sec: float
    total_completed: int
    total_failed: int
    nodes: List[NodeMetricSnapshot]
    bottleneck_node_id: Optional[str] = None
    flow_tps: float
```

### 3.2 TypeScript (프론트엔드)

**Zustand Store**
```typescript
interface SimState {
    // 메트릭 데이터
    snapshots: FlowMetricSnapshot[]  // 최신순 배열
    status: 'idle' | 'running' | 'paused'
    
    // 액션
    recordSnapshot: (snapshot: FlowMetricSnapshot) => void
    clearSnapshots: () => void
    pause: () => void
}

// 사용 예
const latestSnap = snapshots[snapshots.length - 1]
const maxQueueDepth = Math.max(...latestSnap.nodes.map(n => n.queue_depth))
const bottleneckNode = latestSnap.nodes.find(n => n.node_id === latestSnap.bottleneck_node_id)
```

---

## 4. 구현 체크리스트

### 파일 생성/수정

| 파일 | 작업 | 라인 | 설명 |
|------|------|------|------|
| `backend/engine/metrics.py` | 신규 | ~150 | NodeMetrics, FlowMetrics 클래스 |
| `backend/engine/simulator.py` | 수정 | +50 | 메트릭 수집 호출 |
| `backend/models/simulation.py` | 수정 | +20 | 스냅샷 모델 정의 |
| `backend/api/simulation.py` | 수정 | +10 | WebSocket 스냅샷 전송 |
| `frontend/src/store/index.ts` | 수정 | +30 | useSimStore 확장 |

### engine/metrics.py 구현 항목
- [ ] NodeMetrics 클래스 정의
  - [ ] __init__ (node_id)
  - [ ] record_wait(), record_process(), record_retry()
  - [ ] avg_wait_ms(), avg_process_ms()
  - [ ] p95_ms(), p99_ms()
  - [ ] tps(), tick_completed(), reset_window()
  - [ ] @property total_retries, total_processed
- [ ] FlowMetrics 클래스 정의
  - [ ] record_e2e(), record_failed()
  - [ ] avg_e2e_ms(), p95_e2e_ms()
  - [ ] tps(), reset_window()
  - [ ] @property total_completed, total_failed

### simulator.py 메트릭 수집
- [ ] _on_enqueue에서 record_wait, queue_depth 변경
- [ ] _on_complete에서 record_process, tick_completed
- [ ] _complete_flow에서 flow_metrics.record_e2e
- [ ] _fail_request에서 flow_metrics.record_failed
- [ ] retry 이벤트에서 record_retry
- [ ] snapshot 생성 로직 구현
- [ ] window 리셋 로직 (1초 주기)

### API 전송 (WebSocket)
- [ ] snapshot을 JSON으로 직렬화
- [ ] 클라이언트로 주기적 push
- [ ] 에러 처리

### 프론트엔드 Store
- [ ] snapshots 상태
- [ ] recordSnapshot 액션
- [ ] clearSnapshots 액션

---

## 5. 성능 고려사항

### 메모리 관리
- NodeMetrics의 deque: maxlen=10000으로 제한
- FlowMetrics의 deque: maxlen=50000으로 제한
- 초과 시 자동으로 오래된 데이터 제거

### 계산 효율성
- np.mean, np.percentile 사용 (빠른 연산)
- P95/P99는 필요시만 계산 (20/100개 이상 데이터 필요)
- 스냅샷 생성은 O(N) (노드 수)

### 네트워크 최적화
- JSON 직렬화 크기: ~5KB (100노드 기준)
- 전송 주기: 50~500ms (설정가능)
- WebSocket 배압 처리: 필요시 스냅샷 스킵

---

## 6. 테스트 항목

- [ ] 메트릭 계산 정확성 (단위 테스트)
- [ ] P95/P99 백분위수 (분포 테스트)
- [ ] 스냅샷 생성 성능 (시간 측정)
- [ ] 메모리 누수 (deque maxlen 동작)
- [ ] WebSocket 전송 (E2E 테스트)

