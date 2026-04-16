import { useEffect, useState, useRef } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { api } from '../api/client'
import { useFlowStore, useToastStore } from '../store'
import { FlowEditor } from '../components/FlowEditor'
import { SimPanel } from '../components/SimPanel'
import type { Flow } from '../types'

export default function AgentPage() {
  const summaries = useFlowStore(s => s.summaries)
  const currentFlowId = useFlowStore(s => s.currentFlowId)
  const setCurrentFlow = useFlowStore(s => s.setCurrentFlow)
  const fetchSummaries = useFlowStore(s => s.fetchSummaries)
  const deleteFlow = useFlowStore(s => s.deleteFlow)
  const duplicateFlow = useFlowStore(s => s.duplicateFlow)
  const addToast = useToastStore(s => s.addToast)
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const [flow, setFlow] = useState<Flow | null>(null)
  const [startNode, setStartNode] = useState('')
  const [endNodes, setEndNodes] = useState<string[]>([])

  useEffect(() => {
    fetchSummaries()
  }, [])

  useEffect(() => {
    if (!currentFlowId) return
    api.flows.get(currentFlowId).then(setFlow)
  }, [currentFlowId])

  const createNewFlow = async () => {
    try {
      const f = await api.flows.create({ name: `Flow ${new Date().getTime()}`, nodes: [], edges: [] })
      setCurrentFlow(f.flow_id)
      addToast('플로우가 생성되었습니다', 'success')
    } catch (err) {
      addToast('플로우 생성 실패', 'error')
    }
  }

  const handleRenameFlow = async (id: string, newName: string) => {
    try {
      await api.flows.update(id, { name: newName } as any)
      await fetchSummaries()
      setEditingFlowId(null)
      addToast('플로우 이름이 변경되었습니다', 'success')
    } catch (err) {
      addToast('플로우 이름 변경 실패', 'error')
    }
  }

  const handleDuplicateFlow = async (id: string) => {
    try {
      await duplicateFlow(id)
      addToast('플로우가 복제되었습니다', 'success')
    } catch (err) {
      addToast('플로우 복제 실패', 'error')
    }
  }

  const handleDeleteFlow = async (id: string, name: string) => {
    if (confirm(`"${name}" 삭제?`)) {
      try {
        await deleteFlow(id)
        addToast('플로우가 삭제되었습니다', 'success')
      } catch (err) {
        addToast('플로우 삭제 실패', 'error')
      }
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar */}
      <div style={{
        width: 200,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        overflow: 'auto',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <button
          className="btn-primary"
          onClick={createNewFlow}
          style={{ margin: 8, borderRadius: 'var(--radius)' }}
        >
          + 새 플로우
        </button>
        <div style={{ padding: '0 8px', fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>
          플로우 목록
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {summaries.map(s => (
            <div
              key={s.flow_id}
              style={{
                padding: '8px',
                margin: '4px 8px',
                background: currentFlowId === s.flow_id ? 'var(--primary)' : 'var(--surface2)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: currentFlowId === s.flow_id ? '#fff' : 'var(--text)',
                transition: 'all 0.2s',
              }}
              onClick={() => setCurrentFlow(s.flow_id)}
              onContextMenu={e => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDoubleClick={() => {
                setEditingFlowId(s.flow_id)
                setEditingName(s.name)
              }}
            >
              {editingFlowId === s.flow_id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={() => {
                    if (editingName.trim()) {
                      handleRenameFlow(s.flow_id, editingName.trim())
                    } else {
                      setEditingFlowId(null)
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (editingName.trim()) {
                        handleRenameFlow(s.flow_id, editingName.trim())
                      } else {
                        setEditingFlowId(null)
                      }
                    } else if (e.key === 'Escape') {
                      setEditingFlowId(null)
                    }
                  }}
                  onClick={e => e.stopPropagation()}
                  style={{
                    fontSize: 12,
                    width: '100%',
                    padding: '4px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--primary)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                  autoFocus
                />
              ) : (
                <>
                  <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                    {new Date(s.updated_at).toLocaleDateString()}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      marginTop: 4,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      pointerEvents: 'none',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.pointerEvents = 'auto'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.opacity = '0'
                      e.currentTarget.style.pointerEvents = 'none'
                    }}
                  >
                    <button
                      className="btn-sm btn-ghost"
                      onClick={e => {
                        e.stopPropagation()
                        handleDuplicateFlow(s.flow_id)
                      }}
                      style={{ fontSize: 10, padding: '2px 6px', flex: 1 }}
                    >
                      📋 복제
                    </button>
                    <button
                      className="btn-sm btn-danger"
                      onClick={e => {
                        e.stopPropagation()
                        handleDeleteFlow(s.flow_id, s.name)
                      }}
                      style={{ fontSize: 10, padding: '2px 6px', flex: 1 }}
                    >
                      🗑 삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Editor + SimPanel */}
      {currentFlowId && flow ? (
        <>
          <div style={{ flex: 1.5, display: 'flex', overflow: 'hidden' }}>
            <ReactFlowProvider>
              <FlowEditor
                flowId={currentFlowId}
                onStartSimulation={(start, ends) => {
                  setStartNode(start)
                  setEndNodes(ends)
                }}
              />
            </ReactFlowProvider>
          </div>
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', borderLeft: '1px solid var(--border)' }}>
            <SimPanel flow={flow} startNode={startNode} endNodes={endNodes} />
          </div>
        </>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text2)',
        }}>
          플로우를 선택하세요
        </div>
      )}
    </div>
  )
}
