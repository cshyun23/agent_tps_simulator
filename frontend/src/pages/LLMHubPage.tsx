import { useEffect, useState, useRef, useCallback } from 'react'
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
    <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
        {servers.map(s => (
          <div key={s.server_id} className="card">
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
                onClick={() => setEditing(s)}
                style={{ flex: 1 }}
              >
                ✏ 편집
              </button>
              <button
                className="btn-sm btn-danger"
                onClick={() => handleDelete(s.server_id)}
                style={{ flex: 1 }}
              >
                🗑 삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
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
  )
}

function ServerForm({ editing, onClose }: { editing?: LLMServer | null; onClose: () => void }) {
  const addToast = useToastStore(s => s.addToast)
  const defaultForm = {
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
  }
  const [form, setForm] = useState(editing || defaultForm)

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
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{editing ? '서버 편집' : '서버 생성'}</div>

        <div className="form-row">
          <label>이름</label>
          <input value={form.name} onChange={e => handleChange('name', e.target.value)} />
        </div>

        <div className="form-row-2">
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

        <div className="form-row-2">
          <div>
            <label>GPU 종류</label>
            <input value={form.gpu_id} onChange={e => handleChange('gpu_id', e.target.value)} />
          </div>
          <div>
            <label>GPU 개수</label>
            <input
              type="number"
              value={form.gpu_count}
              onChange={e => handleChange('gpu_count', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="form-row-2">
          <div>
            <label>Ref TTFT (ms)</label>
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
