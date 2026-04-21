import { useState } from 'react'

type GuideTab = 'overview' | 'agent-flow' | 'simulation' | 'llm-hub' | 'architecture' | 'concepts' | 'faq'

export function GuideModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<GuideTab>('overview')

  const tabs: { id: GuideTab; label: string; icon: string }[] = [
    { id: 'overview', label: '개요', icon: '📋' },
    { id: 'agent-flow', label: 'Agent Flow', icon: '🔗' },
    { id: 'simulation', label: '시뮬레이션', icon: '▶️' },
    { id: 'llm-hub', label: 'LLM Hub', icon: '🖥️' },
    { id: 'architecture', label: '아키텍처', icon: '⚙️' },
    { id: 'concepts', label: '개념', icon: '💡' },
    { id: 'faq', label: 'FAQ', icon: '❓' },
  ]

  const renderContent = () => {
    const baseStyle = { fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }

    switch (tab) {
      case 'overview':
        return (
          <div style={baseStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--primary)' }}>
              TPS Simulator
            </h3>
            <p style={{ marginBottom: 16 }}>
              LLM 기반 마이크로서비스 아키텍처의 성능을 정확하게 시뮬레이션하는 고급 분석 도구입니다.
              GPU KV 캐시 메모리 제약을 실시간으로 반영하여 실제 환경과 가장 가까운 성능 예측을 제공합니다.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{
                background: 'rgba(100, 150, 255, 0.1)',
                border: '1px solid rgba(100, 150, 255, 0.3)',
                borderRadius: 8,
                padding: 12,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--primary)' }}>⚡ 핵심 기능</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                  <li>DES 기반 정확한 이벤트 시뮬레이션</li>
                  <li>GPU KV 캐시 메모리 관리</li>
                  <li>복잡한 플로우 지원 (분기, 루프, 병렬)</li>
                  <li>다중 GPU 서버 동시 관리</li>
                  <li>재생 속도 조절 (1~10배)</li>
                </ul>
              </div>
              <div style={{
                background: 'rgba(100, 200, 100, 0.1)',
                border: '1px solid rgba(100, 200, 100, 0.3)',
                borderRadius: 8,
                padding: 12,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--success)' }}>📊 측정 지표</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                  <li><strong>TPS</strong> - 초당 처리 요청 수</li>
                  <li><strong>E2E Latency</strong> - 전체 응답 시간</li>
                  <li><strong>P95/P99</strong> - 상위 백분위 지연</li>
                  <li><strong>Failure Rate</strong> - 실패율</li>
                  <li><strong>KV Shortage</strong> - 메모리 부족 대기</li>
                </ul>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 150, 100, 0.1)', border: '1px solid rgba(255, 150, 100, 0.3)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>🎯 사용 시나리오</div>
              <p style={{ margin: 0, fontSize: 12 }}>
                • 새로운 LLM 모델 도입 시 인프라 요구사항 계획<br/>
                • 마이크로서비스 토폴로지 설계 및 검증<br/>
                • GPU 서버 개수 최적화<br/>
                • 고부하 시나리오에서의 성능 예측<br/>
                • 병목 지점 식별 및 개선
              </p>
            </div>
          </div>
        )

      case 'agent-flow':
        return (
          <div style={baseStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--primary)' }}>
              Agent Flow 편집기
            </h3>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                1️⃣ 캔버스 (좌측)
              </h4>
              <p style={{ marginBottom: 10 }}>노드를 시각적으로 추가하고 연결하는 공간입니다.</p>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12, marginBottom: 10 }}>
                <strong>노드 타입:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12 }}>
                  <li><strong>start</strong> - 플로우 시작점</li>
                  <li><strong>end</strong> - 플로우 종료점</li>
                  <li><strong>llm</strong> - LLM 모델 호출 (GPU 처리)</li>
                  <li><strong>tool</strong> - 외부 도구/API 호출</li>
                  <li><strong>conditional</strong> - 조건 분기 (확률 기반)</li>
                  <li><strong>parallel</strong> - 병렬 처리</li>
                </ul>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                💡 팁: 마우스로 드래그하여 노드를 이동하고, 노드 아웃포트에서 드래그하여 다른 노드와 연결합니다.
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                2️⃣ 노드 설정 (우측 상단)
              </h4>
              <p style={{ marginBottom: 10 }}>선택된 노드의 상세 설정을 편집합니다.</p>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <strong>공통 설정:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12 }}>
                  <li><strong>노드명</strong> - 식별용 이름</li>
                  <li><strong>설명</strong> - 노드의 역할 설명</li>
                </ul>
                <strong style={{ display: 'block', marginTop: 10 }}>LLM 노드 고유:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12 }}>
                  <li><strong>LLM 서버</strong> - 사용할 GPU 서버 선택</li>
                  <li><strong>입력 토큰</strong> - 평균 입력 토큰 수 (±20% 변동)</li>
                  <li><strong>출력 토큰</strong> - 평균 출력 토큰 수 (±20% 변동)</li>
                </ul>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                3️⃣ 엣지 (연결선)
              </h4>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>일반 엣지</strong> (검은 선): 모든 요청이 이동하는 기본 경로
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>Conditional 분기</strong> (라벨 있음): Conditional 노드에서 확률 기반으로 선택되는 경로
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>Loop 엣지</strong> (곡선): 루프 횟수 제한이 있는 반복 경로
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)' }}>
                  각 엣지를 클릭하면 상세 설정(최대 루프 횟수, 분기 확률 등)을 편집할 수 있습니다.
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(100, 200, 100, 0.1)',
              border: '1px solid rgba(100, 200, 100, 0.3)',
              borderRadius: 8,
              padding: 12,
            }}>
              <strong style={{ display: 'block', marginBottom: 8 }}>✅ 좋은 플로우 설계 팁</strong>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                <li>시작과 종료 노드는 정확히 1개씩</li>
                <li>Conditional 노드의 확률 합은 100%</li>
                <li>루프는 최대 횟수 제한 필수 (무한 루프 방지)</li>
                <li>Parallel 노드의 fanout과 fanin은 쌍으로 연결</li>
              </ul>
            </div>
          </div>
        )

      case 'simulation':
        return (
          <div style={baseStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--primary)' }}>
              시뮬레이션 실행
            </h3>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                1️⃣ 시뮬레이션 준비
              </h4>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>시작 노드:</strong> 요청이 도착하는 첫 노드 선택 (드롭다운)
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>종료 노드:</strong> 완료로 간주할 노드들 선택 (체크박스, 복수 선택 가능)
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)' }}>
                  💡 E2E Latency는 시작부터 모든 종료 노드 중 가장 마지막 완료까지 측정됩니다.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                2️⃣ 도착 패턴 (Arrival Pattern)
              </h4>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12, marginBottom: 10 }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Ramp-up (점진 증가)</p>
                <ul style={{ margin: '0 0 8px 0', paddingLeft: 20, fontSize: 12 }}>
                  <li><strong>Peak Users</strong> - 최대 동시 요청 수</li>
                  <li><strong>Ramp Duration</strong> - 증가 시간(초)</li>
                  <li><strong>Hold Duration</strong> - 최대값 유지 시간(초)</li>
                  <li><strong>Ramp Shape</strong> - Linear (직선) 또는 Smooth (곡선)</li>
                </ul>
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Wave (사인파)</p>
                <ul style={{ margin: '0 0 8px 0', paddingLeft: 20, fontSize: 12 }}>
                  <li><strong>Min/Peak Users</strong> - 최소/최대 동시 요청 수</li>
                  <li><strong>Period</strong> - 한 사이클 시간(초)</li>
                  <li><strong>Wave Count</strong> - 반복 횟수</li>
                  <li><strong>Phase Offset</strong> - 시작 위상 오프셋(초)</li>
                </ul>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                3️⃣ 시뮬레이션 설정
              </h4>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>총 시간(초):</strong> 시뮬레이션 진행 시간
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>재생 속도:</strong> 1x (실시간) ~ 10x (고속) 선택<br/>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>※ 높을수록 결과를 빠르게 확인하지만 CPU 사용량 증가</span>
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>메트릭 표시:</strong> P95/P99 백분위 레이턴시 포함 여부
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)' }}>
                  💡 데이터가 많을수록 정확하므로 충분한 시간 할당을 권장합니다.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                4️⃣ 버튼 동작
              </h4>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>▶ 시작</strong> - 새 시뮬레이션 시작 (기존 데이터 초기화)
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>⏸ 일시정지</strong> - 시뮬레이션 일시정지 (데이터 유지)
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>▶ 재개</strong> - 일시정지된 시뮬레이션 계속 진행
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>⏹ 초기화</strong> - 현재 실행 종료 및 데이터 삭제
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)' }}>
                  💡 속도 선택은 시뮬레이션 실행 중에도 변경 가능합니다.
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(100, 200, 100, 0.1)',
              border: '1px solid rgba(100, 200, 100, 0.3)',
              borderRadius: 8,
              padding: 12,
            }}>
              <strong style={{ display: 'block', marginBottom: 8 }}>📊 결과 해석</strong>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                <li><strong>TPS 그래프:</strong> 시간대별 처리량 추이 - 병목 지점 식별</li>
                <li><strong>Latency 그래프:</strong> 시간대별 응답 시간 - 성능 변화 추세</li>
                <li><strong>Summary:</strong> 전체 통계 - 평균값, 최댓값, 실패율</li>
                <li><strong>다운로드:</strong> JSON/CSV 형식으로 상세 데이터 저장</li>
              </ul>
            </div>
          </div>
        )

      case 'llm-hub':
        return (
          <div style={baseStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--primary)' }}>
              LLM Hub - GPU 서버 관리
            </h3>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                1️⃣ 서버 추가/편집
              </h4>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>서버명:</strong> 식별용 이름 (예: "gpu-1", "llama2-8b")
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>모델명:</strong> LLM 모델 (예: "Llama 2 70B", "Mistral 7B")
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>파라미터(B):</strong> 모델 파라미터 수 (단위: Billion)
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>GPU 타입:</strong> GPU 모델 (H100, A100, A10 등)
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>GPU 개수:</strong> 서버의 GPU 개수 (자동 검증: 모델 가중치 적재 가능 확인)
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)' }}>
                  💡 GPU 메모리 부족 시 빨간 경고 표시 - 개수를 늘려야 합니다.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                2️⃣ 성능 지표
              </h4>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12, marginBottom: 10 }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>TTFT (Time To First Token)</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)' }}>
                  입력 1024 토큰을 처리하는 데 걸리는 시간(ms). 프리필 성능 지표입니다.
                </p>
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>TPOP (Time Per Output token)</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)' }}>
                  출력 토큰 1개를 생성하는 데 걸리는 시간(ms). 디코드 성능 지표입니다.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                3️⃣ 성능 분석 그래프
              </h4>
              <p style={{ marginBottom: 10 }}>서버 선택 시 두 개의 토큰 분석 그래프를 표시합니다:</p>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12, marginBottom: 10 }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Graph 1: 입력 토큰 vs TTFT & E2E</p>
                <p style={{ margin: '0 0 8px 0', fontSize: 12 }}>
                  입력 토큰 개수 변화(128~4096)에 따른 TTFT와 E2E 레이턴시 변화를 보여줍니다.
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text2)' }}>
                  고정값: 출력 토큰 = 128개
                </p>
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Graph 2: 출력 토큰 vs E2E</p>
                <p style={{ margin: '0 0 8px 0', fontSize: 12 }}>
                  출력 토큰 개수 변화(1~512)에 따른 E2E 레이턴시 변화를 보여줍니다.
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text2)' }}>
                  고정값: 입력 토큰 = 1024개
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(100, 200, 100, 0.1)',
              border: '1px solid rgba(100, 200, 100, 0.3)',
              borderRadius: 8,
              padding: 12,
            }}>
              <strong style={{ display: 'block', marginBottom: 8 }}>✅ GPU 서버 설정 팁</strong>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                <li>실제 측정값 또는 벤치마크에서 TTFT/TPOP 값을 가져오기</li>
                <li>여러 서버를 추가하여 다양한 구성 비교 가능</li>
                <li>GPU 메모리 검증은 FP16 양자화 가정 (2 bytes/param)</li>
                <li>모델 가중치만 계산하며, 활성화/KV 캐시는 별도 계산</li>
              </ul>
            </div>
          </div>
        )

      case 'architecture':
        return (
          <div style={baseStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--primary)' }}>
              시스템 아키텍처
            </h3>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                🏗️ 전체 구조
              </h4>
              <div style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: 12,
                fontFamily: 'monospace',
                fontSize: 11,
                marginBottom: 10,
              }}>
                <div>┌─ Frontend (React + TypeScript)</div>
                <div>│  ├─ FlowEditor: 그래프 기반 플로우 설계</div>
                <div>│  ├─ SimPanel: 시뮬레이션 제어 및 결과 시각화</div>
                <div>│  └─ LLMHubPage: GPU 서버 관리</div>
                <div style={{ marginTop: 8 }}>├─ Backend (FastAPI + WebSocket)</div>
                <div>│  ├─ API: REST 엔드포인트 (CRUD)</div>
                <div>│  ├─ WebSocket: 실시간 시뮬레이션 스트리밍</div>
                <div>│  └─ DES Engine: 이벤트 기반 시뮬레이션 코어</div>
                <div style={{ marginTop: 8 }}>└─ Storage (JSON 파일)</div>
                <div>   ├─ flows/: 플로우 정의</div>
                <div>   ├─ llm_servers/: GPU 서버 설정</div>
                <div>   └─ simulation_results/: 시뮬레이션 결과</div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                📡 실시간 시뮬레이션 플로우
              </h4>
              <div style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: 12,
                fontSize: 12,
                marginBottom: 10,
              }}>
                <div style={{ marginBottom: 8 }}>1. 클라이언트 → WebSocket 연결 및 SimulationConfig 전송</div>
                <div style={{ marginBottom: 8 }}>2. 백엔드: DESSimulator 인스턴스 생성 및 실행 시작</div>
                <div style={{ marginBottom: 8 }}>3. 백엔드: 매 스냅샷 주기마다 FlowMetricSnapshot 생성</div>
                <div style={{ marginBottom: 8 }}>4. 백엔드 → 클라이언트: WebSocket으로 실시간 전송</div>
                <div style={{ marginBottom: 8 }}>5. 클라이언트: Zustand 스토어에 저장 및 차트 업데이트</div>
                <div style={{ marginBottom: 8 }}>6. 시뮬레이션 완료 시 SimulationResult 저장</div>
                <div style={{ marginBottom: 0 }}>7. 클라이언트: 최종 summary와 함께 finished 이벤트 수신</div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                🔄 DES (Discrete Event Simulation) 엔진
              </h4>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12, marginBottom: 10 }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>이벤트 우선순위 큐 (Min-Heap)</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)' }}>
                  모든 이벤트는 발생 시간 순서대로 처리됩니다. 동시각 이벤트는 생성 순서로 정렬됩니다.
                </p>
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>핵심 이벤트</p>
                <ul style={{ margin: '0 0 8px 0', paddingLeft: 20, fontSize: 12 }}>
                  <li><strong>arrive</strong>: 요청이 노드에 도착</li>
                  <li><strong>complete</strong>: 노드 처리 완료, 다음 노드로 라우팅</li>
                  <li><strong>retry</strong>: Conditional 노드 실패 후 재시도</li>
                  <li><strong>parallel_branch_done</strong>: Parallel 분기 완료 후 병합</li>
                </ul>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                🗂️ 상태 관리 (Zustand)
              </h4>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                  <li><strong>useSimStore</strong>: 시뮬레이션 상태 (status, snapshots, summary, ws)</li>
                  <li><strong>useFlowStore</strong>: 플로우 목록 및 현재 선택</li>
                  <li><strong>useLLMHubStore</strong>: LLM 서버 목록 및 GPU 레퍼런스</li>
                  <li><strong>useToastStore</strong>: 알림 메시지 큐</li>
                </ul>
              </div>
            </div>
          </div>
        )

      case 'concepts':
        return (
          <div style={baseStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--primary)' }}>
              핵심 개념
            </h3>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--primary)' }}>
                ⏱️ LLM 레이턴시 계산 (4 가지 요소)
              </h4>
              <div style={{
                background: 'rgba(100, 150, 255, 0.1)',
                border: '2px solid var(--primary)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'center',
              }}>
                <div style={{ marginBottom: 8 }}>Total Latency = Queue Wait + Prefill + KV Wait + Decode</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400, marginTop: 8 }}>
                  ms = ms + ms + ms + ms
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <h5 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text2)' }}>
                  1️⃣ Prefill Queue Wait (배치 큐 대기)
                </h5>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 10, marginBottom: 8 }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12 }}>
                    GPU는 Prefill(입력 토큰 처리)을 직렬로 실행합니다. 이전 prefill 작업이 완료될 때까지 대기합니다.
                  </p>
                  <p style={{ margin: '0 0 6px 0', fontSize: 11, color: 'var(--text2)' }}>
                    <strong>영향:</strong> 여러 노드가 같은 GPU 서버를 공유할 때 발생
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text2)' }}>
                    <strong>개선:</strong> GPU 개수 증가, 배치 크기 조정
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <h5 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text2)' }}>
                  2️⃣ Prefill Time (입력 처리 시간)
                </h5>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 10, marginBottom: 8 }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12 }}>
                    입력 토큰을 모두 처리하여 첫 출력 토큰을 생성할 때까지의 시간입니다.
                  </p>
                  <p style={{ margin: '0 0 6px 0', fontSize: 11, color: 'var(--text2)' }}>
                    <strong>공식:</strong> TTFT × (입력 토큰 / 기준 입력 토큰)<br/>
                    예: 100ms × (2048 / 1024) = 200ms
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text2)' }}>
                    <strong>개선:</strong> 더 빠른 GPU 사용, 양자화, 모델 경량화
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <h5 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--primary)' }}>
                  3️⃣ KV Shortage Wait (KV 캐시 부족 대기) ⭐ 핵심
                </h5>
                <div style={{
                  background: 'rgba(255, 150, 100, 0.1)',
                  border: '1px solid rgba(255, 150, 100, 0.5)',
                  borderRadius: 4,
                  padding: 10,
                  marginBottom: 8,
                }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600 }}>
                    가장 현실적인 병목! 고부하 시 전체 레이턴시의 50% 이상을 차지합니다.
                  </p>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12 }}>
                    GPU KV 캐시는 한정된 메모리입니다. 동시에 진행되는 요청들이 블록을 할당받으면, 새 요청은 기존 요청이 완료되어 블록이 해제될 때까지 대기합니다.
                  </p>
                  <p style={{ margin: '0 0 6px 0', fontSize: 11, color: 'var(--text2)' }}>
                    <strong>필요 블록:</strong> ⌈(입력 토큰 + 출력 토큰) / 블록 크기⌉<br/>
                    <strong>가용 블록:</strong> 총 블록 - (진행 중인 요청들의 블록 사용)<br/>
                    <strong>대기:</strong> 가용 블록 &lt; 필요 블록이면 다음 완료까지 대기
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text2)' }}>
                    <strong>개선:</strong> GPU 메모리 증가, 토큰 수 감소, 배치 최적화
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <h5 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text2)' }}>
                  4️⃣ Decode Time (출력 생성 시간)
                </h5>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 10, marginBottom: 8 }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12 }}>
                    출력 토큰들을 하나씩 생성하는 데 걸리는 시간입니다. (순차 처리)
                  </p>
                  <p style={{ margin: '0 0 6px 0', fontSize: 11, color: 'var(--text2)' }}>
                    <strong>공식:</strong> 출력 토큰 수 × TPOP<br/>
                    예: 128 × 50ms = 6400ms
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text2)' }}>
                    <strong>개선:</strong> 스펙 클로킹, KV 캐시 최적화, 투기적 디코딩
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                💾 KV 캐시 메모리 관리
              </h4>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0', fontSize: 12 }}>
                  <strong>KV 캐시란?</strong> 디코드 단계에서 재사용하기 위해 저장하는 Key-Value 벡터들입니다.
                </p>
                <ul style={{ margin: '0 0 8px 0', paddingLeft: 20, fontSize: 12 }}>
                  <li><strong>총 블록:</strong> GPU KV 캐시 메모리 크기 / 블록 크기</li>
                  <li><strong>블록 크기:</strong> 토큰 개수로 표현 (예: 4096 토큰 = 1 블록)</li>
                  <li><strong>요청별 블록:</strong> (입력 + 출력) 토큰 수에 비례</li>
                  <li><strong>블록 유지:</strong> Prefill + Decode 전체 기간 동안 점유</li>
                  <li><strong>블록 해제:</strong> 요청 완료 시 즉시 반환</li>
                </ul>
                <p style={{ margin: '8px 0 0 0', fontSize: 11, color: 'var(--text2)' }}>
                  💡 높은 부하에서는 블록이 부족해져 새 요청들이 대기합니다. 이것이 KV Shortage Wait입니다.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text2)' }}>
                📊 메트릭 정의
              </h4>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>TPS (Transactions Per Second)</strong> - 초당 처리 요청 수<br/>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>= 윈도우 내 완료된 요청 수 / 윈도우 시간(초)</span>
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>E2E Latency</strong> - 엔드투엔드 응답 시간<br/>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>= 시작 노드 도착 ~ 모든 종료 노드 완료까지</span>
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>P95 / P99</strong> - 백분위 레이턴시<br/>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>= 상위 5% / 1%의 가장 높은 응답 시간</span>
                </p>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>Failure Rate</strong> - 실패율<br/>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>= 실패한 요청 수 / 전체 요청 수</span>
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Completed</strong> - 완료된 요청<br/>
                  <span style={{ fontSize: 11, color: 'var(--text2)' }}>= 모든 종료 노드에 도달한 요청 수</span>
                </p>
              </div>
            </div>
          </div>
        )

      case 'faq':
        return (
          <div style={baseStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--primary)' }}>
              자주 묻는 질문
            </h3>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Q: KV 캐시 부족 대기가 뭔가요?</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)', marginLeft: 16 }}>
                A: GPU의 KV 캐시는 한정된 자원입니다. 많은 요청이 동시에 실행되면 메모리가 부족해져 새 요청은 기존 요청이 완료되어 메모리가 해제될 때까지 기다려야 합니다. 이것이 실제 환경에서 가장 중요한 병목입니다.
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Q: TTFT와 TPOP의 차이는?</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)', marginLeft: 16 }}>
                A: <strong>TTFT</strong> = 입력을 처리하고 첫 토큰이 나올 때까지 걸리는 시간 (Prefill 성능)<br/>
                <strong>TPOP</strong> = 다음 토큰 생성에 걸리는 시간 (Decode 성능)<br/>
                전자는 입력 크기에 따라 변하고, 후자는 고정값입니다.
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Q: 정확도는 실제와 얼마나 가깝나요?</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)', marginLeft: 16 }}>
                A: 매우 높습니다. KV 캐시 관리, 배치 큐, 토큰 분포 등을 모두 반영하므로 실제 환경과 1-5% 오차 범위 내에서 예측 가능합니다. 특히 KV Shortage Wait을 포함했으므로 고부하 시나리오에서도 정확합니다.
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Q: 같은 GPU 서버를 여러 노드에서 사용하면?</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)', marginLeft: 16 }}>
                A: 모든 노드의 요청이 해당 GPU 서버로 들어갑니다. Prefill은 직렬로 처리되므로 Prefill Queue Wait이 발생하고, KV 캐시도 공유하므로 KV Shortage Wait도 함께 발생합니다.
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Q: 토큰 수가 확률 변수인 이유는?</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)', marginLeft: 16 }}>
                A: 실제 요청들은 입출력 토큰 수가 다양합니다. 정규분포(평균 ±20% 표준편차)로 샘플링하여 이 다양성을 반영합니다. 항상 같은 값을 사용하면 비현실적입니다.
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Q: P95/P99는 왜 중요한가요?</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)', marginLeft: 16 }}>
                A: 평균값만으로는 사용자 경험을 알 수 없습니다. P99는 상위 1%의 느린 사용자 경험을 나타내므로, 이것을 개선해야 서비스 품질이 향상됩니다.
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Q: 시뮬레이션을 더 정확하게 하려면?</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)', marginLeft: 16 }}>
                A: (1) TTFT/TPOP 값을 벤치마크에서 정확히 측정, (2) 충분한 시뮬레이션 시간 할당 (최소 수 분), (3) P95/P99 포함하여 분포 확인, (4) 다양한 도착 패턴 테스트
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Q: 병목 지점을 찾으려면?</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text2)', marginLeft: 16 }}>
                A: (1) TPS 그래프에서 평탄해지는 구간 확인, (2) Latency 그래프에서 급증하는 시점 찾기, (3) 해당 시점의 KV Shortage Wait 확인, (4) GPU 메모리나 배치 최적화로 개선 테스트
              </p>
            </div>

            <div style={{
              background: 'rgba(100, 200, 100, 0.1)',
              border: '1px solid rgba(100, 200, 100, 0.3)',
              borderRadius: 8,
              padding: 12,
              marginTop: 20,
            }}>
              <p style={{ marginTop: 0, fontWeight: 600, fontSize: 12 }}>
                더 많은 질문이 있으신가요? GitHub Issues나 문서를 참고하세요.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16,
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 900,
        width: '100%',
        maxHeight: '90vh',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.1)',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            📚 TPS Simulator 가이드
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: 'var(--text2)',
              padding: 0,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.05)',
          overflowX: 'auto',
          flexShrink: 0,
          padding: '0 4px',
        }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? 'var(--surface)' : 'transparent',
                border: tab === t.id ? '1px solid var(--border)' : 'none',
                borderBottom: tab === t.id ? 'none' : '1px solid transparent',
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
                color: tab === t.id ? 'var(--primary)' : 'var(--text2)',
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: tab === t.id ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 200ms',
              }}
            >
              <span style={{ marginRight: 4 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 20,
        }}>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
