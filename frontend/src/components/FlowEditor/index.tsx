import { useCallback, useEffect, useState, useRef } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  useNodesState, useEdgesState, addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '../../api/client'
import { useToastStore } from '../../store'
import { nodeTypes } from './nodes'
import { edgeTypes, detectBackEdges } from './edges'
import { NodeSettingsPopup } from './NodeSettingsPopup'
import { TemplateModal } from './TemplateModal'
import type { Flow, FlowNode, FlowEdge } from '../../types'

interface FlowEditorProps {
  flowId: string | null
  onStartSimulation?: (startNode: string, endNodes: string[]) => void
}

export function FlowEditor({ flowId, onStartSimulation }: FlowEditorProps) {
  const [flow, setFlow] = useState<Flow | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([]) as any
  const [edges, setEdges, onEdgesChange] = useEdgesState([]) as any
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null)
  const [showTemplate, setShowTemplate] = useState(false)
  const [contextMenu, setContextMenu] = useState<any>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore(s => s.addToast)

  // Load flow
  useEffect(() => {
    if (!flowId) return
    api.flows.get(flowId).then(f => {
      setFlow(f)
      const rfNodes = f.nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: { label: n.label, config: n.config },
      }))
      const rfEdges = f.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.is_loop ? 'loop' : e.branch ? 'branch' : 'default',
        data: e.is_loop ? { max_loop_count: e.max_loop_count } : e.branch ? { branch: e.branch } : {},
      }))
      setNodes(rfNodes as any)
      setEdges(rfEdges as any)
      setHistory([{ nodes: rfNodes, edges: rfEdges }])
      setHistoryIndex(0)
    })
  }, [flowId, setNodes, setEdges])

  const pushHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ nodes, edges })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [nodes, edges, history, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1
      setNodes(history[idx].nodes as any)
      setEdges(history[idx].edges as any)
      setHistoryIndex(idx)
    }
  }, [history, historyIndex, setNodes, setEdges])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1
      setNodes(history[idx].nodes as any)
      setEdges(history[idx].edges as any)
      setHistoryIndex(idx)
    }
  }, [history, historyIndex, setNodes, setEdges])

  const onConnect = useCallback((conn: any) => {
    const newEdges = addEdge(
      { ...conn, id: `e${Math.random()}`, data: {} },
      edges
    )
    setEdges(newEdges as any)
    setTimeout(pushHistory, 0)
  }, [edges, setEdges, pushHistory])

  const onNodeClick = useCallback((_: any, node: any) => {
    const flowNode = flow?.nodes.find(n => n.id === node.id)
    if (flowNode) setSelectedNode(flowNode)
  }, [flow])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: any) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
  }, [])

  const addNode = useCallback((type: string) => {
    const id = `node_${Date.now()}`
    const newNode = {
      id,
      type,
      position: { x: 400, y: 300 },
      data: { label: type, config: {} },
    }
    setNodes((ns: any) => [...ns, newNode])
    setTimeout(pushHistory, 0)
  }, [setNodes, pushHistory])

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((ns: any) => ns.filter((n: any) => n.id !== nodeId))
    setEdges((es: any) => es.filter((e: any) => e.source !== nodeId && e.target !== nodeId))
    setContextMenu(null)
    setTimeout(pushHistory, 0)
  }, [setNodes, setEdges, pushHistory])

  const validateFlow = useCallback(() => {
    const errors: string[] = []

    // Check conditional branches
    nodes.forEach((n: any) => {
      if (n.type === 'conditional') {
        const branches = n.data.config?.branches || []
        if (branches.length === 0) {
          errors.push(`"${n.data.label}" 노드에 분기(branch)가 없습니다.`)
        } else {
          const sum = branches.reduce((acc: number, b: any) => acc + (b.probability || 0), 0)
          if (sum !== 100) {
            errors.push(`"${n.data.label}" 노드의 분기 확률 합이 ${sum}%입니다 (100% 필요).`)
          }
        }
      }
    })

    // Check isolated nodes
    const connectedNodeIds = new Set(edges.flatMap((e: any) => [e.source, e.target]))
    nodes.forEach((n: any) => {
      if (n.type !== 'start' && n.type !== 'end' && !connectedNodeIds.has(n.id)) {
        errors.push(`"${n.data.label}" 노드가 연결되지 않았습니다.`)
      }
    })

    return errors
  }, [nodes, edges])

  const handleStartSimulation = useCallback(() => {
    const errors = validateFlow()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    if (onStartSimulation) {
      onStartSimulation(nodes.filter((n: any) => n.type === 'start')[0]?.id, nodes.filter((n: any) => n.type === 'end').map((n: any) => n.id))
    }
  }, [validateFlow, nodes, onStartSimulation])

  const saveFlow = useCallback(async () => {
    if (!flow) return
    try {
      const backEdges = detectBackEdges(nodes, edges)
      const flowData: Flow = {
        ...flow,
        nodes: nodes.map((n: any) => ({
          id: n.id,
          type: n.type,
          label: n.data.label,
          position: n.position,
          config: n.data.config || {},
        })),
        edges: edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          branch: e.data?.branch,
          is_loop: backEdges.has(e.id),
          max_loop_count: e.data?.max_loop_count,
        })),
        updated_at: new Date().toISOString(),
      }
      await api.flows.update(flow.flow_id, flowData)
      setFlow(flowData)
      addToast('플로우가 저장되었습니다', 'success')
    } catch (err) {
      addToast('플로우 저장 실패', 'error')
    }
  }, [flow, nodes, edges, addToast])

  const downloadFile = useCallback((content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportFlow = useCallback(() => {
    if (!flow) return
    try {
      downloadFile(JSON.stringify(flow, null, 2), `${flow.name || 'flow'}.json`, 'application/json')
      addToast('플로우가 내보내졌습니다', 'success')
    } catch (err) {
      addToast('플로우 내보내기 실패', 'error')
    }
  }, [flow, downloadFile, addToast])

  const importFlow = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data: Flow = JSON.parse(ev.target?.result as string)
        const rfNodes = data.nodes.map(n => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: { label: n.label, config: n.config },
        }))
        const rfEdges = data.edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.is_loop ? 'loop' : e.branch ? 'branch' : 'default',
          data: e.is_loop ? { max_loop_count: e.max_loop_count } : e.branch ? { branch: e.branch } : {},
        }))
        setNodes(rfNodes as any)
        setEdges(rfEdges as any)
        setHistory([{ nodes: rfNodes, edges: rfEdges }])
        setHistoryIndex(0)
        if (flow) {
          const updated: Flow = {
            ...flow,
            ...data,
            nodes: data.nodes,
            edges: data.edges,
            updated_at: new Date().toISOString(),
          }
          await api.flows.update(flow.flow_id, updated)
          setFlow(updated)
          addToast('플로우가 가져와졌습니다', 'success')
        }
      } catch (error) {
        console.error('Failed to import flow:', error)
        addToast('플로우 가져오기 실패', 'error')
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [flow, setNodes, setEdges, addToast])

  const handleSaveNode = (updated: FlowNode) => {
    setNodes((ns: any) => ns.map((n: any) => n.id === updated.id
      ? { ...n, data: { label: updated.label, config: updated.config } }
      : n
    ))
    setTimeout(pushHistory, 0)
    setSelectedNode(null)
  }

  const handleTemplateSelect = (templateNodes: FlowNode[], templateEdges: FlowEdge[]) => {
    const rfNodes = templateNodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { label: n.label, config: n.config },
    }))
    const rfEdges = templateEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.is_loop ? 'loop' : 'default',
      data: e.is_loop ? { max_loop_count: e.max_loop_count } : {},
    }))
    setNodes(rfNodes as any)
    setEdges(rfEdges as any)
    setTimeout(pushHistory, 0)
    setShowTemplate(false)
  }

  const startNodes = nodes.filter((n: any) => n.type === 'start').map((n: any) => n.id)
  const endNodes = nodes.filter((n: any) => n.type === 'end').map((n: any) => n.id)

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />

        <Panel position="top-left" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 300 }}>
          <button className="btn-sm btn-ghost" onClick={() => addNode('start')}>+ Start</button>
          <button className="btn-sm btn-ghost" onClick={() => addNode('llm')}>+ LLM</button>
          <button className="btn-sm btn-ghost" onClick={() => addNode('tool')}>+ Tool</button>
          <button className="btn-sm btn-ghost" onClick={() => addNode('conditional')}>+ Cond</button>
          <button className="btn-sm btn-ghost" onClick={() => addNode('parallel')}>+ Para</button>
          <button className="btn-sm btn-ghost" onClick={() => addNode('end')}>+ End</button>
        </Panel>

        <Panel position="top-center" style={{ display: 'flex', gap: 6 }}>
          <button className="btn-sm btn-ghost" onClick={undo} disabled={historyIndex <= 0}>↶ Undo</button>
          <button className="btn-sm btn-ghost" onClick={redo} disabled={historyIndex >= history.length - 1}>↷ Redo</button>
          <button className="btn-sm btn-ghost" onClick={() => setShowTemplate(true)}>🎨 Template</button>
          <button className="btn-sm btn-ghost" onClick={exportFlow}>📤 Export</button>
          <button className="btn-sm btn-ghost" onClick={() => fileInputRef.current?.click()}>📥 Import</button>
          <button className="btn-sm btn-primary" onClick={saveFlow}>💾 Save</button>
        </Panel>

        {startNodes.length > 0 && endNodes.length > 0 && onStartSimulation && (
          <Panel position="top-right">
            <button className="btn-sm btn-success" onClick={handleStartSimulation}>
              ▶ Run Simulation
            </button>
          </Panel>
        )}
      </ReactFlow>

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            zIndex: 999,
          }}
          onContextMenu={e => e.preventDefault()}
        >
          <button
            className="btn-ghost"
            onClick={() => deleteNode(contextMenu.nodeId)}
            style={{ width: '100%', textAlign: 'left', padding: '6px 12px', borderRadius: 0 }}
          >
            🗑 Delete
          </button>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--surface)',
          border: '2px solid var(--danger)',
          borderRadius: 'var(--radius)',
          padding: 16,
          maxWidth: 400,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 12 }}>⚠️ 검증 실패</div>
          <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto', marginBottom: 12 }}>
            {validationErrors.map((err, i) => (
              <div key={i} style={{ color: 'var(--text)' }}>• {err}</div>
            ))}
          </div>
          <button
            className="btn-ghost"
            onClick={() => setValidationErrors([])}
            style={{ width: '100%', textAlign: 'center' }}
          >
            확인
          </button>
        </div>
      )}

      {selectedNode && (
        <NodeSettingsPopup
          node={selectedNode}
          onSave={handleSaveNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {showTemplate && (
        <TemplateModal
          onSelect={handleTemplateSelect}
          onCancel={() => setShowTemplate(false)}
        />
      )}

      {contextMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setContextMenu(null)} />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={importFlow}
      />
    </div>
  )
}
