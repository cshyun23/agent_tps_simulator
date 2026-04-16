# API 문서

## 기본 정보

- **Base URL**: `http://localhost:8000/api`
- **프로토콜**: REST API + WebSocket
- **Content-Type**: `application/json`

---

## 플로우 API

### 플로우 목록 조회

```http
GET /flows/
```

**응답:**
```json
[
  {
    "flow_id": "flow_123",
    "name": "RAG Flow",
    "updated_at": "2024-04-16T10:30:00Z"
  }
]
```

### 플로우 상세 조회

```http
GET /flows/{flow_id}
```

**응답:**
```json
{
  "flow_id": "flow_123",
  "name": "RAG Flow",
  "nodes": [
    {
      "id": "node_1",
      "type": "start",
      "label": "Start",
      "position": {"x": 0, "y": 0},
      "config": {}
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "is_loop": false,
      "max_loop_count": null
    }
  ],
  "created_at": "2024-04-16T10:00:00Z",
  "updated_at": "2024-04-16T10:30:00Z"
}
```

### 플로우 생성

```http
POST /flows/
Content-Type: application/json

{
  "name": "My Flow",
  "nodes": [],
  "edges": []
}
```

**응답:** 생성된 플로우 객체

### 플로우 수정

```http
PUT /flows/{flow_id}
Content-Type: application/json

{
  "name": "Updated Flow",
  "nodes": [...],
  "edges": [...]
}
```

### 플로우 삭제

```http
DELETE /flows/{flow_id}
```

### 플로우 복제

```http
POST /flows/{flow_id}/duplicate
```

---

## LLM Hub API

### 서버 목록 조회

```http
GET /llm-hub/servers
```

**응답:**
```json
[
  {
    "server_id": "server_1",
    "name": "Claude Opus",
    "model_name": "Claude-3.5-Sonnet",
    "model_params_b": 70,
    "gpu_id": "h100-80g",
    "gpu_count": 4,
    "perf_reference": {
      "ref_ttft_ms": 85,
      "ref_tpop_ms": 18
    }
  }
]
```

### 서버 상세 조회

```http
GET /llm-hub/servers/{server_id}
```

### 서버 생성

```http
POST /llm-hub/servers
Content-Type: application/json

{
  "name": "New Server",
  "model_name": "Llama-2",
  "model_params_b": 70,
  "gpu_id": "a100-40g",
  "gpu_count": 2,
  "perf_reference": {
    "ref_ttft_ms": 100,
    "ref_tpop_ms": 20
  }
}
```

### 서버 수정

```http
PUT /llm-hub/servers/{server_id}
Content-Type: application/json

{
  "name": "Updated Name",
  "perf_reference": {
    "ref_ttft_ms": 90,
    "ref_tpop_ms": 19
  }
}
```

### 서버 삭제

```http
DELETE /llm-hub/servers/{server_id}
```

### GPU 레퍼런스 조회

```http
GET /llm-hub/gpu-reference
```

**응답:**
```json
{
  "gpus": [
    {
      "gpu_id": "h100-80g",
      "vram_gb": 80,
      "tensor_float_32_tflops": 989
    }
  ]
}
```

### GPU 레퍼런스 업로드

```http
POST /llm-hub/gpu-reference/upload
Content-Type: multipart/form-data

file: <gpu_reference.json>
```

---

## 시뮬레이션 API

### 시뮬레이션 시작 (WebSocket)

```
ws://localhost:8000/api/simulation/ws
```

**클라이언트에서 전송:**
```json
{
  "flow_id": "flow_123",
  "start_node_id": "node_1",
  "end_node_ids": ["node_5"],
  "duration_sec": 60,
  "playback_speed": 1,
  "arrival_pattern": {
    "type": "ramp_up",
    "start_users": 0,
    "peak_users": 100,
    "ramp_duration_sec": 10,
    "hold_duration_sec": 30,
    "ramp_shape": "linear"
  },
  "show_p95": true,
  "show_p99": true
}
```

**서버에서 전송 (Snapshot):**
```json
{
  "type": "snapshot",
  "data": {
    "sim_time_sec": 5.0,
    "overall_tps": 45.2,
    "e2e_avg_latency_ms": 250.5,
    "e2e_p95_latency_ms": 350.2,
    "e2e_p99_latency_ms": 450.1,
    "total_completed": 226,
    "total_failed": 0
  }
}
```

**서버에서 전송 (완료):**
```json
{
  "type": "finished",
  "result_id": "result_abc123",
  "summary": {
    "total_completed": 3000,
    "total_failed": 5,
    "failure_rate": 0.17,
    "e2e_avg_latency_ms": 248.3,
    "peak_tps": 52.1,
    "e2e_p95_latency_ms": 352.4,
    "e2e_p99_latency_ms": 451.2
  }
}
```

### 시뮬레이션 히스토리 조회

```http
GET /simulation/history
```

**응답:**
```json
[
  {
    "result_id": "result_1",
    "flow_name": "RAG Flow",
    "started_at": "2024-04-16T10:30:00Z"
  }
]
```

### 시뮬레이션 결과 조회

```http
GET /simulation/history/{result_id}
```

**응답:**
```json
{
  "result_id": "result_1",
  "flow_id": "flow_123",
  "flow_name": "RAG Flow",
  "config": { ... },
  "summary": { ... },
  "snapshots": [
    {
      "sim_time_sec": 1.0,
      "overall_tps": 30.0,
      "e2e_avg_latency_ms": 280.0,
      ...
    }
  ]
}
```

### 시뮬레이션 결과 삭제

```http
DELETE /simulation/history/{result_id}
```

### 시뮬레이션 중단

```http
POST /simulation/stop
```

---

## 에러 응답

모든 에러는 다음 형식으로 반환됩니다:

```json
{
  "detail": "에러 메시지"
}
```

| 상태 코드 | 설명 |
|----------|------|
| 400 | Bad Request - 잘못된 요청 |
| 404 | Not Found - 리소스 없음 |
| 500 | Internal Server Error - 서버 오류 |

---

## 도착 패턴 (Arrival Pattern)

### Ramp-up Pattern

```json
{
  "type": "ramp_up",
  "start_users": 0,
  "peak_users": 100,
  "ramp_duration_sec": 10,
  "hold_duration_sec": 30,
  "ramp_shape": "linear"  // "linear" 또는 "smooth"
}
```

- **Linear**: 선형 증가
- **Smooth**: 곡선으로 부드러운 증가

### Wave Pattern

```json
{
  "type": "wave",
  "min_users": 10,
  "peak_users": 100,
  "period_sec": 20,
  "wave_count": 3,
  "phase_offset_sec": 0
}
```

---

## 플로우 노드 설정

### LLM 노드

```json
{
  "id": "node_llm",
  "type": "llm",
  "label": "Query Analysis",
  "config": {
    "llm_server_id": "server_1",
    "input_tokens": 512,
    "output_tokens": 128,
    "fallback_latency_ms": 1000,
    "concurrency": 4
  }
}
```

### Tool 노드

```json
{
  "id": "node_tool",
  "type": "tool",
  "label": "Web Search",
  "config": {
    "tool_latency_ms": 500
  }
}
```

### Conditional 노드

```json
{
  "id": "node_cond",
  "type": "conditional",
  "label": "Intent Classifier",
  "config": {
    "failure_rate": 5,
    "max_retries": 2,
    "retry_delay_ms": 500,
    "branches": [
      {
        "branch_name": "Answer Directly",
        "target_node": "node_end",
        "probability": 60
      },
      {
        "branch_name": "Need Search",
        "target_node": "node_tool",
        "probability": 40
      }
    ]
  }
}
```

### Parallel 노드

```json
{
  "id": "node_para",
  "type": "parallel",
  "label": "Parallel Tools",
  "config": {}
}
```

---

## 예제 코드

### JavaScript/TypeScript

```typescript
import { api } from './api/client'

// 플로우 목록 조회
const flows = await api.flows.list()

// 플로우 생성
const newFlow = await api.flows.create({
  name: "New Flow",
  nodes: [],
  edges: []
})

// 서버 생성
const server = await api.llmHub.createServer({
  name: "Claude Opus",
  model_name: "Claude-3.5",
  model_params_b: 70,
  gpu_id: "h100-80g",
  gpu_count: 4,
  perf_reference: {
    ref_ttft_ms: 85,
    ref_tpop_ms: 18
  }
})

// 시뮬레이션 시작
const ws = new WebSocket('ws://localhost:8000/api/simulation/ws')
ws.send(JSON.stringify({
  flow_id: "flow_123",
  start_node_id: "node_1",
  end_node_ids: ["node_5"],
  duration_sec: 60,
  playback_speed: 1,
  arrival_pattern: {
    type: "ramp_up",
    start_users: 0,
    peak_users: 100,
    ramp_duration_sec: 10,
    hold_duration_sec: 30,
    ramp_shape: "linear"
  },
  show_p95: true,
  show_p99: true
}))
```

### Python (Requests)

```python
import requests
import json

BASE_URL = "http://localhost:8000/api"

# 플로우 목록 조회
flows = requests.get(f"{BASE_URL}/flows/").json()

# 플로우 생성
new_flow = requests.post(
    f"{BASE_URL}/flows/",
    json={
        "name": "New Flow",
        "nodes": [],
        "edges": []
    }
).json()

# 서버 생성
server = requests.post(
    f"{BASE_URL}/llm-hub/servers",
    json={
        "name": "Claude Opus",
        "model_name": "Claude-3.5",
        "model_params_b": 70,
        "gpu_id": "h100-80g",
        "gpu_count": 4,
        "perf_reference": {
            "ref_ttft_ms": 85,
            "ref_tpop_ms": 18
        }
    }
).json()
```
