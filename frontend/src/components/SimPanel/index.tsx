import { useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { createSimulationWS, api } from '../../api/client'
import { useSimStore, useToastStore } from '../../store'
import type { SimulationConfig, ArrivalPattern, RampUpPattern, WavePattern } from '../../types'

interface SimPanelProps {
  flow: any
  startNode: string
  endNodes: string[]
}

export function SimPanel({ flow, startNode, endNodes }: SimPanelProps) {
  const simStatus = useSimStore(s => s.status)
  const setStatus = useSimStore(s => s.setStatus)
  const snapshots = useSimStore(s => s.snapshots)
  const addSnapshot = useSimStore(s => s.addSnapshot)
  const clearSnapshots = useSimStore(s => s.clearSnapshots)
  const summary = useSimStore(s => s.summary)
  const setFinished = useSimStore(s => s.setFinished)
  const reset = useSimStore(s => s.reset)
  const addToast = useToastStore(s => s.addToast)

  const [arrival, setArrival] = useState<ArrivalPattern>({
    type: 'ramp_up',
    start_users: 0,
    peak_users: 100,
    ramp_duration_sec: 10,
    hold_duration_sec: 30,
    ramp_shape: 'linear',
  })
  const [duration, setDuration] = useState(60)
  const [speed, setSpeed] = useState<1 | 2 | 5 | 10>(1)
  const [showP95, setShowP95] = useState(true)
  const [showP99, setShowP99] = useState(false)
  const [resultId, setResultId] = useState<string | null>(null)

  const startSim = async () => {
    if (!startNode || endNodes.length === 0) {
      addToast('시작 노드와 종료 노드를 설정해주세요', 'error')
      return
    }

    const config: SimulationConfig = {
      flow_id: flow.flow_id,
      start_node_id: startNode,
      end_node_ids: endNodes,
      duration_sec: duration,
      playback_speed: speed,
      max_hops_per_request: 10,
      arrival_pattern: arrival,
      show_p95: showP95,
      show_p99: showP99,
    }

    try {
      clearSnapshots()
      setStatus('running')
      addToast('시뮬레이션 시작됨', 'info')

      const ws = createSimulationWS(
        config,
        snap => {
          addSnapshot(snap)
        },
        (_resultId, sum) => {
          setResultId(_resultId)
          setFinished(sum)
          setStatus('finished')
          addToast('시뮬레이션 완료', 'success')
        },
        msg => {
          console.error('Simulation error:', msg)
          addToast(`시뮬레이션 오류: ${msg}`, 'error')
          reset()
        }
      )

      useSimStore.setState({ ws })
    } catch (err) {
      addToast('시뮬레이션 시작 실패', 'error')
      reset()
    }
  }

  const stopSim = () => {
    reset()
    setStatus('idle')
  }

  const pauseSim = () => {
    const ws = useSimStore.getState().ws
    if (ws) {
      ws.close()
      useSimStore.setState({ ws: null })
    }
    setStatus(simStatus === 'paused' ? 'running' : 'paused')
  }

  const handlePlayPause = () => {
    if (simStatus === 'running') {
      pauseSim()
    } else if (simStatus === 'paused') {
      setStatus('running')
    } else {
      startSim()
    }
  }

  const downloadFile = useCallback((content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const downloadJSON = useCallback(async () => {
    if (!resultId) {
      addToast('결과를 찾을 수 없습니다', 'error')
      return
    }
    try {
      const result = await api.simulation.getResult(resultId)
      downloadFile(JSON.stringify(result, null, 2), `simulation_${resultId}.json`, 'application/json')
      addToast('JSON 파일 다운로드 완료', 'success')
    } catch (err) {
      addToast('JSON 다운로드 실패', 'error')
    }
  }, [resultId, downloadFile, addToast])

  const downloadCSV = useCallback(async () => {
    if (!resultId) {
      addToast('결과를 찾을 수 없습니다', 'error')
      return
    }
    try {
      const result = await api.simulation.getResult(resultId)
      const headers = ['sim_time_sec', 'overall_tps', 'e2e_avg_latency_ms', 'e2e_p95_latency_ms', 'e2e_p99_latency_ms', 'total_completed', 'total_failed']
      const rows = result.snapshots.map(s => [
        s.sim_time_sec.toFixed(1),
        s.overall_tps.toFixed(2),
        s.e2e_avg_latency_ms.toFixed(1),
        s.e2e_p95_latency_ms?.toFixed(1) || '',
        s.e2e_p99_latency_ms?.toFixed(1) || '',
        s.total_completed,
        s.total_failed,
      ])
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      downloadFile(csv, `simulation_${resultId}.csv`, 'text/csv')
      addToast('CSV 파일 다운로드 완료', 'success')
    } catch (err) {
      addToast('CSV 다운로드 실패', 'error')
    }
  }, [resultId, downloadFile, addToast])

  const chartData = snapshots.map(s => ({
    time: s.sim_time_sec.toFixed(1),
    tps: s.overall_tps.toFixed(1),
    e2e: s.e2e_avg_latency_ms.toFixed(0),
    p95: s.e2e_p95_latency_ms?.toFixed(0) || 0,
    p99: s.e2e_p99_latency_ms?.toFixed(0) || 0,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Controls */}
      <div style={{ padding: 12, background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            className={`btn-sm ${simStatus === 'running' ? 'btn-danger' : 'btn-success'}`}
            onClick={handlePlayPause}
            disabled={simStatus === 'finished' || !startNode}
          >
            {simStatus === 'idle' ? '▶ 시작' : simStatus === 'running' ? '⏸ 일시정지' : '▶ 재개'}
          </button>
          <button
            className="btn-sm btn-ghost"
            onClick={stopSim}
            disabled={simStatus === 'idle'}
          >
            ⏹ 초기화
          </button>
          <select
            value={speed}
            onChange={e => setSpeed(parseInt(e.target.value) as any)}
            disabled={simStatus === 'running'}
            style={{ flex: 1, maxWidth: 80 }}
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>
        </div>

        {/* Settings */}
        <div style={{ fontSize: 11, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>도착 패턴</label>
            <select
              value={arrival.type}
              onChange={e => {
                if (e.target.value === 'ramp_up') {
                  setArrival({
                    type: 'ramp_up',
                    start_users: 0,
                    peak_users: 100,
                    ramp_duration_sec: 10,
                    hold_duration_sec: 30,
                    ramp_shape: 'linear',
                  } as RampUpPattern)
                } else {
                  setArrival({
                    type: 'wave',
                    min_users: 10,
                    peak_users: 100,
                    period_sec: 20,
                    wave_count: 3,
                    phase_offset_sec: 0,
                  } as WavePattern)
                }
              }}
              disabled={simStatus === 'running'}
              style={{ fontSize: 12, width: '100%' }}
            >
              <option value="ramp_up">Ramp-up (점진 증가)</option>
              <option value="wave">Wave (사인파)</option>
            </select>
          </div>

          <div>
            <label>총 시간 (초)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value) || 60)}
              disabled={simStatus === 'running'}
              style={{ fontSize: 12 }}
            />
          </div>

          {arrival.type === 'ramp_up' ? (
            <>
              <div>
                <label>Peak Users</label>
                <input
                  type="number"
                  value={(arrival as RampUpPattern).peak_users}
                  onChange={e => setArrival({ ...arrival as RampUpPattern, peak_users: parseInt(e.target.value) || 0 })}
                  disabled={simStatus === 'running'}
                  style={{ fontSize: 12 }}
                />
              </div>
              <div>
                <label>Ramp Duration (초)</label>
                <input
                  type="number"
                  value={(arrival as RampUpPattern).ramp_duration_sec}
                  onChange={e => setArrival({ ...arrival as RampUpPattern, ramp_duration_sec: parseInt(e.target.value) || 0 })}
                  disabled={simStatus === 'running'}
                  style={{ fontSize: 12 }}
                />
              </div>
              <div>
                <label>Hold Duration (초)</label>
                <input
                  type="number"
                  value={(arrival as RampUpPattern).hold_duration_sec}
                  onChange={e => setArrival({ ...arrival as RampUpPattern, hold_duration_sec: parseInt(e.target.value) || 0 })}
                  disabled={simStatus === 'running'}
                  style={{ fontSize: 12 }}
                />
              </div>
              <div>
                <label>Ramp Shape</label>
                <select
                  value={(arrival as RampUpPattern).ramp_shape}
                  onChange={e => setArrival({ ...arrival as RampUpPattern, ramp_shape: e.target.value as any })}
                  disabled={simStatus === 'running'}
                  style={{ fontSize: 12 }}
                >
                  <option value="linear">Linear</option>
                  <option value="smooth">Smooth</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label>Min Users</label>
                <input
                  type="number"
                  value={(arrival as WavePattern).min_users}
                  onChange={e => setArrival({ ...arrival as WavePattern, min_users: parseInt(e.target.value) || 0 })}
                  disabled={simStatus === 'running'}
                  style={{ fontSize: 12 }}
                />
              </div>
              <div>
                <label>Peak Users</label>
                <input
                  type="number"
                  value={(arrival as WavePattern).peak_users}
                  onChange={e => setArrival({ ...arrival as WavePattern, peak_users: parseInt(e.target.value) || 0 })}
                  disabled={simStatus === 'running'}
                  style={{ fontSize: 12 }}
                />
              </div>
              <div>
                <label>Period (초)</label>
                <input
                  type="number"
                  value={(arrival as WavePattern).period_sec}
                  onChange={e => setArrival({ ...arrival as WavePattern, period_sec: parseInt(e.target.value) || 0 })}
                  disabled={simStatus === 'running'}
                  style={{ fontSize: 12 }}
                />
              </div>
            </>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={showP95}
                onChange={e => setShowP95(e.target.checked)}
              />
              P95 메트릭 표시
            </label>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={showP99}
                onChange={e => setShowP99(e.target.checked)}
              />
              P99 메트릭 표시
            </label>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ flex: 1, overflow: 'auto', display: chartData.length === 0 ? 'flex' : 'block', alignItems: 'center', justifyContent: 'center' }}>
        {chartData.length === 0 ? (
          <div style={{ color: 'var(--text2)', textAlign: 'center' }}>
            {simStatus === 'running' ? (
              <>
                <div style={{ fontSize: 18, marginBottom: 12 }}>⏳ 시뮬레이션 진행 중...</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>재생속도: {speed}x</div>
              </>
            ) : (
              '시뮬레이션을 시작하면 메트릭이 표시됩니다'
            )}
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" stroke="var(--text2)" />
                <YAxis stroke="var(--text2)" />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                <Legend />
                <Line type="monotone" dataKey="tps" stroke="var(--success)" name="TPS" />
                <Line type="monotone" dataKey="e2e" stroke="var(--primary)" name="E2E Latency (ms)" />
                {showP95 && <Line type="monotone" dataKey="p95" stroke="var(--warning)" name="P95 (ms)" />}
                {showP99 && <Line type="monotone" dataKey="p99" stroke="var(--danger)" name="P99 (ms)" />}
              </LineChart>
            </ResponsiveContainer>

            {summary && (
              <div style={{ padding: 12, borderTop: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>📊 요약</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ color: 'var(--text2)' }}>처리됨</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{summary.total_completed}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text2)' }}>실패</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)' }}>
                      {summary.total_failed} ({summary.failure_rate.toFixed(1)}%)
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text2)' }}>E2E Latency</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {summary.e2e_avg_latency_ms.toFixed(0)}ms
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text2)' }}>Peak TPS</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>
                      {summary.peak_tps.toFixed(1)}
                    </div>
                  </div>
                </div>
                {showP95 && summary.e2e_p95_latency_ms && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    P95: {summary.e2e_p95_latency_ms.toFixed(0)}ms
                    {showP99 && summary.e2e_p99_latency_ms && ` | P99: ${summary.e2e_p99_latency_ms.toFixed(0)}ms`}
                  </div>
                )}
                {resultId && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn-sm btn-ghost" onClick={downloadJSON}>📥 JSON</button>
                    <button className="btn-sm btn-ghost" onClick={downloadCSV}>📥 CSV</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
