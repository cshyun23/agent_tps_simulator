import type {
  Flow, FlowSummary, LLMServer, GPUReference,
  SimulationConfig, SimulationHistoryItem, SimulationResult,
} from '../types'

const BASE = '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

async function reqFormData<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Flow ──────────────────────────────────────────────────

export const api = {
  flows: {
    list: () => req<FlowSummary[]>('/flows/'),
    get: (id: string) => req<Flow>(`/flows/${id}`),
    create: (data: Partial<Flow> & { name: string }) =>
      req<Flow>('/flows/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Flow>) =>
      req<Flow>(`/flows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/flows/${id}`, { method: 'DELETE' }),
    duplicate: (id: string) => req<Flow>(`/flows/${id}/duplicate`, { method: 'POST' }),
  },

  llmHub: {
    listServers: () => req<LLMServer[]>('/llm-hub/servers'),
    getServer: (id: string) => req<LLMServer>(`/llm-hub/servers/${id}`),
    createServer: (data: Omit<LLMServer, 'server_id' | 'created_at'>) =>
      req<LLMServer>('/llm-hub/servers', { method: 'POST', body: JSON.stringify(data) }),
    updateServer: (id: string, data: Partial<LLMServer>) =>
      req<LLMServer>(`/llm-hub/servers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteServer: (id: string) => req<void>(`/llm-hub/servers/${id}`, { method: 'DELETE' }),
    getGPUReference: () => req<GPUReference>('/llm-hub/gpu-reference'),
    uploadGPUReference: (formData: FormData) =>
      reqFormData<GPUReference>('/llm-hub/gpu-reference/upload', { method: 'POST', body: formData }),
  },

  simulation: {
    listHistory: () => req<SimulationHistoryItem[]>('/simulation/history'),
    getResult: (id: string) => req<SimulationResult>(`/simulation/history/${id}`),
    deleteResult: (id: string) => req<void>(`/simulation/history/${id}`, { method: 'DELETE' }),
    stop: () => req<void>('/simulation/stop', { method: 'POST' }),
  },
}

// ── WebSocket ─────────────────────────────────────────────

export function createSimulationWS(
  config: SimulationConfig,
  onSnapshot: (snap: import('../types').FlowMetricSnapshot) => void,
  onFinished: (resultId: string, summary: import('../types').SimulationSummary) => void,
  onError: (msg: string) => void,
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${protocol}//${window.location.host}/api/simulation/ws`)

  ws.onopen = () => ws.send(JSON.stringify(config))

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.type === 'snapshot') onSnapshot(msg.data)
    else if (msg.type === 'finished') onFinished(msg.result_id, msg.summary)
    else if (msg.type === 'error') onError(msg.message)
  }

  ws.onerror = () => onError('WebSocket 연결 오류')

  return ws
}
