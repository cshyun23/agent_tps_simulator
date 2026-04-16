# 설계 vs 구현 상세 분석

## 개발 완성도: 85% ✅

전체적으로 핵심 기능은 모두 구현되었으나, 일부 부가 기능과 UX 개선 사항이 미구현 상태입니다.

---

## 1️⃣ 완전히 구현된 핵심 기능

### ✅ Frontend 기본 화면 (100%)
- 3개 탭 네비게이션 (Agent Flow, LLM Hub, Compare)
- Agent Flow 3단 레이아웃 (Flow 목록 | Editor | Simulation Panel)

### ✅ Flow Editor (95%)
- 6가지 노드 타입 (Start, End, LLM, Tool, Conditional, Parallel)
- 노드 드래그 배치, 엣지 연결
- 노드 클릭 시 설정 팝업 (모든 노드 타입 지원)
- Back edge 감지 (DFS) + 루프 엣지 시각화 (점선, 주황색)
- Flow 저장 (백엔드 연동)
- Undo/Redo (Ctrl+Z/Y)
- 우클릭 컨텍스트 메뉴 (삭제)
- 4가지 플로우 템플릿

### ✅ Simulation Panel (90%)
- Play/Pause/Stop 제어
- 재생 속도 선택 (1x, 2x, 5x, 10x)
- Arrival Pattern: Ramp-up 타입 설정
- 시뮬레이션 시간, Peak users 설정
- P95/P99 메트릭 표시 체크박스
- 실시간 LineChart (TPS, E2E Latency, P95, P99)
- WebSocket 연동 (메트릭 스트리밍)
- 시뮬레이션 완료 후 요약 (처리됨, 실패, 평균 지연, 최대 TPS)

### ✅ LLM Hub Page (85%)
- 서버 생성/편집/삭제
- 모델 정보 입력 (이름, 모델명, 파라미터)
- GPU 구성 (종류, 개수)
- 성능 참조값 (Ref TTFT, Ref TPOP)
- 서버 목록 표시 (카드 그리드)

### ✅ Compare Page (100%)
- 시뮬레이션 히스토리 목록
- 다중 선택 (체크박스)
- 비교 차트 4개 (Requests, TPS, Latency, Percentiles)

### ✅ Backend 완전 구현
- DES 시뮬레이션 엔진
- LLM 레이턴시 계산 (TTFT + decode, prefill 대기)
- KV cache 동적 계산
- 동일 서버 공유 처리
- Conditional 분기 (확률 기반)
- Parallel fan-out/fan-in
- 재시도 로직
- 루프 제한 (max_hops)
- 메트릭 집계 (P95, P99)
- WebSocket 실시간 메트릭 전송

---

## 2️⃣ 부분 구현 또는 UX 개선 필요

### 🟡 Arrival Pattern (부분 구현)
**구현됨:**
- Ramp-up 타입 (시간 기반 증가)
  - peak_users, ramp_duration_sec, hold_duration_sec 설정 가능

**미구현:**
- Wave 타입 선택은 가능하나 Wave 파라미터 UI 없음
  - min_users, period_sec, wave_count, phase_offset_sec 입력 불가
  - Backend에는 Wave 로직이 구현되어 있음

### 🟡 Node Settings 편집 (부분 구현)
**Conditional 노드:**
- ✅ Failure rate, max_retries, retry_delay_ms 편집 가능
- ❌ Branches 목록 시각화만 됨 (편집 불가)
  - Branches 추가/삭제/편집 UI 없음
  - 현재는 백엔드에서 branches를 관리해야 함

**Parallel 노드:**
- ✅ Fanout_nodes, fanin_node를 엣지 드래그로 설정 가능
- ❌ 팝업 내에서 명시적으로 설정할 수 없음
- ❌ 선택된 노드 이름 표시 없음

### 🟡 LLM 노드 Token 분포
**현재:**
- Average 값만 입력 (input_tokens, output_tokens)
- 백엔드에서 자동으로 std=avg×0.2로 정규분포 샘플링

**설계상 필요:**
- UI에서 평균 ± 표준편차 또는 min/max 범위 설정 가능해야 함

---

## 3️⃣ 미구현된 기능

### 🔴 Flow Import/Export (디자인됨, UI 미구현)
**상태:**
- Backend endpoint 존재: GET/POST `/api/flows/{flow_id}/export`, `/api/flows/{flow_id}/import`
- Frontend UI 없음

**필요:**
- Flow Editor 상단에 "📥 Import", "📤 Export" 버튼
- JSON 파일 업로드/다운로드 기능

### 🔴 Keyboard Shortcuts (설계됨, 일부 미구현)
**구현됨:**
- Ctrl+Z (Undo)
- Ctrl+Y (Redo)

**미구현:**
- Ctrl+C (노드 복사)
- Ctrl+V (노드 붙여넣기)
- Del (노드 삭제) - 현재는 우클릭만 가능

### 🔴 Simulation 결과 내보내기 (설계됨, 전면 미구현)
**필요:**
- SimPanel 요약 섹션 하단에 버튼 추가
  - 📊 JSON 다운로드
  - 📊 CSV 다운로드
- Backend endpoint 필요:
  - GET `/api/simulation/history/{result_id}/download` (JSON/CSV)

### 🔴 GPU Reference 관리 (Backend 있음, UI 미구현)
**상태:**
- Backend endpoint 완성:
  - GET `/api/llm-hub/gpu-reference/download`
  - POST `/api/llm-hub/gpu-reference/upload`
- Frontend에 UI 없음

**필요:**
- LLM Hub 페이지 하단에 섹션 추가
  - GPU 레퍼런스 현재 상태 표시
  - "📥 Import GPU Reference" 버튼
  - "📤 Export GPU Reference" 버튼

### 🔴 LLM Hub 서버 Import/Export (Backend 있음, UI 미구현)
**상태:**
- Backend endpoint 존재:
  - GET `/api/llm-hub/servers/export/all`
  - POST `/api/llm-hub/servers/import`
- Frontend UI 없음

**필요:**
- LLM Hub 페이지 상단에 버튼
  - "📤 Export All Servers"
  - "📥 Import Servers"

---

## 4️⃣ UX 개선 필요 사항

### 🟠 엣지 레이블 표시 안 됨
**현재:**
- Conditional 노드에서 분기 확률(%) 정보가 있지만 엣지에 표시 안 됨
- 어느 엣지가 몇 % 확률인지 시각적으로 알 수 없음

**필요:**
- Conditional 노드에서 나가는 각 엣지 위에 확률 표시
  - e.g., "성공 (90%)", "재시도 (10%)"

### 🟠 Flow 유효성 검증 없음
**설계상 검증 항목:**
- Start 노드 존재 여부
- End 노드 존재 여부
- Conditional 분기 확률 합 = 100%
- 연결되지 않은 고립 노드
- End 도달 불가능한 데드엔드 경로

**현재:**
- 시뮬레이션 시작 시 검증하지 않음
- 백엔드가 검증하는지 확인 필요

**필요:**
- Flow 저장 시 또는 시뮬레이션 시작 시 검증 팝업
- 에러 메시지: "Start 노드가 없습니다", "분기 확률 합이 100%가 아닙니다" 등

### 🟠 Simulation 상태 표시 미흡
**현재:**
- "시뮬레이션을 시작하면 메트릭이 표시됩니다" 안내만 있음
- 시뮬레이션 진행률 표시 없음

**필요:**
- 경과 시간 / 총 시간 (e.g., "00:12 / 01:00")
- 진행률 바 (Progress bar)
- 현재 상태: Running / Paused / Finished

### 🟠 KV Cache 설정 UI 미흡
**현재:**
- LLM Hub에서 Ref TTFT/TPOP만 입력
- KV cache 세부 설정 불가:
  - gpu_memory_utilization (0.0~1.0)
  - kv_block_size_tokens
  - kv_size_per_token_bytes
  - total_kv_blocks

**필요:**
- LLM Hub 서버 생성/편집 폼 확장
- "🔧 Advanced KV Cache Settings" 섹션
  - 각 파라미터 입력 필드

---

## 5️⃣ Backend 미확인 항목

아래 항목들은 Backend에서 구현되었으나 Frontend에서 사용되지 않음:

### 미사용 Backend Endpoints
1. ✅ `GET /api/flows/{flow_id}/export` - Flow JSON 다운로드
2. ✅ `POST /api/flows/{flow_id}/import` - Flow JSON 업로드
3. ✅ `GET /api/llm-hub/servers/export/all` - 서버 목록 내보내기
4. ✅ `POST /api/llm-hub/servers/import` - 서버 목록 가져오기
5. ✅ `GET /api/llm-hub/gpu-reference/download` - GPU 레퍼런스 다운로드
6. ✅ `POST /api/llm-hub/gpu-reference/upload` - GPU 레퍼런스 업로드

### 시뮬레이션 결과 다운로드
- ❌ JSON/CSV 다운로드 endpoint가 Backend에 없을 수 있음
- 확인 필요: `GET /api/simulation/history/{result_id}/download?format=json|csv`

---

## 6️⃣ 우선순위별 개선 로드맵

### Phase 1 (필수 - 다음 바로 구현)
1. ✅ Conditional 노드 Branches 편집 UI
   - 기존 branches 표시 + 추가/삭제 버튼
   - 각 branch의 확률(%) 입력 필드
   - 합계 확인 알림

2. ✅ Wave Arrival Pattern UI 완성
   - min_users, period_sec 입력 필드 추가
   - Ramp-up / Wave 선택에 따라 조건부 표시

3. ✅ Flow 유효성 검증
   - 시뮬레이션 시작 전 검증 로직
   - 에러 팝업 표시

### Phase 2 (중요)
1. 🎯 Simulation 결과 다운로드
   - JSON/CSV 내보내기 버튼
   - Backend endpoint 확인 및 구현

2. 🎯 Flow Import/Export UI
   - Flow Editor에 Import/Export 버튼
   - 파일 선택/저장 다이얼로그

3. 🎯 엣지 레이블 표시 (Conditional 분기 확률)
   - React Flow 레이블 컴포넌트 활용

### Phase 3 (개선)
1. GPU 레퍼런스 관리 UI
2. LLM Hub 서버 Import/Export
3. KV Cache 세부 설정 UI
4. Keyboard shortcuts (C, V, Del)
5. Parallel 노드 설정 UI 강화

---

## 📊 구현 현황 요약

| 항목 | 상태 | 중요도 | 난이도 |
|------|------|--------|--------|
| 코어 시뮬레이션 엔진 | ✅ 완료 | 🔴 필수 | ⭐⭐⭐ |
| Flow Editor 기본 | ✅ 완료 | 🔴 필수 | ⭐⭐⭐ |
| Simulation Panel | ✅ 완료 | 🔴 필수 | ⭐⭐⭐ |
| LLM Hub (기본) | ✅ 완료 | 🔴 필수 | ⭐⭐ |
| Compare View | ✅ 완료 | 🔴 필수 | ⭐⭐ |
| Conditional Branches 편집 | 🔄 부분 | 🟠 중요 | ⭐⭐ |
| Wave Pattern UI | 🔄 부분 | 🟠 중요 | ⭐ |
| 결과 다운로드 | ❌ 미구현 | 🟡 좋음 | ⭐⭐ |
| Flow Import/Export | ❌ 미구현 | 🟡 좋음 | ⭐ |
| GPU Reference UI | ❌ 미구현 | 🟡 좋음 | ⭐ |
| Keyboard Shortcuts | ❌ 미구현 | 🟢 선택 | ⭐ |

---

## 🎯 다음 단계

1. **즉시 (현재 세션):**
   - Conditional 노드 Branches 편집 UI 구현
   - Wave Pattern 파라미터 UI 추가
   - Flow 유효성 검증

2. **다음 세션:**
   - 시뮬레이션 결과 내보내기
   - Flow Import/Export UI
   - 엣지 레이블 표시

3. **추후 개선:**
   - 나머지 UX 개선 사항들

**현재 애플리케이션은 핵심 기능이 모두 작동하므로 이미 완전한 시뮬레이터로 사용 가능합니다.**
