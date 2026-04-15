from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel


ServerType = Literal["vllm"]


class KVCacheConfig(BaseModel):
    gpu_memory_utilization: float = 0.9
    kv_block_size_tokens: int = 16
    kv_size_per_token_bytes: float = 1024.0
    total_kv_blocks: int = 0
    max_concurrent_requests: int = 0


class PerfReference(BaseModel):
    ref_ttft_ms: float
    ref_input_tokens: int
    ref_tpop_ms: float
    ref_output_tokens: int


class LLMServer(BaseModel):
    server_id: str
    name: str
    server_type: ServerType = "vllm"
    model_name: str
    model_params_b: float
    model_weights_gb: float

    gpu_id: str
    gpu_count: int
    vram_gb: float

    kv_cache: KVCacheConfig
    perf_reference: PerfReference

    max_context_length: int = 8192
    tensor_parallel: int = 1
    created_at: str


class GPU(BaseModel):
    id: str
    name: str
    vendor: str
    tflops_fp16: float
    memory_bandwidth_gbps: float
    vram_gb: float
    notes: Optional[str] = None


class GPUReference(BaseModel):
    version: str = "1.0"
    updated_at: str
    gpus: list[GPU]
