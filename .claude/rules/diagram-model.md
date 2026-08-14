---
paths:
  - packages/core/src/**
  - packages/ai/src/**
---

# 다이어그램 모델

- 입력은 두 가지 형태를 받는다: 사람이 쓰는 중첩 형(`children`)과 평면 형(`parent` 참조). `normalize()` 가 둘을 하나의 평면 IR 로 만들고, 이후 모든 단계는 평면 IR 만 본다.
- `@archdraw/ai` 는 평면 형만 생성한다. structured outputs 는 재귀 JSON Schema 를 지원하지 않으므로 중첩 형은 스키마로 강제할 수 없다.
- `packages/ai/src/schema.ts` 의 JSON Schema 는 core 의 zod 스키마에서 파생하지 않고 손으로 유지한다. 문서화된 스키마 부분집합에 대한 와이어 계약이라 변환기의 출력에 맡기지 않는다. 대신 응답은 항상 core 로 다시 검증한다.
- 검증 실패는 `DiagramError` 로 던지고 메시지는 모델이 그대로 읽고 고칠 수 있게 쓴다 — `@archdraw/ai` 의 재시도 루프가 이 문자열을 되먹인다.
- structured outputs 가 형식을 보장하므로 재시도 루프가 다루는 것은 의미 오류뿐이다(없는 slug, 끊긴 edge, type 을 가진 group).
- 렌더는 DOM 을 건드리지 않는다. 브라우저와 CLI 가 같은 컴포넌트로 동일한 SVG 를 내야 스냅샷 테스트가 두 환경을 함께 지킨다.
- SVG 스냅샷은 레이아웃 회귀 감시 장치다. 스냅샷이 바뀌면 렌더 결과를 실제로 확인하고 갱신한다.
