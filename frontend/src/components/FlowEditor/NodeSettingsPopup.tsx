import { useLLMHubStore } from '../../store'
import type { FlowNode } from '../../types'

interface NodeSettingsPopupProps {
  node: FlowNode | null
  onSave: (node: FlowNode) => void
  onClose: () => void
}

export function NodeSettingsPopup({ node, onSave, onClose }: NodeSettingsPopupProps) {
  const servers = useLLMHubStore(s => s.servers)

  if (!node) return null

  const cfg = node.config || {}

  const handleChange = (path: string, value: any) => {
    const keys = path.split('.')
    const newConfig = JSON.parse(JSON.stringify(cfg))
    let obj = newConfig
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {}
      obj = obj[keys[i]]
    }
    obj[keys[keys.length - 1]] = value
    onSave({
      ...node,
      config: newConfig,
    })
  }

  const handleLabelChange = (label: string) => {
    onSave({ ...node, label })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: 380 }}>
        <div className="modal-title">{node.type} 노드 설정</div>

        <div className="form-row">
          <label>노드 이름</label>
          <input
            value={node.label}
            onChange={e => handleLabelChange(e.target.value)}
            placeholder="노드 이름"
          />
        </div>

        {node.type === 'llm' && (
          <>
            <div className="form-row">
              <label>LLM 서버</label>
              <select
                value={cfg.llm_server_id || ''}
                onChange={e => handleChange('llm_server_id', e.target.value || null)}
              >
                <option value="">선택 안 함 (폴백)</option>
                {servers.map(s => (
                  <option key={s.server_id} value={s.server_id}>
                    {s.name} ({s.model_name})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row-2">
              <div>
                <label>입력 토큰 (평균)</label>
                <input
                  type="number"
                  value={cfg.input_tokens || 512}
                  onChange={e => handleChange('input_tokens', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label>출력 토큰 (평균)</label>
                <input
                  type="number"
                  value={cfg.output_tokens || 128}
                  onChange={e => handleChange('output_tokens', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="form-row-2">
              <div>
                <label>폴백 지연 (ms)</label>
                <input
                  type="number"
                  value={cfg.fallback_latency_ms || 1000}
                  onChange={e => handleChange('fallback_latency_ms', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label>최대 동시 수</label>
                <input
                  type="number"
                  value={cfg.concurrency || 4}
                  onChange={e => handleChange('concurrency', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </>
        )}

        {node.type === 'tool' && (
          <div className="form-row">
            <label>처리 시간 (ms)</label>
            <input
              type="number"
              value={cfg.tool_latency_ms || 500}
              onChange={e => handleChange('tool_latency_ms', parseInt(e.target.value) || 0)}
            />
          </div>
        )}

        {node.type === 'conditional' && (
          <>
            <div className="form-row-2">
              <div>
                <label>실패율 (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={cfg.failure_rate || 0}
                  onChange={e => handleChange('failure_rate', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label>최대 재시도</label>
                <input
                  type="number"
                  value={cfg.max_retries || 2}
                  onChange={e => handleChange('max_retries', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="form-row">
              <label>재시도 대기 (ms)</label>
              <input
                type="number"
                value={cfg.retry_delay_ms || 500}
                onChange={e => handleChange('retry_delay_ms', parseInt(e.target.value) || 0)}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ margin: 0, fontWeight: 600 }}>분기 목록</label>
                <button
                  className="btn-sm btn-ghost"
                  onClick={() => {
                    const newBranches = [...(cfg.branches || []), { branch_name: '새 분기', target_node: '', probability: 0 }]
                    handleChange('branches', newBranches)
                  }}
                  style={{ padding: '2px 8px', fontSize: 12 }}
                >
                  + 추가
                </button>
              </div>

              {(!cfg.branches || cfg.branches.length === 0) ? (
                <div style={{ fontSize: 11, color: 'var(--text2)', padding: 8, background: 'var(--surface2)', borderRadius: 'var(--radius)' }}>
                  분기를 추가하세요
                </div>
              ) : (
                <>
                  {cfg.branches.map((br: any, i: number) => (
                    <div key={i} style={{ background: 'var(--surface2)', padding: 10, marginBottom: 8, borderRadius: 'var(--radius)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>분기 이름</div>
                          <input
                            type="text"
                            value={br.branch_name}
                            onChange={e => handleChange(`branches.${i}.branch_name`, e.target.value)}
                            style={{ fontSize: 11, width: '100%' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>확률 (%)</div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={br.probability}
                            onChange={e => handleChange(`branches.${i}.probability`, parseInt(e.target.value) || 0)}
                            style={{ fontSize: 11, width: '100%' }}
                          />
                        </div>
                        <button
                          className="btn-sm btn-danger"
                          onClick={() => {
                            const newBranches = (cfg.branches || []).filter((_: any, idx: number) => idx !== i)
                            handleChange('branches', newBranches)
                          }}
                          style={{ padding: '2px 6px', fontSize: 11, marginTop: 20 }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>
                        대상 노드: <input
                          type="text"
                          value={br.target_node}
                          onChange={e => handleChange(`branches.${i}.target_node`, e.target.value)}
                          placeholder="노드 ID"
                          style={{ fontSize: 11, width: '120px' }}
                        />
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, padding: 8, background: 'var(--surface2)', borderRadius: 'var(--radius)', color: cfg.branches.reduce((sum: number, b: any) => sum + (b.probability || 0), 0) === 100 ? 'var(--success)' : 'var(--danger)' }}>
                    확률 합계: {cfg.branches.reduce((sum: number, b: any) => sum + (b.probability || 0), 0)}%
                    {cfg.branches.reduce((sum: number, b: any) => sum + (b.probability || 0), 0) !== 100 && ' (100% 필요)'}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
