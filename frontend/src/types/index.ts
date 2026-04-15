// ── Flow ──────────────────────────────────────────────────

export type NodeType = 'start' | 'llm' | 'tool' | 'conditional' | 'parallel' | 'end'

export interface Branch {
  branch_name: string
  target_node: string
  probability: number
}

export interface NodeConfig {
  llm_server_id?: string
  input_tokens?: number
  output_tokens?: number
  fallback_latency_ms?: number
  concurrency?: number
  tool_latency_ms?: number
  failure_rate?: number
  max_retries?: number
  retry_delay_ms?: number
  branches?: Branch[]
  fanout_nodes?: string[]
  fanin_node?: string
}

export interface FlowNode {
  id: string
  type: NodeType
  label: string
  position: { x: number; y: number }
  config: NodeConfig
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  branch?: string
  is_loop?: boolean
  max_loop_count?: number
}

export interface Flow {
  flow_id: string
  name: string
  created_at: string
  updated_at: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface FlowSummary {
  flow_id: string
  name: string
  updated_at: string
}

// ── LLM Server ───────────────────────────────────────────

export interface KVCacheConfig {
  gpu_memory_utilization: number
  kv_block_size_tokens: number
  kv_size_per_token_bytes: number
  total_kv_blocks: number
  max_concurrent_requests: number
}

export interface PerfReference {
  ref_ttft_ms: number
  ref_input_tokens: number
  ref_tpop_ms: number
  ref_output_tokens: number
}

export interface LLMServer {
  server_id: string
  name: string
  server_type: 'vllm'
  model_name: string
  model_params_b: number
  model_weights_gb: number
  gpu_id: string
  gpu_count: number
  vram_gb: number
  kv_cache: KVCacheConfig
  perf_reference: PerfReference
  max_context_length: number
  tensor_parallel: number
  created_at: string
}

export interface GPU {
  id: string
  name: string
  vendor: string
  tflops_fp16: number
  memory_bandwidth_gbps: number
  vram_gb: number
  notes?: string
}

export interface GPUReference {
  version: string
  updated_at: string
  gpus: GPU[]
}

// ── Simulation ───────────────────────────────────────────

export interface RampUpPattern {
  type: 'ramp_up'
  start_users: number
  peak_users: number
  ramp_duration_sec: number
  hold_duration_sec: number
  ramp_shape: 'linear' | 'smooth'
}

export interface WavePattern {
  type: 'wave'
  min_users: number
  peak_users: number
  period_sec: number
  wave_count: number
  phase_offset_sec: number
}

export type ArrivalPattern = RampUpPattern | WavePattern

export interface SimulationConfig {
  flow_id: string
  start_node_id: string
  end_node_ids: string[]
  duration_sec: number
  playback_speed: 1 | 2 | 5 | 10
  max_hops_per_request: number
  arrival_pattern: ArrivalPattern
  show_p95: boolean
  show_p99: boolean
}

export interface NodeMetricSnapshot {
  node_id: string
  queue_depth: number
  active_requests: number
  avg_wait_ms: number
  avg_process_ms: number
  tps: number
  p95_latency_ms?: number
  p99_latency_ms?: number
  retry_count: number
}

export interface FlowMetricSnapshot {
  sim_time_sec: number
  wall_time_sec: number
  total_completed: number
  total_failed: number
  e2e_avg_latency_ms: number
  e2e_p95_latency_ms?: number
  e2e_p99_latency_ms?: number
  overall_tps: number
  bottleneck_node_id?: string
  nodes: NodeMetricSnapshot[]
}

export interface NodeSummary {
  node_id: string
  node_label: string
  peak_queue_depth: number
  avg_wait_ms: number
  p95_latency_ms?: number
  p99_latency_ms?: number
  total_processed: number
  total_retries: number
}

export interface SimulationSummary {
  total_requests: number
  total_completed: number
  total_failed: number
  failure_rate: number
  e2e_avg_latency_ms: number
  e2e_p95_latency_ms?: number
  e2e_p99_latency_ms?: number
  peak_tps: number
  bottleneck_node_id?: string
  nodes: NodeSummary[]
}

export interface SimulationHistoryItem {
  result_id: string
  flow_name: string
  started_at: string
  finished_at: string
  summary?: SimulationSummary
}

export interface SimulationResult {
  result_id: string
  flow_id: string
  flow_name: string
  config: SimulationConfig
  started_at: string
  finished_at: string
  snapshots: FlowMetricSnapshot[]
  summary?: SimulationSummary
}
