import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'
import { useSimStore, useToastStore } from '../store'
import type { SimulationResult } from '../types'

export default function ComparePage() {
  const history = useSimStore(s => s.history)
  const fetchHistory = useSimStore(s => s.fetchHistory)
  const deleteHistory = useSimStore(s => s.deleteHistory)
  const addToast = useToastStore(s => s.addToast)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<SimulationResult[]>([])

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleToggle = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const handleCompare = async () => {
    try {
      const res = await Promise.all(Array.from(selected).map(id => api.simulation.getResult(id)))
      setResults(res)
      addToast(`${res.length}개 결과 비교 준비 완료`, 'success')
    } catch (err) {
      addToast('결과 로드 실패', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('이 시뮬레이션 결과를 삭제하시겠습니까?')) {
      try {
        await deleteHistory(id)
        setSelected(s => {
          const newSet = new Set(s)
          newSet.delete(id)
          return newSet
        })
        setResults(results => results.filter(r => r.result_id !== id))
        addToast('결과가 삭제되었습니다', 'success')
      } catch (err) {
        addToast('결과 삭제 실패', 'error')
      }
    }
  }

  const comparisonData = results.map(r => ({
    name: r.flow_name.substring(0, 10),
    completed: r.summary?.total_completed || 0,
    failed: r.summary?.total_failed || 0,
    e2e: r.summary?.e2e_avg_latency_ms.toFixed(0) || 0,
    peak_tps: r.summary?.peak_tps.toFixed(1) || 0,
    p95: r.summary?.e2e_p95_latency_ms?.toFixed(0) || 0,
    p99: r.summary?.e2e_p99_latency_ms?.toFixed(0) || 0,
  }))

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* History List */}
      <div style={{
        width: 250,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        overflow: 'auto',
        flexShrink: 0,
        padding: 12,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>시뮬레이션 히스토리</div>
        {history.map(h => (
          <div
            key={h.result_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 8,
              marginBottom: 8,
              background: 'var(--surface2)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(h.result_id)}
              onChange={() => handleToggle(h.result_id)}
              style={{ width: 16, height: 16 }}
              onClick={e => e.stopPropagation()}
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {h.flow_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                {new Date(h.started_at).toLocaleDateString()}
              </div>
            </div>
            <button
              className="btn-sm btn-danger"
              onClick={e => {
                e.stopPropagation()
                handleDelete(h.result_id)
              }}
              style={{ padding: '2px 6px', fontSize: 10 }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      {/* Comparison View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, overflow: 'auto' }}>
        <div style={{ marginBottom: 16 }}>
          <button
            className="btn-primary"
            onClick={handleCompare}
            disabled={selected.size === 0}
          >
            비교 ({selected.size} 선택)
          </button>
        </div>

        {results.length === 0 ? (
          <div style={{ color: 'var(--text2)', textAlign: 'center', marginTop: 40 }}>
            비교할 시뮬레이션을 선택하세요
          </div>
        ) : (
          <>
            {/* Summary Table */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>요약</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text2)' }}>Flow</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text2)' }}>Completed</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text2)' }}>Failed</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text2)' }}>E2E (ms)</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text2)' }}>Peak TPS</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text2)' }}>P95 (ms)</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text2)' }}>P99 (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px' }}>{row.name}</td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>{row.completed}</td>
                        <td style={{ textAlign: 'right', padding: '8px', color: row.failed > 0 ? 'var(--danger)' : 'inherit' }}>
                          {row.failed}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>{row.e2e}</td>
                        <td style={{ textAlign: 'right', padding: '8px', color: 'var(--success)' }}>{row.peak_tps}</td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>{row.p95}</td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>{row.p99}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>요청 처리</div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text2)" />
                    <YAxis stroke="var(--text2)" />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                    <Legend />
                    <Bar dataKey="completed" fill="var(--success)" name="Completed" />
                    <Bar dataKey="failed" fill="var(--danger)" name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>TPS 비교</div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text2)" />
                    <YAxis stroke="var(--text2)" />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                    <Legend />
                    <Bar dataKey="peak_tps" fill="var(--primary)" name="Peak TPS" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Latency 비교</div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text2)" />
                    <YAxis stroke="var(--text2)" />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                    <Legend />
                    <Bar dataKey="e2e" fill="var(--primary)" name="E2E" />
                    <Bar dataKey="p95" fill="var(--warning)" name="P95" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>백분위수</div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text2)" />
                    <YAxis stroke="var(--text2)" />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                    <Legend />
                    <Bar dataKey="p95" fill="var(--warning)" name="P95" />
                    <Bar dataKey="p99" fill="var(--danger)" name="P99" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
