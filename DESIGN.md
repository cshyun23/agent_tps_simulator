# 설계 문서 (Design Specification)

## 1. NodeMonitor 패널 - 노드별 실시간 모니터링

### 1.1 개요
- **목적**: 시뮬레이션 실행 중 각 노드의 실시간 성능 지표를 시각화
- **위치**: AgentPage 우측 패널 (flex: 0.75, minWidth: 260px)
- **표시 조건**: 시뮬레이션이 running 상태일 때 실시간 업데이트, idle 상태에서는 안내 메시지

---

## 1.2 NodeCard (개별 노드 카드) 사양

### 레이아웃
- **종횡비**: 2:1 (가로:세로) - `aspectRatio: '2 / 1'`
- **경계선**: 좌측 3px 타입별 색상 + 1px 테두리
- **배경색**: 
  - 일반: 투명
  - Bottleneck: `rgba(239,68,68,0.08)` (빨강 반투명)

### 1.2.1 헤더 섹션 (Node Identity)
상단 고정 높이, 하단 보더 구분

| 항목 | 내용 | 설명 |
|------|------|------|
| 아이콘 | 타입별 이모지 | 시각적 타입 표현 |
| 노드명 | 라벨 또는 ID | 사용자 지정 라벨, 없으면 node_id |
| 타입 | LLM / Tool / Conditional / Parallel / Start / End | 소형 텍스트, 회색 |
| BOTTLENECK 배지 | "BOTTLENECK" (빨강 배경) | bottleneck_node_id 일 때만 표시 |

**타입별 설정**:
```
llm         → 보라(#a855f7) + 🧠 + "LLM"
tool        → 파랑(#3b82f6) + 🔧 + "Tool"
conditional → 노랑(#f59e0b) + 🔀 + "Conditional"
parallel    → 초록(#22c55e) + ⚡ + "Parallel"
start       → 회색(#94a3b8) + ▶ + "Start"
end         → 어두운회색(#64748b) + ⏹ + "End"
```

### 1.2.2 메트릭 섹션 (4컬럼 그리드)

#### 컬럼 1: 큐 (Queue)
- **라벨**: "큐"
- **게이지 바**: 
  - 높이: 6px
  - 색상 (비율에 따라 동적):
    - 0~40%: 초록(#22c55e)
    - 40~70%: 노랑(#f59e0b)
    - 70~100%: 빨강(#ef4444)
  - 기준: `queue_depth / maxQueueDepth` (전체 노드 중 최대값)
- **수치**: `queue_depth` (개)
- **부가**: "활성: {active_requests}" (소형)

#### 컬럼 2: 대기 (Wait Time) ⏱️
- **라벨**: "대기 ⏱️"
- **수치**: `avg_wait_ms` (ms, 소수 0자리)
- **설명**: "도착 → 시작" (소형, 회색)
- **의미**: 요청이 큐에서 대기한 시간 (도착 시점 ~ 처리 시작 시점)

#### 컬럼 3: 처리 (Process Time) ⚙️
- **라벨**: "처리 ⚙️"
- **수치**: `avg_process_ms` (ms, 소수 0자리)
- **설명**: "시작 → 완료" (소형, 회색)
- **의미**: 요청을 실제로 처리한 시간 (처리 시작 ~ 완료)

#### 컬럼 4: 처리량 (Throughput)
- **라벨**: "처리량"
- **수치**: `tps` (TPS, 소수 1자리) - 초록색(#22c55e)
- **재시도**: `retry_count > 0` 일 때만 표시
  - 형식: "🔄 {retry_count}회" (황색 배경, 소형)

---

## 1.3 NodeMonitor 패널 구조

### 헤더
- **제목**: "노드 모니터링"
- **인디케이터**: 
  - Pulse dot (8x8px, 초록)
  - 애니메이션: `pulse` keyframe (1.5s 주기)
  - 표시: `simStatus === 'running'` 일 때만

### 콘텐츠 영역
- **스크롤**: overflow-y auto, 수직 스크롤만 허용
- **정렬**: 플로우 정의 순서대로 정렬 (시각 안정성)

### 빈 상태 메시지
- **Idle 상태**: "시뮬레이션을 시작하면\n노드 상태가 표시됩니다"
- **로딩 상태**: "노드 데이터를 수신 중..."

---

## 1.4 데이터 소스

### 백엔드 (engine/metrics.py)
```python
class NodeMetrics:
    queue_depth: int           # 현재 큐에 있는 요청 수
    active_requests: int       # 현재 처리 중인 요청 수
    avg_wait_ms: float         # 평균 큐 대기 시간 (ms)
    avg_process_ms: float      # 평균 처리 시간 (ms)
    tps: float                 # 초당 처리 요청 수
    retry_count: int           # 재시도 누적 횟수
```

### 프론트엔드 (store/index.ts - useSimStore)
```typescript
snapshots: FlowMetricSnapshot[]     // 최신 스냅샷부터 순서대로
status: 'idle' | 'running'          // 시뮬레이션 상태
```

### WebSocket 전송 주기
- playback_speed 1x: 500ms
- playback_speed 2x: 250ms
- playback_speed 5x: 100ms
- playback_speed 10x: 50ms

---

## 1.5 핵심 계산 로직

### Bottleneck 식별
- **기준**: 모든 노드 중 `avg_wait_ms` 최댓값을 가진 노드
- **의미**: 가장 큐에서 대기가 오래 걸리는 노드 = 가장 혼잡한 노드 = 병목

### Queue 색상 결정
```python
def getQueueColor(ratio: number): string {
  if (ratio < 0.4) return '#22c55e'  // 초록
  if (ratio < 0.7) return '#f59e0b'  // 노랑
  return '#ef4444'                   // 빨강
}
```

---

## 1.6 구현 파일 목록

| 파일 | 목적 |
|------|------|
| frontend/src/pages/AgentPage.tsx | 3컬럼 레이아웃 제공 (FlowEditor \| SimPanel \| NodeMonitor) |
| frontend/src/components/NodeMonitor/index.tsx | NodeMonitor 패널 컴포넌트 |
| frontend/src/components/NodeMonitor/NodeCard.tsx | 개별 노드 카드 (2:1 종횡비) |
| frontend/src/index.css | pulse keyframe 애니메이션 |
| backend/engine/metrics.py | 메트릭 집계 로직 |
| backend/engine/simulator.py | 각 노드별 avg_wait_ms 계산 |

---

## 2. 향후 확장 계획 (예정)

- [ ] P95/P99 레이턴시 표시 옵션
- [ ] 개별 노드 상세 그래프 (시계열)
- [ ] 노드별 에러율 표시
- [ ] Export 메트릭 (CSV/JSON)

