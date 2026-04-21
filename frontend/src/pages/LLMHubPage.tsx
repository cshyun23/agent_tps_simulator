import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '../api/client'
import { useLLMHubStore, useToastStore } from '../store'
import type { LLMServer } from '../types'

export default function LLMHubPage() {
  const servers = useLLMHubStore(s => s.servers)
  const fetchServers = useLLMHubStore(s => s.fetchServers)
  const deleteServer = useLLMHubStore(s => s.deleteServer)
  const addToast = useToastStore(s => s.addToast)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LLMServer | null>(null)
  const [selectedServer, setSelectedServer] = useState<LLMServer | null>(null)
  const [gpuRef, setGpuRef] = useState<any>(null)
  const gpuFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchServers()
    api.llmHub.getGPUReference().then(ref => setGpuRef(ref))
  }, [])

  const handleDelete = async (id: string) => {
    if (confirm('서버를 삭제하시겠습니까?')) {
      try {
        await deleteServer(id)
        addToast('서버가 삭제되었습니다', 'success')
      } catch (err) {
        addToast('서버 삭제 실패', 'error')
      }
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

  const downloadGPURef = useCallback(async () => {
    if (!gpuRef) {
      addToast('GPU 레퍼런스를 찾을 수 없습니다', 'error')
      return
    }
    try {
      downloadFile(JSON.stringify(gpuRef, null, 2), 'gpu_reference.json', 'application/json')
      addToast('GPU 레퍼런스 다운로드 완료', 'success')
    } catch (err) {
      addToast('GPU 레퍼런스 다운로드 실패', 'error')
    }
  }, [gpuRef, downloadFile, addToast])

  const importGPURef = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        const formData = new FormData()
        formData.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }), 'gpu_reference.json')
        await api.llmHub.uploadGPUReference(formData)
        setGpuRef(data)
        addToast('GPU 레퍼런스가 가져와졌습니다', 'success')
      } catch (error) {
        console.error('Failed to import GPU reference:', error)
        addToast('GPU 레퍼런스 가져오기 실패', 'error')
      }
    }
    reader.readAsText(file)
    if (gpuFileRef.current) gpuFileRef.current.value = ''
  }, [addToast])

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left Panel */}
      <div style={{ flex: 1, padding: 16, overflow: 'auto', borderRight: '1px solid var(--border)' }}>
        <div style={{ marginBottom: 16 }}>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ 취소' : '+ 서버 추가'}
          </button>
        </div>

        {showForm && (
          <ServerForm
            editing={editing}
            onClose={() => {
              setShowForm(false)
              setEditing(null)
              fetchServers()
            }}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {servers.map(s => (
            <div
              key={s.server_id}
              className="card"
              onClick={() => setSelectedServer(s)}
              style={{
                cursor: 'pointer',
                background: selectedServer?.server_id === s.server_id ? 'var(--primary-light)' : 'var(--surface)',
                border: selectedServer?.server_id === s.server_id ? '2px solid var(--primary)' : '1px solid var(--border)',
                transition: 'all 0.2s',
                width: '220px',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                {s.model_name} ({s.model_params_b}B)
              </div>
              <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={{ color: 'var(--text2)' }}>GPU</div>
                  <div>{s.gpu_count}x {s.gpu_id}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text2)' }}>Max Concurrent</div>
                  <div>{s.kv_cache.max_concurrent_requests}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text2)' }}>TTFT (ref)</div>
                  <div>{s.perf_reference.ref_ttft_ms.toFixed(1)}ms</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text2)' }}>TPOP (ref)</div>
                  <div>{s.perf_reference.ref_tpop_ms.toFixed(2)}ms/tok</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn-sm btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(s)
                    setShowForm(true)
                  }}
                  style={{ flex: 1 }}
                >
                  ✏ 편집
                </button>
                <button
                  className="btn-sm btn-danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(s.server_id)
                  }}
                  style={{ flex: 1 }}
                >
                  🗑 삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>💾 GPU 레퍼런스</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
            GPU 종류: {gpuRef?.gpus?.length || 0}개
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-sm btn-ghost" onClick={downloadGPURef}>📤 Export</button>
            <button className="btn-sm btn-ghost" onClick={() => gpuFileRef.current?.click()}>📥 Import</button>
          </div>
        </div>

        <input
          ref={gpuFileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={importGPURef}
        />
      </div>

      {/* Right Panel - Server Details */}
      {selectedServer && (
        <div style={{ flex: 1, padding: 16, overflow: 'auto', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{selectedServer.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{selectedServer.model_name}</div>
            </div>
            <button className="btn-sm btn-ghost" onClick={() => setSelectedServer(null)}>✕</button>
          </div>
          <ServerDetailPanel server={selectedServer} />
        </div>
      )}
    </div>
  )
}

function ServerForm({ editing, onClose }: { editing?: LLMServer | null; onClose: () => void }) {
  const addToast = useToastStore(s => s.addToast)
  const defaultForm = useMemo(() => ({
    name: '',
    server_type: 'vllm' as const,
    model_name: 'Llama-3',
    model_params_b: 70,
    model_weights_gb: 140,
    gpu_id: 'h100-80g',
    gpu_count: 4,
    vram_gb: 80,
    kv_cache: {
      gpu_memory_utilization: 0.9,
      kv_block_size_tokens: 16,
      kv_size_per_token_bytes: 1024,
      total_kv_blocks: 3200,
      max_concurrent_requests: 128,
    },
    perf_reference: {
      ref_ttft_ms: 85,
      ref_input_tokens: 512,
      ref_tpop_ms: 18,
      ref_output_tokens: 128,
    },
    max_context_length: 8192,
    tensor_parallel: 4,
  }), [])
  const [form, setForm] = useState(editing || defaultForm)

  useEffect(() => {
    setForm(editing || defaultForm)
  }, [editing, defaultForm])

  const handleSubmit = async () => {
    try {
      if (editing) {
        await api.llmHub.updateServer(editing.server_id, form as Partial<LLMServer>)
        addToast('서버가 수정되었습니다', 'success')
      } else {
        await api.llmHub.createServer(form as Omit<LLMServer, 'server_id' | 'created_at'>)
        addToast('서버가 생성되었습니다', 'success')
      }
      onClose()
    } catch (err) {
      addToast(editing ? '서버 수정 실패' : '서버 생성 실패', 'error')
    }
  }

  const handleChange = (path: string, value: any) => {
    const keys = path.split('.')
    const newForm = JSON.parse(JSON.stringify(form))
    let obj = newForm
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]]
    }
    obj[keys[keys.length - 1]] = value
    setForm(newForm)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: '450px',
          height: '480px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className="modal-title">{editing ? '서버 편집' : '서버 생성'}</div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          <div className="form-row" style={{ marginBottom: '20px' }}>
            <label>이름</label>
            <input value={form.name} onChange={e => handleChange('name', e.target.value)} />
          </div>

        <div className="form-row-2" style={{ marginBottom: '20px' }}>
          <div>
            <label>모델</label>
            <input value={form.model_name} onChange={e => handleChange('model_name', e.target.value)} />
          </div>
          <div>
            <label>파라미터 (B)</label>
            <input
              type="number"
              value={form.model_params_b}
              onChange={e => handleChange('model_params_b', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="form-row-2" style={{ marginBottom: '20px' }}>
          <div>
            <label>GPU 종류</label>
            <input value={form.gpu_id} onChange={e => handleChange('gpu_id', e.target.value)} />
          </div>
          <div>
            <label>GPU 개수</label>
            <GPUCountInput
              value={form.gpu_count}
              onChange={e => handleChange('gpu_count', parseInt(e.target.value))}
              modelParams={form.model_params_b}
              vramPerGpu={80}
            />
          </div>
        </div>

        <div className="form-row-2" style={{ marginBottom: '20px' }}>
          <div>
            <label>Ref TTFT (ms) <span style={{ fontSize: 10, color: 'var(--text2)' }}>1024 tokens 기준</span></label>
            <input
              type="number"
              value={form.perf_reference.ref_ttft_ms}
              onChange={e => handleChange('perf_reference.ref_ttft_ms', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label>Ref TPOP (ms/tok)</label>
            <input
              type="number"
              step="0.1"
              value={form.perf_reference.ref_tpop_ms}
              onChange={e => handleChange('perf_reference.ref_tpop_ms', parseFloat(e.target.value))}
            />
          </div>
        </div>
        </div>

        {!canLoadModel(form.model_params_b, form.gpu_count, 80) && (
          <div style={{
            padding: '10px 12px',
            background: '#fee2e2',
            borderTop: '1px solid #fca5a5',
            fontSize: 12,
            color: '#991b1b',
            fontWeight: 500
          }}>
            ⚠️ 메모리 부족: {(form.model_params_b * 2).toFixed(0)}GB 필요 / {form.gpu_count * 80}GB 보유
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>
            취소
          </button>
          <button className="btn-primary" onClick={handleSubmit}>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Server Detail Panel with Latency Graph ──

function ServerDetailPanel({ server }: { server: LLMServer }) {
  const [inputTokens, setInputTokens] = useState(server.perf_reference.ref_input_tokens)
  const [outputTokens, setOutputTokens] = useState(server.perf_reference.ref_output_tokens)

  const maxConcurrent = server.kv_cache.max_concurrent_requests


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Server Info Grid */}
      <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>서버 정보</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
          <div>
            <div style={{ color: 'var(--text2)' }}>모델</div>
            <div style={{ fontWeight: 500 }}>{server.model_name}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text2)' }}>파라미터</div>
            <div style={{ fontWeight: 500 }}>{server.model_params_b}B</div>
          </div>
          <div>
            <div style={{ color: 'var(--text2)' }}>GPU</div>
            <div style={{ fontWeight: 500 }}>{server.gpu_count}x {server.gpu_id}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text2)' }}>Max Concurrent</div>
            <div style={{ fontWeight: 500 }}>{maxConcurrent}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text2)' }}>Ref TTFT <span style={{ fontSize: 10, color: 'var(--text3)' }}>(1024 tokens)</span></div>
            <div style={{ fontWeight: 500 }}>{server.perf_reference.ref_ttft_ms.toFixed(1)}ms</div>
          </div>
          <div>
            <div style={{ color: 'var(--text2)' }}>Ref TPOP</div>
            <div style={{ fontWeight: 500 }}>{server.perf_reference.ref_tpop_ms.toFixed(2)}ms/tok</div>
          </div>
        </div>
      </div>

      {/* Input & Output Token Values */}
      <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>🔧 파라미터</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
              Input Tokens
            </label>
            <input
              type="number"
              value={inputTokens}
              onChange={e => setInputTokens(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 12,
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
              Output Tokens
            </label>
            <input
              type="number"
              value={outputTokens}
              onChange={e => setOutputTokens(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 12,
              }}
            />
          </div>
        </div>
      </div>

      {/* Graph 1: Input Tokens vs TTFT & Latency */}
      <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text2)' }}>
          📈 Input Tokens vs TTFT & Latency
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8 }}>
          고정값: Output Tokens = {outputTokens}, TPOP = {server.perf_reference.ref_tpop_ms.toFixed(2)}ms/tok
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={useMemo(() => {
              const data = []
              for (let i = 128; i <= 4096; i += 256) {
                const ttft = (server.perf_reference.ref_ttft_ms / 1024) * i
                const e2e = ttft + (outputTokens * server.perf_reference.ref_tpop_ms)
                data.push({ inputTokens: i, ttft: ttft.toFixed(1), e2eLatency: e2e.toFixed(1) })
              }
              return data
            }, [outputTokens, server])}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="inputTokens" stroke="var(--text2)" />
            <YAxis stroke="var(--text2)" label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              formatter={(val) => (typeof val === 'number' ? val.toFixed(1) : val)}
            />
            <Legend />
            <Line type="monotone" dataKey="ttft" stroke="#60a5fa" name="TTFT" isAnimationActive={false} dot={false} />
            <Line type="monotone" dataKey="e2eLatency" stroke="var(--primary)" name="E2E Latency" isAnimationActive={false} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Graph 2: Output Tokens vs Latency */}
      <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text2)' }}>
          📈 Output Tokens vs Latency
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8 }}>
          고정값: Input Tokens = {inputTokens}, TTFT = {server.perf_reference.ref_ttft_ms.toFixed(1)}ms (1024 tokens 기준)
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={useMemo(() => {
              const baseTTFT = (server.perf_reference.ref_ttft_ms / 1024) * inputTokens
              const data = []
              for (let i = 1; i <= 512; i += 32) {
                const e2e = baseTTFT + (i * server.perf_reference.ref_tpop_ms)
                data.push({ outputTokens: i, e2eLatency: e2e.toFixed(1) })
              }
              return data
            }, [inputTokens, server])}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="outputTokens" stroke="var(--text2)" />
            <YAxis stroke="var(--text2)" label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              formatter={(val) => (typeof val === 'number' ? val.toFixed(1) : val)}
            />
            <Legend />
            <Line type="monotone" dataKey="e2eLatency" stroke="var(--primary)" name="E2E Latency" isAnimationActive={false} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Notes */}
      <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 'var(--radius)', fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text2)' }}>💡 참고</div>
        <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--text2)', lineHeight: '1.6' }}>
          <li>Base Latency = TTFT + (Output Tokens × TPOP)</li>
          <li>Queueing Delay는 M/M/c Queue Model 기반 (Erlang C Formula)</li>
          <li>Model Weight는 FP16 기준 (2 bytes/parameter)</li>
        </ul>
      </div>
    </div>
  )
}

// ── Memory Utilities ──

function calculateModelWeightGB(modelParamsB: number): number {
  // FP16: 2 bytes per parameter
  return modelParamsB * 2
}

function canLoadModel(modelParamsB: number, gpuCount: number, vramPerGpuGB: number): boolean {
  const modelWeightGB = calculateModelWeightGB(modelParamsB)
  const totalVramGB = gpuCount * vramPerGpuGB
  return modelWeightGB <= totalVramGB
}



// GPU Count Input with Memory Validation
function GPUCountInput({
  value,
  onChange,
  modelParams,
  vramPerGpu,
}: {
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  modelParams: number
  vramPerGpu: number
}) {
  const modelWeightGB = calculateModelWeightGB(modelParams)
  const totalVramGB = value * vramPerGpu
  const canLoad = canLoadModel(modelParams, value, vramPerGpu)

  return (
    <input
      type="number"
      value={value}
      onChange={onChange}
      data-error={!canLoad}
      data-model-weight={modelWeightGB.toFixed(0)}
      data-total-vram={totalVramGB}
      style={{
        borderColor: !canLoad ? '#ef4444' : undefined,
        borderWidth: !canLoad ? '2px' : undefined,
      }}
    />
  )
}
