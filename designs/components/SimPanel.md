# SimPanel (시뮬레이션 패널) 설계

## 1. 개요

### 목적
시뮬레이션의 제어(시작/일시정지/종료), 파라미터 설정(도착 패턴, 속도), 및 실시간 결과 시각화(TPS, E2E 레이턴시 그래프)를 담당하는 통합 제어 패널입니다.

### 범위
- 시뮬레이션 설정 (도착 패턴, 플레이백 속도, 기간)
- 시뮬레이션 제어 (시작, 일시정지, 종료)
- 실시간 그래프 (TPS 추이, 레이턴시 분포)
- 결과 요약 (총 처리/실패, 평균 레이턴시)

### 핵심 개념
- **제어-시각화 분리**: 상단 제어 영역 vs 하단 그래프 영역
- **실시간 업데이트**: WebSocket 메트릭 수신 → 즉시 그래프 업데이트
- **컴팩트 설정**: 시뮬레이션 파라미터를 폼으로 인라인 표시

---

## 2. 상세 설계

### 2.1 전체 레이아웃

**패널 위치** (AgentPage 중앙 상단)
```
┌─────────────────────────────────┐
│ Sidebar │ FlowEditor │ SimPanel  │ NodeMonitor
│                      │(flex:0.75)│
└─────────────────────────────────┘
```

**SimPanel 내부 구조**
```
┌─ 헤더 ─────────────────────────┐ (높이: ~40px, 고정)
│ 시뮬레이션 설정 & 제어 버튼     │
├─────────────────────────────────┤
│                                 │
│ 설정 영역                       │ (높이: ~100px, 고정)
│ ┌─ 도착 패턴 ────┐             │
│ │ ○ Ramp-up    │             │
│ │ ○ Wave       │             │
│ └────────────────┘             │
│                                 │
│ ┌─────────────────────────┐    │
│ │ 플레이백 속도: [●━━━━━] │    │
│ │ 기간: [●━━━━━━━━━━━━] │    │
│ └─────────────────────────┘    │
│                                 │
├─ [시작] [일시정지] [초기화]     │ (높이: ~30px, 고정)
├─────────────────────────────────┤
│                                 │
│ 그래프 영역                     │ (flex: 1, 스크롤)
│ ┌─────────────────────────┐    │
│ │ TPS 추이                │    │
│ │ [그래프 영역]           │    │
│ └─────────────────────────┘    │
│                                 │
│ ┌─────────────────────────┐    │
│ │ 처리량 요약              │    │
│ │ 총 처리: 1234개         │    │
│ │ 실패: 5개               │    │
│ │ 평균 E2E: 234ms         │    │
│ └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

### 2.2 제어 영역 (Control Panel)

#### 헤더
```
┌──────────────────────────────────┐
│ ⏱️ 시뮬레이션 설정 & 제어        │
└──────────────────────────────────┘
```

#### 도착 패턴 선택 (Arrival Pattern)
**구성**: Radio Button Group
```
○ Ramp-up    ● Wave      [선택된 패턴의 파라미터 표시]
```

**Ramp-up 패턴 선택 시**:
```
┌─ Ramp-up 설정 ──────────────────┐
│ 초기 사용자: [0    ▶━━] (명)    │
│ 피크 사용자: [100  ▶━━] (명)    │
│ 램프 기간: [60    ▶━━] (초)    │
│ 홀드 기간: [120   ▶━━] (초)    │
│ ○ Linear  ● Smooth (S-curve)  │
└────────────────────────────────┘
```

**Wave 패턴 선택 시**:
```
┌─ Wave 설정 ──────────────────────┐
│ 최소 사용자: [10   ▶━━] (명)    │
│ 최대 사용자: [100  ▶━━] (명)    │
│ 주기: [30      ▶━━] (초)      │
│ 파형 수: [1        ▶━━] (회)    │
│ 위상 오프셋: [0    ▶━━] (초)    │
└────────────────────────────────┘
```

**입력 요소 스타일**:
- Slider (range input): width: 100%, 인라인 라벨
- Number input: width: 60px, 우측 단위 텍스트
- Radio/Checkbox: 커스텀 스타일

#### 시뮬레이션 파라미터 (Simulation Config)
```
┌─ 기본 설정 ──────────────────────┐
│ 시뮬레이션 기간: [300  ▶━━] (초)│
│ 플레이백 속도: [2x   ▼] (1x/2x/5x/10x) │
│ P95 표시: ☑  P99 표시: ☐      │
└────────────────────────────────┘
```

#### 제어 버튼
```
[시작] [일시정지/재개] [초기화]
```

**각 버튼 상태**:
- **시작**: Idle 상태에서만 활성
  - 클릭: 현재 설정으로 시뮬레이션 시작
  - 백엔드로 POST /simulations/start 전송
  
- **일시정지**: Running 상태에서만 활성
  - 클릭: 시뮬레이션 일시정지
  - 재개: 일시정지 상태에서 다시 클릭 시 재개
  - 백엔드로 POST /simulations/pause 전송
  
- **초기화**: Idle/Paused 상태에서 활성
  - 클릭: UI 상태 초기화, 그래프 삭제
  - 데이터 상태는 유지 (설정값)

### 2.3 그래프 영역 (Metrics Visualization)

#### LineChart 라이브러리
- **라이브러리**: Recharts (react-recharts)
- **높이**: 350px (이전 200px에서 증가)
- **배경**: var(--surface)
- **테두리**: 1px solid var(--border)
- **마진**: bottom 16px

#### TPS 추이 그래프
```
그래프 제목: "처리량 추이 (TPS)"

Y축: TPS (초/초당 요청 수) - 자동 스케일
X축: 시뮬레이션 시간 (초) - 0 ~ duration_sec

선 1: flow_tps (전체 처리량) - 파랑색 (#3b82f6)
선 2: avg_node_tps (평균 노드 처리량) - 초록색 (#22c55e)

데이터 포인트: 500ms(speed 1x) 마다 1개
```

**데이터 구조**:
```typescript
interface TpsDataPoint {
  time: number      // 시뮬레이션 시간(초)
  flow_tps: number
  avg_node_tps: number
}
```

#### 처리량 요약 박스
```
┌─────────────────────────────────┐
│ 📊 처리량 요약                   │
├─────────────────────────────────┤
│ 총 처리: 1,234개                │
│ 총 실패: 5개                    │
│ 전체 TPS: 12.4 req/s            │
│ 평균 E2E: 234ms                 │
│ (P95: 456ms, P99: 678ms)        │
└─────────────────────────────────┘
```

**요소별 상세**:
- 총 처리: metric.total_completed
- 총 실패: metric.total_failed
- 전체 TPS: metric.flow_tps (마지막 스냅샷)
- 평균 E2E: metric.avg_e2e_ms
- P95/P99: 설정에서 show_p95/show_p99가 true일 때만 표시

---

## 3. 데이터 모델

### 3.1 프론트엔드 (TypeScript)

**SimPanelProps**
```typescript
interface SimPanelProps {
  flow: Flow
  startNode: string   // 시뮬레이션 시작 노드 ID
  endNodes: string[]  // 종료 노드 ID 배열
}
```

**시뮬레이션 설정 (로컬 상태)**
```typescript
interface LocalSimConfig {
  // 도착 패턴
  arrivalPattern: {
    type: 'ramp_up' | 'wave'
    // Ramp-up
    start_users?: number
    peak_users?: number
    ramp_duration_sec?: number
    hold_duration_sec?: number
    ramp_shape?: 'linear' | 'smooth'
    // Wave
    min_users?: number
    max_users?: number
    period_sec?: number
    wave_count?: number
    phase_offset_sec?: number
  }
  
  // 시뮬레이션 파라미터
  duration_sec: number
  playback_speed: 1 | 2 | 5 | 10
  show_p95: boolean
  show_p99: boolean
  max_hops_per_request: number
}
```

**TPS 그래프 데이터**
```typescript
interface TpsMetric {
  sim_time_sec: number
  flow_tps: number
  avg_node_tps: number  // 모든 노드 TPS의 평균
}

// 저장소
tpsMetrics: TpsMetric[]
```

### 3.2 백엔드 (Python)

**SimulationConfig (models/simulation.py)**
```python
class RampUpPattern(BaseModel):
    type: Literal["ramp_up"] = "ramp_up"
    start_users: int = 0
    peak_users: int
    ramp_duration_sec: int
    hold_duration_sec: int = 0
    ramp_shape: Literal["linear", "smooth"] = "linear"

class WavePattern(BaseModel):
    type: Literal["wave"] = "wave"
    min_users: int
    peak_users: int
    period_sec: int
    wave_count: int = 1
    phase_offset_sec: int = 0

class SimulationConfig(BaseModel):
    flow_id: str
    start_node_id: str
    end_node_ids: list[str]
    duration_sec: int
    playback_speed: Literal[1, 2, 5, 10] = 1
    max_hops_per_request: int = 10
    arrival_pattern: RampUpPattern | WavePattern
    show_p95: bool = True
    show_p99: bool = False
```

---

## 4. 구현 체크리스트

### 파일 생성/수정

| 파일 | 작업 | 라인 | 설명 |
|------|------|------|------|
| `frontend/src/components/SimPanel/index.tsx` | 수정 | ~400 | 도착 패턴 UI + 그래프 높이 조정 |
| `frontend/src/components/SimPanel/ControlPanel.tsx` | 신규 | ~250 | 제어 UI 컴포넌트 (분리) |
| `frontend/src/api/client.ts` | 수정 | +10 | 시뮬레이션 시작/정지 API |

### SimPanel/index.tsx 구현 항목
- [ ] 로컬 상태 (arrivalPattern, duration, playback_speed 등)
- [ ] 도착 패턴 Radio Button (Ramp-up vs Wave)
- [ ] Ramp-up 파라미터 입력 폼
  - [ ] Slider: start_users (0~100)
  - [ ] Slider: peak_users (1~500)
  - [ ] Slider: ramp_duration_sec (1~300)
  - [ ] Slider: hold_duration_sec (0~600)
  - [ ] Radio: ramp_shape (Linear / Smooth)
- [ ] Wave 파라미터 입력 폼
  - [ ] Slider: min_users
  - [ ] Slider: peak_users
  - [ ] Slider: period_sec
  - [ ] Slider: wave_count
  - [ ] Slider: phase_offset_sec
- [ ] 기본 설정 폼
  - [ ] Slider: duration_sec (10~3600)
  - [ ] Select: playback_speed (1x, 2x, 5x, 10x)
  - [ ] Checkbox: show_p95, show_p99
- [ ] 제어 버튼 (시작, 일시정지, 초기화)
  - [ ] 상태별 버튼 활성/비활성화
  - [ ] API 호출 (POST /simulations/start, /pause, /reset)
- [ ] LineChart (Recharts) 렌더링
  - [ ] TPS 추이 그래프 (높이 350px)
  - [ ] 데이터 업데이트 로직 (snapshot 수신 시)
- [ ] 처리량 요약 박스 렌더링

### ControlPanel.tsx (선택 사항 - 분리)
- [ ] 제어 UI를 별도 컴포넌트로 분리 (옵션)
- [ ] Props: arrivalPattern, 모든 setter 함수들
- [ ] 반환: JSX

### API 클라이언트 추가
```typescript
// api/client.ts
export const api = {
  // ...
  simulations: {
    start: (config: SimulationConfig) => 
      fetch('/api/simulations/start', { 
        method: 'POST', 
        body: JSON.stringify(config) 
      }).then(r => r.json()),
    
    pause: () => 
      fetch('/api/simulations/pause', { 
        method: 'POST' 
      }).then(r => r.json()),
    
    resume: () => 
      fetch('/api/simulations/resume', { 
        method: 'POST' 
      }).then(r => r.json()),
  }
}
```

---

## 5. 스타일 정보

### 색상 팔레트
- TPS 라인 (flow): var(--primary) #3b82f6
- 평균 노드 라인: var(--success) #22c55e
- 배경: var(--surface) #1e293b
- 테두리: var(--border) #334155

### 타이포그래피
- 제목: fontSize 12px, fontWeight 600
- 라벨: fontSize 11px, fontWeight 500
- 수치: fontSize 14px, fontWeight 700
- 부가: fontSize 10px, color var(--text2)

### 레이아웃 간격
- 섹션 마진: 12px
- 요소 간 갭: 8px
- 패딩: 12px

---

## 6. 참고 사항

- **WebSocket 연결**: SimPanel은 useSimStore의 snapshots를 구독
- **그래프 성능**: 데이터 포인트가 많을 경우 (1000+) 리샘플링 고려
- **폼 유효성**: 시작 버튼 클릭 전 모든 필드 검증
- **에러 처리**: API 호출 실패 시 useToastStore로 에러 메시지 표시

