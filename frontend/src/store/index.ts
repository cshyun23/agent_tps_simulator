import { create } from 'zustand'
import { api } from '../api/client'
import type {
  FlowSummary,
  LLMServer, GPUReference,
  FlowMetricSnapshot, SimulationSummary, SimulationHistoryItem,
} from '../types'

// ── Toast Store ───────────────────────────────────────────

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, type: Toast['type'], duration?: number) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type, duration = 3000) => {
    const id = Date.now().toString()
    set(s => ({ toasts: [...s.toasts, { id, message, type, duration }] }))
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

// ── Flow Store ────────────────────────────────────────────

interface FlowState {
  summaries: FlowSummary[]
  currentFlowId: string | null
  loading: boolean
  fetchSummaries: () => Promise<void>
  setCurrentFlow: (id: string | null) => void
  deleteFlow: (id: string) => Promise<void>
  duplicateFlow: (id: string) => Promise<void>
}

export const useFlowStore = create<FlowState>((set, get) => ({
  summaries: [],
  currentFlowId: null,
  loading: false,

  fetchSummaries: async () => {
    set({ loading: true })
    const summaries = await api.flows.list()
    set({ summaries, loading: false })
    if (!get().currentFlowId && summaries.length > 0) {
      set({ currentFlowId: summaries[0].flow_id })
    }
  },

  setCurrentFlow: (id) => set({ currentFlowId: id }),

  deleteFlow: async (id) => {
    await api.flows.delete(id)
    const summaries = get().summaries.filter(s => s.flow_id !== id)
    const currentFlowId = get().currentFlowId === id
      ? (summaries[0]?.flow_id ?? null)
      : get().currentFlowId
    set({ summaries, currentFlowId })
  },

  duplicateFlow: async (id) => {
    await api.flows.duplicate(id)
    await get().fetchSummaries()
  },
}))

// ── LLM Hub Store ─────────────────────────────────────────

interface LLMHubState {
  servers: LLMServer[]
  gpuReference: GPUReference | null
  fetchServers: () => Promise<void>
  fetchGPUReference: () => Promise<void>
  deleteServer: (id: string) => Promise<void>
}

export const useLLMHubStore = create<LLMHubState>((set, get) => ({
  servers: [],
  gpuReference: null,

  fetchServers: async () => {
    const servers = await api.llmHub.listServers()
    set({ servers })
  },

  fetchGPUReference: async () => {
    const gpuReference = await api.llmHub.getGPUReference()
    set({ gpuReference })
  },

  deleteServer: async (id) => {
    await api.llmHub.deleteServer(id)
    set({ servers: get().servers.filter(s => s.server_id !== id) })
  },
}))

// ── Simulation Store ──────────────────────────────────────

type SimStatus = 'idle' | 'running' | 'paused' | 'finished'

interface SimState {
  status: SimStatus
  snapshots: FlowMetricSnapshot[]
  summary: SimulationSummary | null
  history: SimulationHistoryItem[]
  ws: WebSocket | null
  setStatus: (s: SimStatus) => void
  addSnapshot: (snap: FlowMetricSnapshot) => void
  clearSnapshots: () => void
  setFinished: (summary: SimulationSummary) => void
  reset: () => void
  setWS: (ws: WebSocket | null) => void
  fetchHistory: () => Promise<void>
  deleteHistory: (id: string) => Promise<void>
}

export const useSimStore = create<SimState>((set, get) => ({
  status: 'idle',
  snapshots: [],
  summary: null,
  history: [],
  ws: null,

  setStatus: (status) => set({ status }),
  addSnapshot: (snap) => set(s => ({ snapshots: [...s.snapshots, snap] })),
  clearSnapshots: () => set({ snapshots: [] }),
  setFinished: (summary) => {
    set({ status: 'finished', summary })
    get().fetchHistory()
  },
  reset: () => {
    get().ws?.close()
    set({ status: 'idle', snapshots: [], summary: null, ws: null })
  },
  setWS: (ws) => set({ ws }),

  fetchHistory: async () => {
    const history = await api.simulation.listHistory()
    set({ history })
  },

  deleteHistory: async (id) => {
    await api.simulation.deleteResult(id)
    set({ history: get().history.filter(h => h.result_id !== id) })
  },
}))
