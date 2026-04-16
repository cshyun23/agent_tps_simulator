import {
  BaseEdge,
  Edge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  MarkerType,
} from '@xyflow/react'

export function LoopEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<Edge<{ max_loop_count?: number }>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: 'var(--orange)',
          strokeWidth: 2,
          strokeDasharray: '5,5',
        }}
        markerEnd={MarkerType.ArrowClosed as any}
      />
      {data?.max_loop_count && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 11,
              background: 'var(--surface)',
              border: '1px solid var(--orange)',
              borderRadius: 3,
              padding: '2px 6px',
              color: 'var(--orange)',
              fontWeight: 500,
              pointerEvents: 'none',
            }}
          >
            max: {data.max_loop_count}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export function BranchEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<Edge<{ branch?: string }>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: 'var(--border)',
          strokeWidth: 1.5,
        }}
        markerEnd={MarkerType.ArrowClosed as any}
      />
      {data?.branch && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 10,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              padding: '1px 5px',
              color: 'var(--text2)',
              pointerEvents: 'none',
            }}
          >
            {data.branch}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const edgeTypes = {
  loop: LoopEdge,
  branch: BranchEdge,
}

// Back edge detection using DFS
export function detectBackEdges(
  nodes: any[],
  edges: any[]
): Set<string> {
  const visited = new Set<string>()
  const inStack = new Set<string>()
  const backEdges = new Set<string>()

  const adj = new Map<string, Array<{ edgeId: string; target: string }>>()
  nodes.forEach(n => adj.set(n.id, []))
  edges.forEach(e => {
    const entry = adj.get(e.source)
    if (entry) entry.push({ edgeId: e.id, target: e.target })
  })

  function dfs(nodeId: string) {
    visited.add(nodeId)
    inStack.add(nodeId)

    for (const { edgeId, target } of adj.get(nodeId) || []) {
      if (!visited.has(target)) {
        dfs(target)
      } else if (inStack.has(target)) {
        backEdges.add(edgeId)
      }
    }

    inStack.delete(nodeId)
  }

  nodes.forEach(n => {
    if (!visited.has(n.id)) dfs(n.id)
  })

  return backEdges
}
