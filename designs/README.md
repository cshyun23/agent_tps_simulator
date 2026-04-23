# 설계 문서 (Designs)

## 폴더 구조

```
designs/
├── README.md                          # 이 파일
├── components/                        # UI 컴포넌트 설계
│   ├── NodeMonitor.md                 # 노드 모니터링 패널
│   ├── SimPanel.md                    # 시뮬레이션 패널
│   ├── FlowEditor.md                  # 플로우 에디터
│   └── shared-ui.md                   # 공통 UI 요소 (버튼, 입력창 등)
├── features/                          # 기능별 설계
│   ├── queue-monitoring.md            # 큐 깊이 실시간 모니터링
│   ├── bottleneck-detection.md        # 병목 노드 자동 감지
│   ├── metrics-calculation.md         # 메트릭 계산 로직
│   └── real-time-updates.md           # WebSocket 실시간 업데이트
└── systems/                           # 시스템 레벨 설계
    ├── metrics-system.md              # 메트릭 수집/저장 시스템
    ├── simulation-engine.md           # DES 시뮬레이션 엔진
    └── data-flow.md                   # 전체 데이터 흐름
```

## 설계 문서 작성 가이드

### 각 문서의 구성 (A4 3장 = ~2000자)
1. **개요** (목적, 범위, 핵심 개념)
2. **상세 설계** (구조, 로직, 알고리즘)
3. **데이터 모델** (TypeScript/Python 인터페이스)
4. **구현 체크리스트** (파일별 수정사항, 함수/메서드명 등)

### 사용 규칙
- **필수 정보 포함**: 각 설계는 바로 구현 가능할 정도로 상세해야 함
- **코드 스니펫**: 의사코드 또는 실제 코드 예시 포함
- **파일 경로**: 모든 변경 파일의 상대 경로 명시
- **라인 수**: 주요 변경 부분의 대략적인 라인 수 표기

## 참고
- 각 문서는 독립적이지만, 상호 참조 가능
- 설계 문서 수정 → 코드 구현 순서로 진행
- 구현 후 설계와 코드의 불일치 발견 시 설계를 먼저 업데이트
