import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from '../api/client'

// Mock fetch
global.fetch = vi.fn()

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Flows API', () => {
    it('should handle list flows request', async () => {
      const mockData = [
        { flow_id: '1', name: 'Flow 1', updated_at: '2024-01-01' },
        { flow_id: '2', name: 'Flow 2', updated_at: '2024-01-02' },
      ]

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      const result = await api.flows.list()

      expect(result).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/flows/',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should handle flow creation', async () => {
      const newFlow = {
        flow_id: '3',
        name: 'New Flow',
        nodes: [],
        edges: [],
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => newFlow,
      })

      const result = await api.flows.create({
        name: 'New Flow',
        nodes: [],
        edges: [],
      })

      expect(result).toEqual(newFlow)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/flows/',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should handle API errors', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      })

      await expect(api.flows.get('nonexistent')).rejects.toThrow()
    })
  })

  describe('LLM Hub API', () => {
    it('should fetch GPU reference', async () => {
      const mockGPURef = {
        gpus: [
          { gpu_id: 'h100-80g', vram_gb: 80 },
        ],
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockGPURef,
      })

      const result = await api.llmHub.getGPUReference()

      expect(result).toEqual(mockGPURef)
    })
  })
})
