import { Handle, Position, NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'

const nodeStyles = {
  base: {
    padding: '8px 12px',
    borderRadius: 'var(--radius)',
    border: '2px solid',
    fontSize: 12,
    fontWeight: 500,
    minWidth: 100,
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  selected: { boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5)' },
}

const colors = {
  start: { bg: '#1e7e34', border: '#22c55e', text: '#fff' },
  end: { bg: '#7c2d12', border: '#ef4444', text: '#fff' },
  llm: { bg: '#1e3a8a', border: '#3b82f6', text: '#fff' },
  tool: { bg: '#5b21b6', border: '#a855f7', text: '#fff' },
  conditional: { bg: '#92400e', border: '#f97316', text: '#fff' },
  parallel: { bg: '#0c4a6e', border: '#06b6d4', text: '#fff' },
}

function BaseNode({
  data,
  selected,
  type,
  color,
}: {
  data: any
  selected?: boolean
  type: string
  color: (typeof colors)[keyof typeof colors]
}) {
  return (
    <div
      style={{
        ...nodeStyles.base,
        background: color.bg,
        borderColor: color.border,
        color: color.text,
        ...(selected && nodeStyles.selected),
      }}
    >
      {data.label || type}
    </div>
  )
}

export function StartNode(props: NodeProps<Node<{ label: string }>>) {
  return (
    <>
      <BaseNode {...props} type="start" color={colors.start} />
      <Handle type="source" position={Position.Right} />
    </>
  )
}

export function EndNode(props: NodeProps<Node<{ label: string }>>) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <BaseNode {...props} type="end" color={colors.end} />
    </>
  )
}

export function LLMNode(props: NodeProps<Node<{ label: string; config: any }>>) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <BaseNode {...props} type="llm" color={colors.llm} />
      <Handle type="source" position={Position.Right} />
    </>
  )
}

export function ToolNode(props: NodeProps<Node<{ label: string; config: any }>>) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <BaseNode {...props} type="tool" color={colors.tool} />
      <Handle type="source" position={Position.Right} />
    </>
  )
}

export function ConditionalNode(props: NodeProps<Node<{ label: string; config: any }>>) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div
        style={{
          ...nodeStyles.base,
          background: colors.conditional.bg,
          borderColor: colors.conditional.border,
          color: colors.conditional.text,
          width: 80,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          ...(props.selected && nodeStyles.selected),
        }}
      >
        {props.data.label}
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  )
}

export function ParallelNode(props: NodeProps<Node<{ label: string; config: any }>>) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <BaseNode {...props} type="parallel" color={colors.parallel} />
      <Handle type="source" position={Position.Right} />
    </>
  )
}

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  llm: LLMNode,
  tool: ToolNode,
  conditional: ConditionalNode,
  parallel: ParallelNode,
}
