# NodeMonitor 패널 설계

## 1. 개요

### 목적
시뮬레이션 실행 중 각 노드의 실시간 성능 지표(큐 깊이, 대기시간, 처리시간, TPS)를 시각화하여 병목 노드 식별과 흐름 상태 파악을 지원합니다.

### 범위
- 시뮬레이션 실행 중 1회/500ms(speed 1x) 주기로 메트릭 업데이트
- 모든 노드를 동시에 모니터링
- 병목 노드 자동 감지 및 강조 표시
- Idle 상태에서는 안내 메시지 표시

### 핵심 개념
- **실시간성**: WebSocket을 통해 서버의 메트릭을 클라이언트에 Push
- **상대적 시각화**: 게이지 바의 색상은 전체 노드 중 최댓값 대비 비율로 결정
- **단순 명확성**: 각 지표의 의미를 1줄의 설명 텍스트로 표현

---

## 2. 상세 설계

### 2.1 레이아웃 구조

**패널 위치 및 크기** (AgentPage에서)
```
┌─────────────────────────────────────────┐
│ Sidebar(200px) │ FlowEditor(flex:2) │ SimPanel(flex:0.75) │ NodeMonitor(flex:0.75, min:260px)
└─────────────────────────────────────────┘
```

**NodeMonitor 내부**
```
┌─ Header ──────────────────────┐ (flexShrink:0)
│ [●] 노드 모니터링            │ (높이: ~40px)
├────────────────────────────────┤
│                                │
│ ┌─ NodeCard ──────────────────┐ (aspectRatio: 2/1)
│ │ [Icon] 노드명 [BOTTLENECK] │
│ │ 큐  │ 대기 │ 처리 │ 처리량  │
│ └────────────────────────────┘
│                                │
│ ┌─ NodeCard ──────────────────┐
│ │ ...                          │
│ └────────────────────────────┘
│                                │
└─ (overflowY: auto) ───────────┘
```

**노드 정렬 순서**
- 플로우 정의에서의 노드 순서대로 렌더링
- 이유: 사용자가 플로우 에디터에서 본 순서와 일치하여 직관적 이해 향상

### 2.2 NodeCard 상세 설계

#### 외형
- **종횡비**: 2:1 (width:height)
- **높이**: 패널 너비에 따라 자동 계산
  - 예: 패널 너비 270px → 카드 높이 135px
- **경계선**: 
  - 좌측 3px 세로줄 (타입별 색상)
  - 전체 1px 테두리 (회색)
- **배경색**: 
  - 일반: 투명 (background: 'transparent')
  - Bottleneck: 얇은 빨강 반투명 (background: 'rgba(239,68,68,0.08)')
- **패딩**: 10px
- **글꼴**: 기본 12px, 섹션별로 9-13px

#### 헤더 영역 (좌측 상단)
```
┌─────────────────────────────────────┐
│ 🧠 LLM_Node_1    [BOTTLENECK]       │
│    LLM                              │
└─────────────────────────────────────┘
```

**구성 요소**:
1. **아이콘** (fontSize: 16px)
   - 타입별로 고정된 이모지 사용
2. **노드명** (fontWeight: 700, fontSize: 12px)
   - 우선순위: config.label > node.id > metric.node_id
3. **타입 라벨** (fontSize: 9px, color: var(--text2))
   - 각 타입별 영문 라벨 (위 "TYPE_CONFIG" 참조)
4. **BOTTLENECK 배지** (조건부)
   - metric.node_id === snapshot.bottleneck_node_id일 때만 표시
   - 스타일: 빨강 배경(#ef4444), 흰글자, 패딩 2px 6px, borderRadius 2px

#### 메트릭 영역 (하단, 4열 그리드)

**구조**
```
┌─ Col1 ──┬─ Col2 ──┬─ Col3 ──┬─ Col4 ──┐
│  큐     │  대기   │  처리   │  처리량 │
│  게이지 │ 45ms   │ 230ms  │ 12.4TPS│
│  3개    │ 도착→  │ 시작→  │ 🔄 2회 │
│ 활성:2  │ 시작   │ 완료   │        │
└─────────┴─────────┴─────────┴────────┘
```

**각 컬럼 상세**:

**컬럼 1: 큐 (Queue)**
- 라벨: "큐" (fontSize: 9px, fontWeight: 500, color: var(--text2))
- 게이지 바
  ```
  높이: 6px
  배경: var(--surface)
  테두리: 1px solid var(--border)
  borderRadius: 2px
  
  내부 fill:
  - 색상: getQueueColor(ratio)로 결정
  - width: min(ratio * 100, 100)%
  - transition: 'width 200ms, background-color 200ms'
  ```
  
  색상 로직:
  ```typescript
  function getQueueColor(ratio: number): string {
    if (ratio < 0.4) return '#22c55e'    // 초록
    if (ratio < 0.7) return '#f59e0b'    // 노랑
    return '#ef4444'                     // 빨강
  }
  
  ratio = queue_depth / maxQueueDepth
  maxQueueDepth = Math.max(1, ...metrics.map(m => m.queue_depth))
  ```
- 수치: `{metric.queue_depth}개` (fontSize: 11px, fontWeight: 600)
- 부가 정보: `활성: {metric.active_requests}` (fontSize: 8px, color: var(--text2), marginTop: 1px)

**컬럼 2: 대기 (Wait Time) ⏱️**
- 라벨: "대기 ⏱️" (fontSize: 9px, fontWeight: 500)
- 수치: `{metric.avg_wait_ms.toFixed(0)}ms` (fontSize: 13px, fontWeight: 700, color: var(--text))
- 설명: "도착 → 시작" (fontSize: 8px, color: var(--text2))
- **의미**: 
  - 측정: 요청이 노드 큐에 도착한 시점 → 실제 처리가 시작된 시점
  - 계산: `wait_ms = dequeue_time - enqueue_time`
  - 반영: 큐 혼잡도 측정, 병목 노드 식별의 주요 지표

**컬럼 3: 처리 (Process Time) ⚙️**
- 라벨: "처리 ⚙️" (fontSize: 9px, fontWeight: 500)
- 수치: `{metric.avg_process_ms.toFixed(0)}ms` (fontSize: 13px, fontWeight: 700, color: var(--text))
- 설명: "시작 → 완료" (fontSize: 8px, color: var(--text2))
- **의미**:
  - 측정: 처리 시작 → 처리 완료
  - 계산: `process_ms = complete_time - dequeue_time`
  - 반영: 노드 자체의 처리 능력 측정, 알고리즘/모델 성능 지표

**컬럼 4: 처리량 (Throughput)**
- 라벨: "처리량" (fontSize: 9px, fontWeight: 500)
- 수치: `{metric.tps.toFixed(1)} TPS` (fontSize: 13px, fontWeight: 700, color: var(--success)=#22c55e)
- 조건부 재시도: `metric.retry_count > 0` 일 때만 표시
  ```
  형식: "🔄 {metric.retry_count}회"
  스타일: fontSize 8px, color var(--warning)=#f59e0b, fontWeight 600
  ```

---

## 3. 데이터 모델

### 3.1 프론트엔드 (TypeScript)

**FlowNode (props에서 사용)**
```typescript
interface FlowNode {
  id: string
  type: string  // 'llm' | 'tool' | 'conditional' | 'parallel' | 'start' | 'end'
  config?: {
    label?: string
    // ... other config
  }
}
```

**NodeMetricSnapshot (백엔드에서 WebSocket으로 전송)**
```typescript
interface NodeMetricSnapshot {
  node_id: string
  queue_depth: int        // 현재 큐 깊이
  active_requests: int    // 현재 처리 중인 요청 수
  avg_wait_ms: float      // 평균 큐 대기 시간
  avg_process_ms: float   // 평균 처리 시간
  tps: float              // 초당 처리 완료 요청 수
  p95_latency_ms?: float
  p99_latency_ms?: float
  retry_count: int        // 누적 재시도 횟수
}
```

**FlowMetricSnapshot (전체 스냅샷)**
```typescript
interface FlowMetricSnapshot {
  sim_time_sec: float
  wall_time_sec: float
  total_completed: int
  total_failed: int
  nodes: NodeMetricSnapshot[]
  bottleneck_node_id: string | null
  flow_tps: float
}
```

**useSimStore의 상태**
```typescript
interface SimState {
  snapshots: FlowMetricSnapshot[]  // 최신 순서로 저장
  status: 'idle' | 'running'       // 시뮬레이션 상태
  ws: WebSocket | null
}
```

### 3.2 노드 타입 설정

```typescript
const NODE_TYPE_CONFIG: Record<string, {
  color: string
  icon: string
  label: string
}> = {
  llm: {
    color: '#a855f7',      // 보라
    icon: '🧠',
    label: 'LLM'
  },
  tool: {
    color: '#3b82f6',      // 파랑 (var(--primary))
    icon: '🔧',
    label: 'Tool'
  },
  conditional: {
    color: '#f59e0b',      // 노랑 (var(--warning))
    icon: '🔀',
    label: 'Conditional'
  },
  parallel: {
    color: '#22c55e',      // 초록 (var(--success))
    icon: '⚡',
    label: 'Parallel'
  },
  start: {
    color: '#94a3b8',      // 회색
    icon: '▶',
    label: 'Start'
  },
  end: {
    color: '#64748b',      // 어두운 회색
    icon: '⏹',
    label: 'End'
  },
  // 기본값 (알 수 없는 타입)
  unknown: {
    color: '#94a3b8',
    icon: '◆',
    label: 'Unknown'
  }
}
```

---

## 4. 구현 체크리스트

### 파일 생성/수정

| 파일 | 작업 | 라인 | 설명 |
|------|------|------|------|
| `frontend/src/components/NodeMonitor/index.tsx` | 신규 | ~120 | NodeMonitor 패널 컴포넌트 |
| `frontend/src/components/NodeMonitor/NodeCard.tsx` | 신규 | ~190 | 개별 노드 카드 컴포넌트 |
| `frontend/src/pages/AgentPage.tsx` | 수정 | +10~15 | NodeMonitor 임포트 및 레이아웃 추가 |
| `frontend/src/index.css` | 수정 | +5 | pulse keyframe 애니메이션 추가 |

### NodeMonitor/index.tsx 구현 항목
- [ ] FlowNode 인터페이스 정의
- [ ] NodeMonitorProps 인터페이스 정의
- [ ] useSimStore 훅 사용 (snapshots, status)
- [ ] useMemo로 nodeMap 생성 (node_id → FlowNode 매핑)
- [ ] useMemo로 nodeMetrics 정렬 (플로우 정의 순서)
- [ ] useMemo로 maxQueueDepth 계산
- [ ] bottleneck_node_id 추출
- [ ] 헤더 렌더링 (제목 + pulse dot)
- [ ] 카드 그리드 렌더링 또는 Empty 메시지

### NodeCard.tsx 구현 항목
- [ ] NODE_TYPE_CONFIG 상수 정의
- [ ] getNodeTypeConfig() 함수 구현
- [ ] getQueueColor() 함수 구현
- [ ] 헤더 섹션 렌더링 (아이콘 + 노드명 + 타입 + BOTTLENECK)
- [ ] 4열 그리드 렌더링
  - [ ] 큐 컬럼 (게이지 + 수치 + 활성)
  - [ ] 대기 컬럼 (수치 + 설명)
  - [ ] 처리 컬럼 (수치 + 설명)
  - [ ] 처리량 컬럼 (수치 + 재시도)
- [ ] Bottleneck 스타일 적용 (배경색 + borderLeft 색상 오버라이드)

### CSS 추가 항목
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

### AgentPage.tsx 수정
- [ ] NodeMonitor 임포트 추가
- [ ] 3컬럼 레이아웃 적용 (FlowEditor flex:2 → 1.5 또는 유지)
- [ ] NodeMonitor 추가 (flex: 0.75, minWidth: 260px)
- [ ] borderLeft 스타일 적용

---

## 5. 테스트 항목

- [ ] TypeScript 컴파일 성공 (npx tsc --noEmit)
- [ ] Idle 상태에서 안내 메시지 표시
- [ ] 시뮬레이션 시작 후 카드 렌더링
- [ ] 게이지 바 색상 변화 (초록 → 노랑 → 빨강)
- [ ] Bottleneck 노드 빨간색 강조
- [ ] 모든 지표 실시간 업데이트
- [ ] 노드 순서 일관성 (플로우 정의 순서 유지)

