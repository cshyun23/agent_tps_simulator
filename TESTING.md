# Agent TPS Simulator - Testing Guide

## Current Status ✅
- **Backend**: Running on http://localhost:8000
- **Frontend**: Running on http://localhost:5173
- **Database**: File-based JSON (backend/data/)
- **WebSocket**: Ready for simulation streaming

All API endpoints are operational and tested.

## Quick Start

### 1. Open the Application
Navigate to: **http://localhost:5173**

You should see the TPS Simulator with 3 tabs:
- **Agent Flow** (currently selected)
- **LLM Hub**
- **비교 뷰** (Comparison View)

### 2. Test Flow Management (Agent Flow Tab)

#### Create a New Flow
1. Click **"+ 새 플로우"** button on the left sidebar
2. A new empty flow appears in the list
3. Click on the flow to select it

#### Edit Flow
1. Use the node buttons at the top-left to add nodes:
   - **+ Start** - Entry point
   - **+ LLM** - Language model processing
   - **+ Tool** - External tool call
   - **+ Cond** - Conditional branching
   - **+ Para** - Parallel execution
   - **+ End** - Exit point

2. Click and drag nodes to reposition them
3. Right-click nodes to open context menu and delete
4. Draw edges by clicking source node handle and dragging to target node
5. Click nodes to open settings popup to configure parameters

#### Load a Template
1. Click **"🎨 Template"** button
2. Select one of 4 templates:
   - **빈 플로우** - Empty flow
   - **단순 RAG** - RAG pipeline
   - **ReAct 루프** - Agent reasoning loop with retry
   - **병렬 Tool 호출** - Parallel tool execution

#### Save Flow
1. Click **"💾 Save"** to persist changes to backend
2. Flow name and update time shown in sidebar

#### Undo/Redo
- **"↶ Undo"** - Revert last change
- **"↷ Redo"** - Restore change

### 3. Configure LLM Servers (LLM Hub Tab)

#### View Servers
1. Click **"LLM Hub"** tab
2. See grid of available LLM servers with specs:
   - Model name and parameters
   - GPU type and count
   - Performance metrics (TTFT, TPOP)

#### Create Server
1. Click **"+ 서버 추가"** button
2. Fill form with:
   - **이름** - Server name
   - **모델** - Model name (e.g., "Llama-3")
   - **파라미터 (B)** - Model parameters in billions
   - **GPU 종류** - GPU type (h100-80g, a100-80g, etc.)
   - **GPU 개수** - Number of GPUs
   - **Ref TTFT (ms)** - Reference Time To First Token
   - **Ref TPOP (ms/tok)** - Reference Time Per Output Token
3. Click **"저장"** to create

#### Edit Server
1. Click **"✏ 편집"** on a server card
2. Modify any fields
3. Click **"저장"**

#### Delete Server
1. Click **"🗑 삭제"** on a server card
2. Confirm deletion

### 4. Run Simulation (Agent Flow Tab - Right Panel)

#### Configure Simulation
In the right panel (SimPanel), set:

**Arrival Pattern**
- **Type**: Ramp-up (gradually increase) or Wave (burst pattern)
- **Peak Users**: Maximum concurrent users
- **Ramp Duration**: Time to reach peak users
- **Hold Duration**: Time to maintain peak load

**Settings**
- **Duration**: Total simulation time in seconds
- **Speed**: Playback multiplier (1x, 2x, 5x, 10x)
- **P95/P99**: Checkbox to include 95th/99th percentile metrics

#### Run Simulation
1. Configure flow with Start and End nodes
2. Configure at least one LLM server in the flow
3. Click **"▶ Run Simulation"** button
4. Watch real-time metrics update:
   - **TPS** (Transactions Per Second) - throughput
   - **E2E Latency** - end-to-end response time
   - **P95/P99** - percentile latency (if enabled)

#### Pause/Resume
1. Click **"⏸ 일시정지"** to pause
2. Click **"▶ 재개"** to resume
3. Click **"⏹ 중지"** to stop

#### View Results
After simulation completes, see summary:
- Total requests processed
- Requests failed
- Average E2E latency
- Peak TPS
- Percentile latencies (if enabled)

### 5. Compare Results (비교 뷰 Tab)

#### View History
Left sidebar shows all previous simulations with:
- Flow name
- Simulation date

#### Select Results to Compare
1. Check the checkboxes next to simulations you want to compare
2. Click **"비교하기"** (Compare) button

#### View Comparison Charts
Four bar charts show metrics comparison:
- **Requests Processed** - Total completed requests per run
- **TPS** - Peak TPS for each run
- **Latency** - Average E2E latency
- **Percentiles** - P95/P99 comparison

## Test Scenarios

### Scenario 1: Simple RAG Pipeline
1. Use "단순 RAG" template (loads automatically)
2. Configure LLM servers if needed
3. Run simulation with default settings
4. Observe throughput and latency

### Scenario 2: Compare Different Configurations
1. Create Flow A with 1 LLM server
2. Run simulation, save results
3. Create Flow B with 2 LLM servers
4. Run simulation, save results
5. Compare results in 비교 뷰 tab

### Scenario 3: Parallel Tool Execution
1. Use "병렬 Tool 호출" template
2. Observe how parallel nodes distribute load
3. Compare latency with sequential pipeline

## Known Limitations
- Only 1 concurrent simulation allowed (enforced by backend)
- Browser refresh resets simulation panel state
- Simulation history persists in backend/data/simulation_results/

## Troubleshooting

### "플로우를 선택하세요" message
- Click **"+ 새 플로우"** to create a flow
- Or click existing flow in sidebar to load it

### Simulation doesn't start
- Ensure flow has Start and End nodes
- Select LLM servers with valid configurations
- Check browser console for errors (F12)

### Charts not showing
- Wait for first metric snapshot (~0.1s)
- Ensure simulation is running (green status indicator)
- Check if P95/P99 checkboxes match selected metrics

### API errors
- Backend may have crashed: check terminal for errors
- Refresh frontend (Cmd/Ctrl + R)
- Verify ports: Backend 8000, Frontend 5173

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│         Frontend (React + TypeScript + Vite)            │
│                                                         │
│  ┌─────────┬──────────┬──────────────┐               │
│  │ Agent   │ LLM Hub  │ Comparison   │ (Tab Navigation)
│  │ Flow    │          │ View         │               │
│  └─────────┴──────────┴──────────────┘               │
│                                                         │
│  - FlowEditor (@xyflow/react) - Node/Edge Editing    │
│  - SimPanel - Real-time Simulation Controls           │
│  - Recharts - Metrics Visualization                  │
│  - Zustand - State Management                        │
└─────────────────────────────────────────────────────────┘
                        ↕ (HTTP + WebSocket)
┌─────────────────────────────────────────────────────────┐
│         Backend (FastAPI + Uvicorn + Python)            │
│                                                         │
│  - REST API: Flows, LLM Servers, Simulation History   │
│  - WebSocket: Real-time Metric Streaming              │
│  - DES Engine: Event-based Simulation                 │
│  - Metrics: P50, P95, P99 Latency Aggregation        │
│  - File Storage: JSON-based (backend/data/)           │
└─────────────────────────────────────────────────────────┘
```

## File Structure
```
agent_tps_simulator/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── api/          # API client
│   │   ├── store/        # Zustand stores
│   │   └── types/        # TypeScript types
│   └── vite.config.ts    # Vite configuration
│
├── backend/           # FastAPI application
│   ├── api/            # Route handlers
│   ├── models/         # Pydantic models
│   ├── engine/         # DES simulator
│   ├── data/           # JSON data files
│   └── main.py         # App entry point
│
└── history.md         # Command history
```

## Next Steps
1. Test all 3 main screens
2. Create and run several simulations
3. Compare results to verify bottleneck identification
4. [Optional] Configure production deployment

## Support
For issues or questions, check:
1. Browser console (F12) for JavaScript errors
2. Backend terminal for API errors
3. history.md for previous commands
4. progress.md for implementation status
