# FlowEditor (플로우 에디터) 설계

## 1. 개요

### 목적
에이전트 플로우를 DAG(Directed Acyclic Graph) 형태로 시각적으로 편집하고, 각 노드의 설정(타입, 파라미터)을 관리하는 그래프 에디터입니다.

### 범위
- 노드 생성/삭제/이동
- 엣지(연결) 생성/삭제
- 노드 설정 편집 (타입별 파라미터)
- 플로우 저장/로드
- 시뮬레이션 시작점/종료점 지정

### 핵심 개념
- **ReactFlow 기반**: 오픈소스 플로우 에디터 라이브러리 사용
- **노드 타입**: LLM, Tool, Conditional, Parallel, Start, End
- **설정 모달**: 노드 더블클릭 → 설정 모달 오픈
- **자동 저장**: 플로우 변경 시 백엔드에 자동 저장

---

## 2. 상세 설계

### 2.1 레이아웃

**패널 위치**
```
┌──────────────────────────────────────┐
│ Sidebar │ FlowEditor(flex:2) │ SimPanel
└──────────────────────────────────────┘
```

**FlowEditor 내부 구조**
```
┌─ 툴바 ─────────────────────────────┐ (높이: ~40px, 고정)
│ [+노드] [연결] [삭제] │ 선택중인 노드 정보 │
├─────────────────────────────────────┤
│                                     │
│ ReactFlow Canvas                    │ (flex: 1)
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │ ○─→○  (그래프 렌더링)         │ │
│ │  ↓ ↓                           │ │
│ │  ○─→○                        │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

### 2.2 노드 (Node) 설계

#### 노드 종류별 스펙

| 타입 | 아이콘 | 색상 | 파라미터 | 역할 |
|------|--------|------|---------|------|
| Start | ▶ | 회색 #94a3b8 | 없음 | 플로우 시작점 (1개만 허용) |
| End | ⏹ | 어두운회색 #64748b | 없음 | 플로우 종료점 (1개 이상) |
| LLM | 🧠 | 보라 #a855f7 | llm_server_id, model, temp, etc | LLM 모델 호출 |
| Tool | 🔧 | 파랑 #3b82f6 | tool_name, params | 외부 도구 호출 |
| Conditional | 🔀 | 노랑 #f59e0b | condition_expr | 조건부 분기 |
| Parallel | ⚡ | 초록 #22c55e | 없음 | 병렬 처리 (자동 merge) |

#### 노드 구조 (React Flow)
```typescript
interface FlowNode {
  id: string                    // 'node-1', 'node-2', ...
  type: string                  // 'start' | 'end' | 'llm' | 'tool' | ...
  position: { x: number; y: number }
  data: {
    label: string              // 표시 라벨
    config: NodeConfig         // 타입별 설정
  }
}

type NodeConfig = 
  | StartConfig
  | EndConfig
  | LLMConfig
  | ToolConfig
  | ConditionalConfig
  | ParallelConfig

interface LLMConfig {
  llm_server_id: string
  model: string
  temperature: number
  max_tokens: number
  top_p: number
  // ... 기타 LLM 파라미터
}

interface ToolConfig {
  tool_name: string
  // ... 도구별 파라미터
}

interface ConditionalConfig {
  condition_expr: string  // Python 표현식: "len(context.text) > 100"
  true_label: string      // 참 분기 라벨
  false_label: string     // 거짓 분기 라벨
}

interface ParallelConfig {
  // 설정 없음 (자동으로 이전 노드의 모든 출력을 병렬 처리)
}
```

#### 노드 UI 렌더링
```
┌─────────────────────┐
│ 🧠 LLM_1            │  (너비: 140px, 높이: 60px)
│ label: "Chat API"   │  (설정 표시)
└─────────────────────┘
   ↑ (핸들: 상단)
   ↓ (핸들: 하단)
```

**인터랙션**:
- **선택**: 클릭 → 테두리 하이라이트
- **이동**: 드래그 → 캔버스 위에서 위치 변경
- **편집**: 더블클릭 → 설정 모달 오픈
- **연결**: 드래그 앤 드롭 (아래쪽 핸들 → 위쪽 핸들)
- **삭제**: 선택 후 Delete 키 또는 휴지통 버튼

### 2.3 엣지 (Edge) 설계

#### 엣지 구조
```typescript
interface FlowEdge {
  id: string                  // 'edge-1', 'edge-2', ...
  source: string              // 출발 노드 ID
  target: string              // 도착 노드 ID
  label?: string              // 조건부 라벨 (Conditional 노드의 경우)
}
```

#### Conditional 노드의 엣지
- Conditional 노드는 2개의 출력 엣지를 가짐
- 라벨: "true" / "false"
- 색상: true는 초록, false는 빨강

#### Parallel 노드의 엣지
- Parallel 노드는 1개의 입력, N개의 출력
- 모든 출력이 병렬로 처리됨
- 자동으로 merge 노드 생성 (숨김)

### 2.4 설정 모달 (Node Config Modal)

#### 구조
```
┌─────────────────────────────────────┐
│ 노드 설정: LLM_1                    │ X
├─────────────────────────────────────┤
│                                     │
│ 라벨: [LLM_1 ─────────────────]    │
│                                     │
│ ┌─ LLM 설정 ──────────────────┐   │
│ │ LLM 서버: [gpt-4 ▼]       │   │
│ │ 모델: [gpt-4-turbo ▼]     │   │
│ │ 온도: [0.7 ────────]       │   │
│ │ Max Tokens: [2048 ──]      │   │
│ │ Top P: [0.9 ────────]      │   │
│ └────────────────────────────┘   │
│                                     │
│ [저장] [취소]                      │
└─────────────────────────────────────┘
```

**모달 동작**:
- 노드 더블클릭 → 해당 타입의 설정 폼 표시
- 저장 → FlowNode.data.config 업데이트 → 백엔드 저장
- 취소 → 변경사항 폐기

#### 타입별 설정 폼

**LLM 노드**
```
라벨: [텍스트 입력]
LLM 서버: [드롭다운: gpt-4, claude, 등]
모델: [드롭다운: 서버별 모델 목록]
온도: [슬라이더: 0.0 ~ 2.0]
Max Tokens: [숫자 입력: 1 ~ 32000]
Top P: [슬라이더: 0 ~ 1]
Top K: [숫자 입력: 0 ~ 100]
시스템 프롬프트: [텍스트 영역]
```

**Tool 노드**
```
라벨: [텍스트 입력]
도구 이름: [드롭다운: 등록된 도구 목록]
파라미터: [JSON 에디터 또는 폼]
  - 도구 선택 시 스키마에 따라 폼 생성
```

**Conditional 노드**
```
라벨: [텍스트 입력]
조건 표현식: [텍스트 영역 - Python 식]
참 분기 라벨: [텍스트 입력]
거짓 분기 라벨: [텍스트 입력]

예시: "len(context.history) > 5"
```

**Parallel 노드**
```
라벨: [텍스트 입력]
(추가 설정 없음 - 자동 병렬 처리)
```

### 2.5 플로우 저장/로드

#### 자동 저장
- 노드 생성/삭제, 엣지 생성/삭제, 설정 변경 시마다 백엔드 저장
- 디바운싱: 1초 동안 변경 없을 때 저장 (과도한 저장 방지)

#### API
```typescript
// PUT /api/flows/{flow_id}
{
  "nodes": [ /* ReactFlow nodes */ ],
  "edges": [ /* ReactFlow edges */ ],
  "name": "플로우 이름"
}
```

---

## 3. 데이터 모델

### 3.1 프론트엔드 (TypeScript)

**Flow (전체 구조)**
```typescript
interface Flow {
  flow_id: string
  name: string
  created_at: string
  updated_at: string
  nodes: Node[]        // ReactFlow Node[]
  edges: Edge[]        // ReactFlow Edge[]
}

interface Node {
  id: string
  type: string         // 'start' | 'end' | 'llm' | 'tool' | ...
  position: { x: number; y: number }
  data: {
    label: string
    config: any        // 타입별 설정
  }
}

interface Edge {
  id: string
  source: string
  target: string
  label?: string
}
```

### 3.2 백엔드 (Python)

**Node (models/flow.py)**
```python
class Node(BaseModel):
    node_id: str
    type: Literal["start", "end", "llm", "tool", "conditional", "parallel"]
    label: Optional[str] = None
    config: Optional[dict] = None  # 타입별 설정
    position: Optional[dict] = {"x": 0, "y": 0}

class Flow(BaseModel):
    flow_id: str
    name: str
    created_at: datetime
    updated_at: datetime
    nodes: list[Node]
    edges: list[dict]  # {"source": "node-1", "target": "node-2", "label": "true"}
```

---

## 4. 구현 체크리스트

### 파일 생성/수정

| 파일 | 작업 | 라인 | 설명 |
|------|------|------|------|
| `frontend/src/components/FlowEditor/index.tsx` | 수정 | ~400 | ReactFlow 통합 |
| `frontend/src/components/FlowEditor/nodeTypes/` | 신규 | 각 ~100 | 노드 타입별 렌더링 |
| `frontend/src/components/NodeConfigModal.tsx` | 신규 | ~300 | 설정 모달 (타입별 폼) |
| `frontend/src/store/index.ts` | 수정 | +20 | Flow 저장/로드 액션 |

### FlowEditor/index.tsx 구현 항목
- [ ] ReactFlow 초기화
- [ ] useFlowStore 연동 (flow 데이터)
- [ ] 노드/엣지 렌더링
- [ ] 드래그 앤 드롭 (노드 이동, 연결)
- [ ] 노드 선택/다중 선택
- [ ] Delete 키 처리 (삭제)
- [ ] 더블클릭 처리 (모달 오픈)
- [ ] 디바운싱된 저장 (1초)

### 노드 타입별 컴포넌트
- [ ] LLMNode.tsx - LLM 타입 렌더링
- [ ] ToolNode.tsx - Tool 타입 렌더링
- [ ] ConditionalNode.tsx - Conditional 타입 (2개 출력)
- [ ] ParallelNode.tsx - Parallel 타입
- [ ] StartNode.tsx - Start 타입
- [ ] EndNode.tsx - End 타입

### NodeConfigModal.tsx 구현 항목
- [ ] 모달 구조 (제목, 폼, 버튼)
- [ ] 타입별 폼 생성 (switch/if)
- [ ] LLM 폼 - 서버/모델 드롭다운, 슬라이더 입력
- [ ] Tool 폼 - 도구 선택, 파라미터 JSON
- [ ] Conditional 폼 - 조건식, 분기 라벨
- [ ] Parallel 폼 - (설정 없음)
- [ ] 유효성 검증 (필수 필드)
- [ ] 저장/취소 버튼

### Store 수정 (useFlowStore)
- [ ] updateFlow(flow) - 플로우 전체 업데이트
- [ ] updateNode(node_id, config) - 노드 설정만 수정
- [ ] 자동 저장 로직 (디바운싱)

---

## 5. 스타일 정보

### 색상 (노드 타입별)
```typescript
const nodeColors = {
  start: '#94a3b8',
  end: '#64748b',
  llm: '#a855f7',
  tool: '#3b82f6',
  conditional: '#f59e0b',
  parallel: '#22c55e'
}
```

### 선택/강조
- 선택됨: 테두리 2px solid var(--primary) #3b82f6
- 호버: 그림자 추가 (box-shadow)

### 모달 (기존 CSS 사용)
- background: var(--surface) #1e293b
- 테두리: 1px solid var(--border)
- 최소 너비: 420px

---

## 6. 참고 사항

- **React Flow 라이브러리**: @xyflow/react 최신 버전
- **마우스 핸들**: Top/Bottom 배치 (좌우보다 깔끔)
- **자동 레이아웃**: 초기 로드 시만 (이후 수동 배치)
- **Conditional의 특별성**: 2개 출력 엣지, 조건식 평가
- **Parallel의 특별성**: 자동 merge (백엔드에서 처리)

