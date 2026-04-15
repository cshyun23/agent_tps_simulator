# Command History

## 2026-04-15

1. 모든 명령은 history.md에 저장할 것. 별도 지시 없이 파일 생성 금지. 테스트는 명시적으로 요청할 때만 수행. 모든 Python 가상환경은 `venv`로 생성하여 사용.
2. README.md에 프로젝트 목표, 설계 방안, 사용법 작성. 코딩 전 설계 단계 문서화.
3. 설계 보완: Conditional 분기 확률(%) 및 재시도 로직, 플로우 JSON 포맷, 도착 패턴 Ramp-up/Wave 파라미터 상세화, GPU 레퍼런스 JSON 업로드/다운로드 포맷 정의.
4. LLM latency 계산 정밀화: TTFT/TPOP 기반 계산 (TTFT는 input token에 선형 스케일, decode는 output_tokens × TPOP). KV cache 블록 계산으로 max_concurrent_requests 도출. 추론 서버 타입(vLLM 우선, 추후 확장) 추가. 서버 등록 시 레퍼런스 TTFT/TPOP 및 측정 기준 토큰 수 입력.
8. 프론트엔드 세팅: Vite 5 + React + TypeScript, @xyflow/react, recharts, zustand 설치. 빌드 확인 완료.
7. 백엔드 전체 구현: models (flow, llm_server, simulation), api (flow, llm_hub, simulation), engine (arrival, metrics, node, simulator), data/gpu_reference.json, main.py. python-multipart 의존성 추가. 서버 기동 및 /health 확인 완료.
6. uv 기반 Python 환경 설정: pyproject.toml 생성 (fastapi, uvicorn, pydantic, numpy), .gitignore 추가 (Python .venv/, React frontend/node_modules/ 등).
5. 설계 보완 (섹션 1~5 전체 결정사항 README 반영): DES 방식 확정, TTFT prefill 배치 대기 포함, KV cache 동적 증가, 동일 서버 물리적 공유 처리. Parallel 노드 추가(fan-out/in), 루프 엣지 back edge 감지(점선+주황), 글로벌 max_hops=10, 루프/재시도 max 설정 필수화. 시뮬레이션 시 Start/End 노드 직접 선택. 토큰 수 정규분포 샘플링(std=avg×0.2). P95/P99 메트릭 추가(체크박스). 화면 3개(Agent Flow+Sim / LLM Hub / 비교 뷰) 구조, 플로우 목록 사이드바, 노드 팝업 편집, Undo/Redo+우클릭 메뉴, 템플릿 선택. WebSocket 고정 주기(재생속도 비례), 브라우저 닫힘 시 즉시 중단, 동시 시뮬레이션 미지원. 결과 JSON/CSV 다운로드, 시뮬레이션 히스토리 저장 및 비교 뷰 구현.
