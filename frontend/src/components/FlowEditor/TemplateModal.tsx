import type { FlowNode, FlowEdge } from '../../types'

const templates = {
  empty: {
    name: '빈 플로우',
    nodes: [
      { id: '1', type: 'start', label: '시작', position: { x: 100, y: 100 }, config: {} } as FlowNode,
      { id: '2', type: 'end', label: '종료', position: { x: 300, y: 100 }, config: {} } as FlowNode,
    ],
    edges: [{ id: 'e1', source: '1', target: '2' } as FlowEdge],
  },
  rag: {
    name: '단순 RAG',
    nodes: [
      { id: '1', type: 'start', label: '시작', position: { x: 100, y: 100 }, config: {} } as FlowNode,
      { id: '2', type: 'llm', label: '쿼리 이해', position: { x: 250, y: 100 }, config: { input_tokens: 256, output_tokens: 128 } } as FlowNode,
      { id: '3', type: 'tool', label: '문서 검색', position: { x: 400, y: 100 }, config: { tool_latency_ms: 500 } } as FlowNode,
      { id: '4', type: 'llm', label: '답변 생성', position: { x: 550, y: 100 }, config: { input_tokens: 512, output_tokens: 256 } } as FlowNode,
      { id: '5', type: 'end', label: '종료', position: { x: 700, y: 100 }, config: {} } as FlowNode,
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
      { id: 'e4', source: '4', target: '5' },
    ] as FlowEdge[],
  },
  react: {
    name: 'ReAct 루프',
    nodes: [
      { id: '1', type: 'start', label: '시작', position: { x: 100, y: 150 }, config: {} } as FlowNode,
      { id: '2', type: 'llm', label: '추론 & 계획', position: { x: 250, y: 150 }, config: { input_tokens: 256, output_tokens: 256 } } as FlowNode,
      { id: '3', type: 'conditional', label: '완료?', position: { x: 400, y: 150 }, config: { branches: [{ branch_name: '완료', target_node: '5', probability: 70 }, { branch_name: '재시도', target_node: '4', probability: 30 }] } } as FlowNode,
      { id: '4', type: 'tool', label: '도구 실행', position: { x: 250, y: 300 }, config: { tool_latency_ms: 500 } } as FlowNode,
      { id: '5', type: 'end', label: '종료', position: { x: 550, y: 150 }, config: {} } as FlowNode,
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '5', branch: '완료' },
      { id: 'e4', source: '3', target: '4', branch: '재시도' },
      { id: 'e5', source: '4', target: '2', is_loop: true, max_loop_count: 3 },
    ] as FlowEdge[],
  },
  parallel: {
    name: '병렬 Tool 호출',
    nodes: [
      { id: '1', type: 'start', label: '시작', position: { x: 100, y: 150 }, config: {} } as FlowNode,
      { id: '2', type: 'llm', label: '작업 분해', position: { x: 250, y: 150 }, config: { input_tokens: 256, output_tokens: 128 } } as FlowNode,
      { id: '3', type: 'parallel', label: '병렬', position: { x: 400, y: 150 }, config: { fanout_nodes: ['4', '5'], fanin_node: '6' } } as FlowNode,
      { id: '4', type: 'tool', label: 'Tool A', position: { x: 300, y: 280 }, config: { tool_latency_ms: 400 } } as FlowNode,
      { id: '5', type: 'tool', label: 'Tool B', position: { x: 500, y: 280 }, config: { tool_latency_ms: 400 } } as FlowNode,
      { id: '6', type: 'llm', label: '결과 합성', position: { x: 550, y: 150 }, config: { input_tokens: 512, output_tokens: 256 } } as FlowNode,
      { id: '7', type: 'end', label: '종료', position: { x: 700, y: 150 }, config: {} } as FlowNode,
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
      { id: 'e4', source: '3', target: '5' },
      { id: 'e5', source: '4', target: '6' },
      { id: 'e6', source: '5', target: '6' },
      { id: 'e7', source: '6', target: '7' },
    ] as FlowEdge[],
  },
}

interface TemplateModalProps {
  onSelect: (nodes: FlowNode[], edges: FlowEdge[]) => void
  onCancel: () => void
}

export function TemplateModal({ onSelect, onCancel }: TemplateModalProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">플로우 템플릿 선택</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {Object.entries(templates).map(([key, tmpl]) => (
            <button
              key={key}
              className="btn-ghost"
              onClick={() => onSelect(tmpl.nodes, tmpl.edges)}
              style={{
                padding: 12,
                textAlign: 'left',
                height: 60,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{tmpl.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                  {tmpl.nodes.length} 노드
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
