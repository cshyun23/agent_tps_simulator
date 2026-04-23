import { useMemo } from 'react'
import { useSimStore } from '../../store'
import { NodeCard } from './NodeCard'

interface FlowNode {
  id: string
  type: string
  config?: { label?: string }
}

interface NodeMonitorProps {
  flowNodes: FlowNode[]
}

export function NodeMonitor({ flowNodes }: NodeMonitorProps) {
  const snapshots = useSimStore(s => s.snapshots)
  const simStatus = useSimStore(s => s.status)

  const latestSnap = useMemo(() => {
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
  }, [snapshots])

  const nodeMap = useMemo(() => {
    return new Map(flowNodes.map(n => [n.id, n]))
  }, [flowNodes])

  const nodeMetrics = useMemo(() => {
    if (!latestSnap) return []
    return latestSnap.nodes.slice().sort((a, b) => {
      const aIdx = flowNodes.findIndex(n => n.id === a.node_id)
      const bIdx = flowNodes.findIndex(n => n.id === b.node_id)
      return (aIdx >= 0 ? aIdx : 9999) - (bIdx >= 0 ? bIdx : 9999)
    })
  }, [latestSnap, flowNodes])

  const maxQueueDepth = useMemo(() => {
    if (nodeMetrics.length === 0) return 1
    return Math.max(1, ...nodeMetrics.map(m => m.queue_depth))
  }, [nodeMetrics])

  const bottleneckId = latestSnap?.bottleneck_node_id

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg)',
      borderLeft: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
        }}>
          {simStatus === 'running' && (
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--success)',
              display: 'inline-block',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          )}
          <span>노드 모니터링</span>
        </div>
      </div>

      {/* Cards */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {simStatus === 'idle' || nodeMetrics.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text2)',
            fontSize: 12,
            textAlign: 'center',
            padding: '16px',
          }}>
            <div>
              {simStatus === 'idle'
                ? '시뮬레이션을 시작하면\n노드 상태가 표시됩니다'
                : '노드 데이터를 수신 중...'}
            </div>
          </div>
        ) : (
          nodeMetrics.map(metric => (
            <NodeCard
              key={metric.node_id}
              metric={metric}
              flowNode={nodeMap.get(metric.node_id)}
              isBottleneck={metric.node_id === bottleneckId}
              maxQueueDepth={maxQueueDepth}
            />
          ))
        )}
      </div>
    </div>
  )
}
