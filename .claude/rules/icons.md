---
paths:
  - packages/icons-*/**
  - packages/core/src/icons.ts
  - packages/cli/src/**
  - scripts/sync-icons.ts
---

# 아이콘

- 아이콘 SVG 는 repo 에 커밋한다. 빌드와 CI 는 아이콘을 다운로드하지 않는다 — 업스트림 URL 이 바뀌어도 빌드는 깨지지 않아야 한다.
- 아이콘 갱신은 `pnpm icons:sync <provider>` 를 사람이 돌리고 `git diff` 를 눈으로 확인한 뒤 커밋하는 의도적 행위다.
- 해석되지 않는 `type:` 은 에러다. 가장 가까운 아이콘으로 조용히 대체하지 않는다 — 틀린 아이콘이 맞는 것처럼 렌더되면 다이어그램이 거짓말을 하고, `@archdraw/ai` 는 고칠 신호를 못 받는다. 에러에는 유사 후보를 붙인다.
- `aliases.ts` 는 사람이 관리하고 canonical slug 는 생성물이다. sync 는 존재하지 않는 slug 를 가리키는 alias 가 있으면 실패한다.
- 여러 아이콘이 한 SVG 문서에 인라인되므로 sync 는 SVGO `prefixIds` 로 id 를 접두한다. 접두를 끄면 그라디언트·클립패스 id 가 충돌해 엉뚱한 도형이 칠해진다.
- 아이콘 패키지는 core 를 포함해 어떤 런타임 의존성도 갖지 않는다. `IconPack` 타입은 각 패키지의 `src/types.ts` 에 복제해 구조적으로 맞춘다.
- 각 아이콘 패키지의 `NOTICE` 는 코드(MIT)와 아이콘 자산(각 프로바이더 소유)의 라이선스가 다르다는 사실을 담는다. 프로바이더를 추가하면 `NOTICE` 도 함께 추가한다.
