# Agent TPS Simulator

LLM 기반 에이전트 파이프라인의 처리량(TPS) 병목을 시각적으로 설계하고 시뮬레이션하는 도구.

---

## 목표

- **에이전트 플로우 설계**: LangGraph 스타일의 노드-엣지 그래프로 에이전트 파이프라인을 시각적으로 구성
- **가상 LLM 서버 관리**: 온프레미스 vLLM 추론 서버를 가상으로 정의하고 성능 파라미터를 설정
- **TPS 병목 시뮬레이션**: 동시 사용자 수 기반으로 각 노드의 큐 대기, 처리 속도, 병목 지점을 실시간 시각화

---

## 시스템 구성

```
┌──────────────────────────────────────────────────────┐
│                      Frontend                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ [Agent Flow]  [LLM Hub]  [비교 뷰]               │  │  ← 상단 화면 전환 버튼
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  화면 1: Agent Flow + Simulation                       │
│  ┌──────────┬──────────────────────┬───────────────┐  │
│  │ Flow     │  Agent Flow Editor   │  Simulation   │  │
│  │ 목록     │       (60%)          │  Panel (40%)  │  │
│  └──────────┴──────────────────────┴───────────────┘  │
│                                                       │
│  화면 2: LLM Hub (가상 서버 관리)                       │
│  화면 3: 비교 뷰 (시뮬레이션 결과 비교)                  │
└──────────────────────────┬────────────────────────────┘
                           │ WebSocket (실시간 메트릭)
┌──────────────────────────▼────────────────────────────┐
│                  Backend (Python)                      │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────┐  │
│  │  Simulation  │   │  LLM Hub     │   │  History  │  │
│  │   Engine     │   │  Store       │   │  Store    │  │
│  │  (DES 기반)  │   │ (Config CRUD)│   │  (결과저장)│  │
│  └──────────────┘   └──────────────┘   └───────────┘  │
└───────────────────────────────────────────────────────┘
```

### 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React, React Flow (xyflow), Recharts |
| Backend | Python, FastAPI |
| 통신 | REST API + WebSocket |
| 상태 저장 | JSON 파일 (로컬, backend/data/) |
| 가상환경 | Python venv |

---

## 화면 1: Agent Flow & Simulation

### 레이아웃

```
┌──────────────────────────────────────────────────────┐
│  [Agent Flow]  [LLM Hub]  [비교 뷰]                   │
├──────────┬────────────────────────┬───────────────────┤
│ Flow 목록 │   Agent Flow Editor    │ Simulation Panel  │
│          │        (60%)           │      (40%)        │
│ + 새 플로우│                      │                   │
│ ──────── │                        │                   │
│ ▶ RAG    │   노드-엣지 편집 영역   │  실시간 메트릭    │
│   ReAct  │                        │  그래프           │
│   테스트  │                        │                   │
│          │                        │ ──────────────── │
│          │                        │  종료 후 요약     │
└──────────┴────────────────────────┴───────────────────┘
```

### 1-1. 플로우 목록 사이드바

챗봇 세션 목록과 동일한 UX로 플로우를 관리한다.

- 플로우 제목 저장 (더블클릭으로 인라인 편집)
- 우클릭 컨텍스트 메뉴: 삭제 / 복제
- `+ 새 플로우` 버튼 클릭 시 템플릿 선택 모달 표시

#### 새 플로우 템플릿

```
┌─────────────────────────────┐
│  플로우 템플릿 선택           │
│                             │
│  ○ 빈 플로우                 │
│  ○ 단순 RAG                  │
│  ○ ReAct 루프                │
│  ○ 병렬 Tool 호출             │
│                             │
│  [취소]           [생성]     │
└─────────────────────────────┘
```

---

### 1-2. 플로우 에디터

노드와 엣지로 에이전트 파이프라인을 정의한다. 편집 결과는 백엔드 JSON으로 저장되며, UI는 React Flow로 렌더링한다.

#### 노드 종류

| 타입 | 설명 |
|------|------|
| `Start` | 플로우 진입점. 사용자 요청이 들어오는 노드 |
| `LLM` | LLM 추론을 수행하는 노드 (LLM Hub에서 선택 또는 즉시 생성) |
| `Tool / MCP` | 외부 도구 또는 MCP 서버를 호출하는 노드 |
| `Conditional` | 조건에 따라 다음 노드를 분기하는 노드 |
| `Parallel` | 여러 노드를 동시에 실행하는 노드 (fan-out / fan-in) |
| `End` | 플로우 종료 노드 |

#### 노드 공통 설정값

```
- 노드 이름 (string)
- 노드 타입 (Start / LLM / Tool / Conditional / Parallel / End)
- 평균 입력 토큰 수 (int, LLM 노드) ← 정규분포 샘플링 적용 (std = avg × 0.2)
- 평균 출력 토큰 수 (int, LLM 노드) ← 정규분포 샘플링 적용 (std = avg × 0.2)
- LLM 미연결 시 처리 시간 ms (int, LLM 노드)
- MCP / Tool 처리 시간 ms (int, Tool 노드)
- 연결 LLM 서버 (LLM Hub에서 선택, 선택 안 해도 됨)
- 최대 동시 처리 수 (concurrency, int)
```

> 노드 클릭 시 LangGraph 스타일 팝업으로 설정값 편집 (플로우 위에 플로팅)

#### Conditional 노드 설정

Conditional 노드는 하나의 입력에 대해 여러 출력 엣지를 가진다.
각 출력 엣지에는 **분기 확률(%)**을 설정하며, 전체 합은 100%여야 한다.

```
Conditional 노드 설정값:
- 분기 목록 (branches):
    - branch_name: string
    - target_node: 연결된 다음 노드 ID
    - probability: 0~100 (%) ← 시뮬레이션 시 이 비율로 요청이 분배됨
- 실패율 (failure_rate): 0~100 (%)
    - 실패 시 재시도 로직 적용 여부 (bool)
    - 최대 재시도 횟수 (max_retries, int) ← 필수 입력
    - 재시도 대기 시간 ms (retry_delay_ms, int)
```

예시:
```
[LLM 노드] → [Conditional]
                 ├── "성공" (85%) → [다음 처리 노드]
                 ├── "재시도 필요" (10%) → [LLM 노드] (루프백)
                 └── "실패" (5%) → [End (error)]
```

#### Parallel 노드 설정

fan-out으로 여러 노드에 동시 요청을 보내고, 모든 브랜치 완료 시 fan-in으로 합류한다.

```
Parallel 노드 설정값:
- fan-out 브랜치 목록: 연결된 노드들 (UI에서 화살표로 연결)
- fan-in 노드: 모든 브랜치가 완료된 후 합류하는 노드
```

```
[LLM 노드] → [Parallel] ─┬─→ [Tool A] ─┐
                          └─→ [Tool B] ─┴─→ [집계 노드]
```

#### 루프 엣지

Conditional 노드에서 이전 노드로 연결하는 루프백 엣지는 **back edge**로 자동 감지된다.

- 일반 연결: `──────────►` (실선, 회색)
- 루프 연결: `- - - - - ↩` (점선, 주황색, 곡선 arc)
- 루프 엣지 감지 시 `max_loop_count` 필수 입력 (미입력 시 시뮬레이션 불가)

#### 편집 기능

- 노드 드래그 앤 드롭 배치
- 노드 간 엣지 연결 (단방향), Conditional/Parallel 노드는 다중 출력 엣지 지원
- 노드 클릭 시 플로팅 팝업에서 설정값 편집
- LLM 노드에서 LLM Hub 서버 선택 또는 인라인 생성
- 플로우 저장 / 불러오기 (UI 버튼 → 백엔드 REST API → JSON 파일)
- 플로우 JSON 다운로드 / 업로드 (파일 단위 내보내기/가져오기)

#### 단축키 및 컨텍스트 메뉴

| 단축키 | 동작 |
|--------|------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+C` | 선택 노드 복사 |
| `Ctrl+V` | 붙여넣기 |
| `Del` | 선택 노드 삭제 |

노드 우클릭 시 컨텍스트 메뉴:
```
┌─────────────────┐
│ 복사    Ctrl+C  │
│ 붙여넣기 Ctrl+V │
│ 삭제    Del     │
└─────────────────┘
```

#### 플로우 JSON 포맷

```json
{
  "flow_id": "uuid",
  "name": "My Agent Flow",
  "created_at": "2026-04-15T00:00:00Z",
  "updated_at": "2026-04-15T00:00:00Z",
  "nodes": [
    {
      "id": "node_1",
      "type": "start",
      "label": "시작",
      "position": { "x": 100, "y": 200 },
      "config": {}
    },
    {
      "id": "node_2",
      "type": "llm",
      "label": "질의 처리",
      "position": { "x": 300, "y": 200 },
      "config": {
        "llm_server_id": "server_uuid_or_null",
        "input_tokens": 512,
        "output_tokens": 256,
        "fallback_latency_ms": 1000,
        "concurrency": 4
      }
    },
    {
      "id": "node_3",
      "type": "conditional",
      "label": "결과 분기",
      "position": { "x": 500, "y": 200 },
      "config": {
        "failure_rate": 5,
        "max_retries": 2,
        "retry_delay_ms": 500,
        "branches": [
          { "branch_name": "성공",   "target_node": "node_4", "probability": 90 },
          { "branch_name": "재시도", "target_node": "node_2", "probability": 10 }
        ]
      }
    },
    {
      "id": "node_4",
      "type": "parallel",
      "label": "병렬 Tool 호출",
      "position": { "x": 700, "y": 200 },
      "config": {
        "fanout_nodes": ["node_5", "node_6"],
        "fanin_node": "node_7"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "node_1", "target": "node_2" },
    { "id": "e2", "source": "node_2", "target": "node_3" },
    { "id": "e3", "source": "node_3", "target": "node_4", "branch": "성공" },
    { "id": "e4", "source": "node_3", "target": "node_2", "branch": "재시도", "is_loop": true, "max_loop_count": 3 }
  ]
}
```

---

### 1-3. 시뮬레이션 설정

#### 기본 파라미터

```
- 시뮬레이션 시작 노드 선택 (Start 타입 노드 중 선택)
- 시뮬레이션 종료 노드 선택 (End 타입 노드 중 다중 선택 가능)
- 시뮬레이션 총 시간 (duration_sec): 초 단위
- 재생 속도: 1x / 2x / 5x / 10x
- 글로벌 최대 hop 수 (max_hops_per_request): 기본값 10
- 모니터링 메트릭 선택 (체크박스)
  ☑ 평균 latency
  ☑ P95 latency
  ☐ P99 latency
  ☑ TPS
  ☑ 큐 대기 수
  ☑ 활성 요청 수
  ☐ 재시도 횟수
```

#### 요청 도착 패턴 (Arrival Pattern)

사용자 요청이 시뮬레이션 시간 동안 어떻게 들어오는지를 정의한다.
두 가지 패턴 중 하나를 선택한다.

---

**① Ramp-up**

0에서 시작하여 peak까지 점진적으로 증가한 뒤, 정점을 일정 시간 유지한다.

```
users
  │         plateau (유지)
  │      ┌──────────────────
peak │     /
  │    /  ramp
  │   /
  │  /
  0──────────────────────── time
     ↑            ↑
  ramp_end    duration
```

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `start_users` | int | 시작 시점 사용자 수 (기본값 0) |
| `peak_users` | int | 최대 도달 사용자 수 |
| `ramp_duration_sec` | int | 0 → peak 도달까지 걸리는 시간 (초) |
| `hold_duration_sec` | int | peak 도달 후 유지 시간 (초, 0이면 즉시 종료) |
| `ramp_shape` | enum | `linear` (직선) / `smooth` (S-커브, ease-in-out) |

---

**② Wave**

사용자 수가 주기적으로 오르내리는 사인 파형 패턴. 실제 서비스의 시간대별 트래픽 변동을 모사한다.

```
users
  │    peak
  │   /\      /\      /\
  │  /  \    /  \    /  \
  │ /    \  /    \  /    \
  │/      \/      \/      \
  └────────────────────────── time
  min     ←period→
```

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `min_users` | int | 파형 최저점 사용자 수 |
| `peak_users` | int | 파형 최고점 사용자 수 |
| `period_sec` | int | 파형 한 주기 길이 (초) |
| `wave_count` | int | 총 파형 반복 횟수 (duration과 자동 계산) |
| `phase_offset_sec` | int | 시작 위상 오프셋 (0이면 min에서 시작) |

---

### 1-4. 시뮬레이션 엔진

DES (Discrete Event Simulation) 방식으로 동작한다. 이벤트 발생 시점으로만 시간을 도약하여 정확하고 빠른 시뮬레이션을 제공한다.

각 노드는 vLLM 스타일의 큐를 갖는 독립 처리 단위로 동작한다.

#### 노드별 처리 모델

```
요청 도착
   ↓
[입력 큐] ← 동시 처리 수 초과 시 대기
   ↓
[처리] ← 처리 시간 계산 (토큰 기반 or 고정 ms)
   ↓
Conditional 분기 (확률 기반 라우팅) / Parallel fan-out
   ↓
다음 노드로 전달 or 종료
```

#### 처리 시간 계산

- **LLM 노드 (LLM 서버 연결 시)**:
  ```
  prefill_wait_ms      = 이전 prefill 완료까지 대기 시간 (배치 큐 기반)
  ttft_ms              = prefill_wait_ms + ref_ttft_ms × (input_tokens / ref_input_tokens)
  decode_ms            = output_tokens × ref_tpop_ms
  total_latency_ms     = ttft_ms + decode_ms
  ```
  - 입력/출력 토큰 수는 설정값을 평균으로 std=avg×0.2 정규분포에서 샘플링
  - 큐 입장 조건: 현재 in-flight 요청의 KV cache 사용량 합계 < 가용 KV cache
  - KV cache는 요청이 decode 진행 중에 동적으로 증가하므로 실시간 여유분을 체크

- **동일 LLM 서버를 여러 노드가 공유하는 경우**:
  - 물리적으로 하나의 추론 서버로 처리
  - KV cache, prefill 큐, 처리 용량을 공유 (노드별 독립 큐가 아닌 서버 단위 큐)

- **LLM 노드 (LLM 서버 미연결 시)**: 노드에 직접 설정한 `fallback_latency_ms` 사용
- **Tool / MCP 노드**: 설정된 고정 처리 시간 ms 사용
- **재시도**: 실패율에 해당하는 요청은 `retry_delay_ms` 대기 후 해당 노드 큐에 재진입, `max_retries` 초과 시 실패 처리
- **루프 제한**: 요청별 누적 hop 수가 `max_hops_per_request`(기본 10) 초과 시 강제 실패 처리, 루프 엣지별 `max_loop_count` 초과 시도 실패 처리

#### Parallel 노드 처리

- fan-out: 요청을 모든 브랜치 노드에 동시 전달
- fan-in: 모든 브랜치 완료를 대기 후 합류 (slowest branch 기준)
- 브랜치 중 하나 실패 시 전체 실패 처리

#### 큐 모델

- 각 노드는 M/M/c 큐 모델 기반으로 대기 시간 계산
  - λ: 도착률 (arrival pattern에 의해 시간에 따라 변동)
  - μ: 처리율 (1 / avg_processing_time)
  - c: 최대 동시 처리 수 (concurrency)

---

### 1-5. 실시간 모니터링 패널

시뮬레이션 실행 중 플로우 그래프 우측(40%)에 실시간 메트릭 패널 표시.

#### WebSocket 메트릭 전송

- 고정 주기로 전체 메트릭 스냅샷 전송
- 재생 속도별 전송 주기:

| 재생 속도 | 전송 주기 |
|-----------|----------|
| 1x | 500ms |
| 2x | 250ms |
| 5x | 100ms |
| 10x | 50ms |

#### 노드별 메트릭 (시계열 그래프)

체크박스로 선택한 메트릭만 그래프에 표시.

| 메트릭 | 설명 |
|--------|------|
| 현재 큐 대기 수 | 노드 입력 큐에 쌓인 요청 수 |
| 평균 대기 시간 | 큐에서 처리 시작까지의 평균 시간 (ms) |
| P95 대기 시간 | 상위 5% 대기 시간 (선택 시 표시) |
| P99 대기 시간 | 상위 1% 대기 시간 (선택 시 표시) |
| 평균 처리 시간 | 실제 노드 처리 소요 시간 (ms) |
| 처리량 (TPS) | 초당 처리 완료 요청 수 |
| 활성 요청 수 | 현재 처리 중인 요청 수 |
| 재시도 횟수 | 누적 재시도 발생 수 (Conditional 노드) |

#### 전체 플로우 메트릭

| 메트릭 | 설명 |
|--------|------|
| End-to-End 평균 latency | Start → End 전체 소요 시간 |
| End-to-End P95 latency | 선택 시 표시 |
| End-to-End P99 latency | 선택 시 표시 |
| 전체 TPS | 초당 완료된 전체 플로우 수 |
| 병목 노드 | 대기 시간이 가장 긴 노드 강조 표시 |
| 실패율 | 전체 요청 중 최종 실패 비율 |

#### 플로우 그래프 위 표시

- 노드 색상: 큐 대기 수에 따라 초록 → 노랑 → 빨강
- 노드 위 배지: 현재 큐 수 / 처리 중 수

#### 종료 후 요약 (Simulation Panel 하단)

시뮬레이션 종료 시 우측 패널 하단에 자동으로 요약 섹션 표시.

```
전체 처리 요청 수 / 실패 수 / 실패율
노드별 peak 큐 깊이
병목 노드 순위
선택한 메트릭의 P95 / P99 종합
End-to-End latency 분포
```

#### 결과 내보내기

```
[JSON 다운로드]  [CSV 다운로드]
```

- JSON: 전체 시계열 원본 데이터
- CSV: 노드별/시간별 메트릭 테이블

#### 시뮬레이션 컨트롤

```
[▶ 시작] [⏸ 일시정지] [⏹ 초기화]   재생속도: [1x ▼]   시간: 00:12 / 01:00
```

- 시작 클릭 시 Start/End 노드 선택 및 파라미터 설정 모달 표시
- 브라우저 탭 닫힘 시 서버 시뮬레이션 즉시 중단
- 동시 시뮬레이션 미지원 (한 번에 하나만 실행)

---

## 화면 2: LLM Hub

온프레미스에 배포된 가상의 vLLM 추론 서버를 정의하고 관리한다.

### 추론 서버 종류

현재는 vLLM만 지원하며, 추후 다른 추론 서버 타입으로 확장 가능하도록 설계한다.

| 타입 | 설명 | 지원 여부 |
|------|------|----------|
| `vllm` | vLLM 기반 continuous batching 추론 서버 | v1 지원 |
| `tgi` | Hugging Face TGI | 추후 |
| `triton` | NVIDIA Triton Inference Server | 추후 |

---

### 서버 생성 설정값

```
기본 정보
- 서버 이름 (string)
- 추론 서버 타입 (vllm / ...)
- 모델 종류 (예: Llama-3, Mistral, Qwen, Gemma 등)
- 모델 파라미터 수 (7B / 13B / 30B / 70B / 기타)
- 모델 가중치 크기 GB (float, 자동 추정 or 수동 입력)
  └─ 자동 추정: params_b × 2 (FP16) / tensor_parallel

GPU 구성
- GPU 종류 (GPU 레퍼런스 목록에서 선택 또는 직접 입력)
- GPU 수 (int)
- GPU VRAM GB (GPU 선택 시 자동, 수동 조정 가능)

vLLM KV Cache 설정
- GPU 메모리 활용률 (gpu_memory_utilization, 0.0~1.0, 기본 0.9)
  └─ KV cache 가용 메모리 = VRAM × gpu_memory_utilization - model_weights_gb
- KV 캐시 블록 크기 (kv_block_size_tokens, int, 기본 16 tokens/block)
- KV 토큰당 크기 (kv_size_per_token_bytes, float): 직접 입력

서버 설정
- 최대 컨텍스트 길이 (max_context_length, int)
- 텐서 병렬 수 (tensor_parallel, int, 기본값 = GPU 수)
```

---

### 레퍼런스 성능 입력 (TTFT / TPOP)

서버 등록 시 실측 또는 벤치마크 기반의 기준 성능값을 입력한다.
이 값을 바탕으로 시뮬레이션에서 실제 요청의 latency를 스케일링하여 계산한다.

```
레퍼런스 측정값
- 기준 TTFT (ref_ttft_ms, float): 레퍼런스 측정 조건의 Time To First Token (ms)
- 기준 입력 토큰 수 (ref_input_tokens, int): TTFT 측정 시 사용한 입력 토큰 수
- 기준 TPOP (ref_tpop_ms, float): 레퍼런스 측정 조건의 Time Per Output Token (ms/token)
- 기준 출력 토큰 수 (ref_output_tokens, int): TPOP 측정 시 사용한 출력 토큰 수
```

---

### Latency 계산 공식

#### TTFT (Time To First Token)

Prefill 단계는 입력 토큰 전체를 한 번에 처리하며, 처리 시간은 입력 토큰 수에 선형 비례한다.
vLLM continuous batching에서는 다른 요청의 prefill이 진행 중이면 대기가 발생한다.

```
prefill_wait_ms = 현재 서버의 prefill 큐 대기 시간 (DES 이벤트 기반 계산)
ttft(input_tokens) = prefill_wait_ms + ref_ttft_ms × (input_tokens / ref_input_tokens)
```

#### 생성 Latency (Decode)

Decode 단계는 토큰을 하나씩 생성하며, TPOP은 메모리 대역폭에 종속되어 출력 토큰당 거의 일정하다.

```
decode_latency_ms = output_tokens × ref_tpop_ms
```

> v1에서는 batch size 증가에 따른 TPOP 변화를 단순화하여 일정값으로 처리한다.

#### 전체 요청 처리 시간

```
total_latency_ms = ttft(input_tokens) + decode_latency_ms
                 = prefill_wait_ms
                   + ref_ttft_ms × (input_tokens / ref_input_tokens)
                   + output_tokens × ref_tpop_ms
```

---

### KV Cache 기반 최대 동시 처리 수 계산

vLLM은 KV cache 블록이 부족하면 새 요청을 큐에서 받지 않는다.
각 요청은 decode 진행 중에 KV cache를 동적으로 증가시키므로 실시간 여유분을 체크한다.

```
kv_cache_memory_gb = (VRAM_gb × gpu_memory_utilization) - model_weights_gb

total_kv_blocks = (kv_cache_memory_gb × 1024³) / (kv_block_size_tokens × kv_size_per_token_bytes)

avg_blocks_per_request = ceil((avg_input_tokens + avg_output_tokens) / kv_block_size_tokens)

max_concurrent_requests = floor(total_kv_blocks / avg_blocks_per_request)
```

- 시뮬레이션 중 각 in-flight 요청의 현재 생성 토큰 수 기반으로 KV cache 사용량을 실시간 추적
- 가용 KV cache 블록이 부족하면 신규 요청은 서버 입력 큐에서 대기

### GPU 레퍼런스 관리

GPU 레퍼런스 성능 데이터는 JSON 파일로 관리하며, UI에서 업로드/다운로드가 가능하다.
앱 시작 시 기본값이 자동 로드되며, 사용자 정의 GPU를 추가할 수 있다.

#### GPU 레퍼런스 JSON 포맷

```json
{
  "version": "1.0",
  "updated_at": "2026-04-15T00:00:00Z",
  "gpus": [
    {
      "id": "h100-80g",
      "name": "H100-80G",
      "vendor": "NVIDIA",
      "tflops_fp16": 989.0,
      "memory_bandwidth_gbps": 3350.0,
      "vram_gb": 80.0,
      "notes": "SXM5"
    },
    {
      "id": "a100-80g",
      "name": "A100-80G",
      "vendor": "NVIDIA",
      "tflops_fp16": 312.0,
      "memory_bandwidth_gbps": 2000.0,
      "vram_gb": 80.0,
      "notes": "SXM4"
    }
  ]
}
```

#### 기본 제공 GPU 레퍼런스

| GPU | TFLOPS (FP16) | Memory BW (GB/s) | VRAM (GB) |
|-----|--------------|-----------------|-----------|
| H100-80G | 989 | 3350 | 80 |
| A100-80G | 312 | 2000 | 80 |
| A100-40G | 312 | 1555 | 40 |
| A6000 | 38.7 | 768 | 48 |
| RTX 4090 | 82.6 | 1008 | 24 |
| RTX 3090 | 35.6 | 936 | 24 |

### LLM 서버 JSON 포맷

```json
{
  "server_id": "uuid",
  "name": "llama3-70b-h100",
  "server_type": "vllm",
  "model_name": "Llama-3",
  "model_params_b": 70,
  "model_weights_gb": 140.0,

  "gpu_id": "h100-80g",
  "gpu_count": 4,
  "vram_gb": 80.0,

  "kv_cache": {
    "gpu_memory_utilization": 0.9,
    "kv_block_size_tokens": 16,
    "kv_size_per_token_bytes": 1024.0,
    "total_kv_blocks": 3200,
    "max_concurrent_requests": 128
  },

  "perf_reference": {
    "ref_ttft_ms": 85.0,
    "ref_input_tokens": 512,
    "ref_tpop_ms": 18.0,
    "ref_output_tokens": 128
  },

  "max_context_length": 8192,
  "tensor_parallel": 4,
  "created_at": "2026-04-15T00:00:00Z"
}
```

### LLM Hub 화면 구성

- 서버 카드 목록 (이름, 모델, GPU 구성, 예상 TPS 요약)
- 서버 추가 / 편집 / 삭제
- 서버 목록 JSON 다운로드 / 업로드
- GPU 레퍼런스 JSON 다운로드 / 업로드 (커스텀 GPU 추가 용도)
- 서버별 예상 처리 성능 미리 보기 (입력/출력 토큰 기준 추론 시간)

---

## 화면 3: 비교 뷰

여러 시뮬레이션 실행 결과를 나란히 비교하는 화면.

### 시뮬레이션 히스토리

- 시뮬레이션 종료 시 결과를 `backend/data/simulation_results/`에 자동 저장
- 저장 항목: 플로우 구성 스냅샷, 시뮬레이션 설정, 전체 시계열 메트릭

### 비교 화면 구성

```
┌─────────────────────────────────────────────────────┐
│  시뮬레이션 히스토리 목록         [비교 실행 선택: ☑☑☐] │
├─────────────────────────────────────────────────────┤
│  비교 표                                             │
│  ┌──────────┬────────────┬────────────┬───────────┐ │
│  │ 메트릭   │  Run 1     │  Run 2     │  Run 3    │ │
│  │ avg lat  │  200ms     │  150ms     │  ...      │ │
│  │ P95 lat  │  800ms     │  600ms     │  ...      │ │
│  │ TPS      │  85        │  140       │  ...      │ │
│  └──────────┴────────────┴────────────┴───────────┘ │
├─────────────────────────────────────────────────────┤
│  비교 차트 (오버레이 그래프)                          │
│  [TPS ▼]  ───  Run1  ---  Run2                      │
└─────────────────────────────────────────────────────┘
```

- 히스토리 목록에서 2개 이상 선택 후 비교
- 표: 노드별/전체 메트릭 나란히 표시
- 차트: 메트릭 선택 드롭다운으로 오버레이 그래프 전환

---

## 프로젝트 구조 (예정)

```
agent_tps_simulator/
├── frontend/               # React 앱
│   ├── src/
│   │   ├── components/
│   │   │   ├── FlowEditor/     # 노드-엣지 편집기 (React Flow)
│   │   │   ├── SimPanel/       # 실시간 메트릭 패널
│   │   │   ├── LLMHub/         # LLM 서버 관리 UI
│   │   │   └── CompareView/    # 시뮬레이션 비교 뷰
│   │   ├── pages/
│   │   │   ├── AgentPage.tsx   # Agent Flow + Simulation (화면 1)
│   │   │   ├── LLMHubPage.tsx  # LLM Hub (화면 2)
│   │   │   └── ComparePage.tsx # 비교 뷰 (화면 3)
│   │   └── App.tsx
│   └── package.json
│
├── backend/                # Python FastAPI
│   ├── main.py             # 앱 진입점
│   ├── api/
│   │   ├── flow.py         # 플로우 CRUD
│   │   ├── llm_hub.py      # LLM 서버 CRUD + GPU 레퍼런스 업로드/다운로드
│   │   └── simulation.py   # 시뮬레이션 실행 / WebSocket
│   ├── engine/
│   │   ├── simulator.py    # 시뮬레이션 코어 (DES 기반 큐 모델)
│   │   ├── node.py         # 노드 처리 로직 (분기, 재시도, Parallel fan-out/in)
│   │   ├── arrival.py      # 요청 도착 패턴 생성 (Ramp-up / Wave)
│   │   └── metrics.py      # 메트릭 집계 (avg, P95, P99)
│   ├── models/
│   │   ├── flow.py         # 플로우 데이터 모델
│   │   ├── llm_server.py   # LLM 서버 데이터 모델
│   │   └── simulation.py   # 시뮬레이션 설정 모델
│   └── data/               # JSON 저장소
│       ├── flows/
│       ├── llm_servers/
│       ├── simulation_results/   # 시뮬레이션 히스토리
│       └── gpu_reference.json
│
├── venv/                   # Python 가상환경
├── history.md
└── README.md
```

---

## 사용법 (예정)

### 환경 설정

```bash
# Python 백엔드 (uv)
uv sync
source .venv/bin/activate
uvicorn backend.main:app --reload

# React 프론트엔드
cd frontend
npm install
npm run dev
```

### 기본 워크플로우

1. **LLM Hub** 화면에서 가상 LLM 서버 생성 (GPU 선택, 모델 설정)
2. 필요 시 GPU 레퍼런스 JSON을 업로드하여 커스텀 GPU 추가
3. **Agent Flow** 화면에서 템플릿 선택 후 노드 추가 및 플로우 구성
4. 각 노드에 LLM 서버 연결 및 토큰/처리 시간 설정
5. Conditional 노드에 분기 확률(%) 설정, 루프 엣지에 max_loop_count 설정
6. ▶ 시작 클릭 → Start/End 노드 선택 → 시뮬레이션 패턴 및 파라미터 입력
7. 실시간 메트릭 확인, 종료 후 요약 검토
8. 결과 JSON/CSV 다운로드 또는 히스토리 저장
9. **비교 뷰** 화면에서 여러 실행 결과 비교하여 최적 구성 도출
