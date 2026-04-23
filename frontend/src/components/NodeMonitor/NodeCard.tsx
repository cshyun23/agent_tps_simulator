import type { NodeMetricSnapshot } from '../../types'

interface FlowNode {
  id: string
  type: string
  config?: { label?: string }
}

interface NodeCardProps {
  metric: NodeMetricSnapshot
  flowNode: FlowNode | undefined
  isBottleneck: boolean
  maxQueueDepth: number
}

const NODE_TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  llm: { color: '#a855f7', icon: '🧠', label: 'LLM' },
  tool: { color: '#3b82f6', icon: '🔧', label: 'Tool' },
  conditional: { color: '#f59e0b', icon: '🔀', label: 'Conditional' },
  parallel: { color: '#22c55e', icon: '⚡', label: 'Parallel' },
  start: { color: '#94a3b8', icon: '▶', label: 'Start' },
  end: { color: '#64748b', icon: '⏹', label: 'End' },
}

function getNodeTypeConfig(type: string) {
  return NODE_TYPE_CONFIG[type] || { color: '#94a3b8', icon: '◆', label: 'Unknown' }
}

function getQueueColor(ratio: number): string {
  if (ratio < 0.4) return '#22c55e'
  if (ratio < 0.7) return '#f59e0b'
  return '#ef4444'
}

export function NodeCard({ metric, flowNode, isBottleneck, maxQueueDepth }: NodeCardProps) {
  const typeConfig = getNodeTypeConfig(flowNode?.type || 'llm')
  const nodeName = flowNode?.config?.label || flowNode?.id || metric.node_id
  const queueRatio = maxQueueDepth > 0 ? metric.queue_depth / maxQueueDepth : 0
  const queueColor = getQueueColor(queueRatio)

  const borderColor = isBottleneck ? 'var(--danger)' : typeConfig.color
  const bgColor = isBottleneck ? 'rgba(239,68,68,0.08)' : 'transparent'

  return (
    <div style={{
      background: bgColor,
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 'var(--radius)',
      padding: 10,
      fontSize: 12,
      color: 'var(--text)',
      lineHeight: 1.5,
      aspectRatio: '2 / 1',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header: Node Identity */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingBottom: 6,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>{typeConfig.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{nodeName}</div>
            <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 1 }}>
              {typeConfig.label}
            </div>
          </div>
        </div>
        {isBottleneck && (
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            background: 'var(--danger)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: 2,
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
          }}>
            BOTTLENECK
          </span>
        )}
      </div>

      {/* Content: Metrics in horizontal layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: 8,
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 3, fontWeight: 500 }}>
            큐
          </div>
          <div style={{
            height: 6,
            background: 'var(--surface)',
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid var(--border)',
            marginBottom: 3,
          }}>
            <div style={{
              width: `${Math.min(queueRatio * 100, 100)}%`,
              height: '100%',
              background: queueColor,
              transition: 'width 200ms, background-color 200ms',
            }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
            {metric.queue_depth}개
          </div>
          <div style={{ fontSize: 8, color: 'var(--text2)', marginTop: 1 }}>
            활성: {metric.active_requests}
          </div>
        </div>

        {/* Wait Time */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 3, fontWeight: 500 }}>
            대기 ⏱️
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
            {metric.avg_wait_ms.toFixed(0)}ms
          </div>
          <div style={{ fontSize: 8, color: 'var(--text2)' }}>
            도착 → 시작
          </div>
        </div>

        {/* Process Time */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 3, fontWeight: 500 }}>
            처리 ⚙️
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
            {metric.avg_process_ms.toFixed(0)}ms
          </div>
          <div style={{ fontSize: 8, color: 'var(--text2)' }}>
            시작 → 완료
          </div>
        </div>

        {/* Throughput & Retry */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 9, color: 'var(--text2)', marginBottom: 3, fontWeight: 500 }}>
            처리량
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', marginBottom: 2 }}>
            {metric.tps.toFixed(1)} TPS
          </div>
          {metric.retry_count > 0 && (
            <div style={{ fontSize: 8, color: 'var(--warning)', fontWeight: 600 }}>
              🔄 {metric.retry_count}회
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
