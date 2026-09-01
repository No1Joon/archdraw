# archdraw

> 역할: 단일 repo

프롬프트 또는 YAML 로 클라우드 아키텍처 다이어그램(SVG/PNG)을 그리는 TypeScript 모노레포.
pnpm workspaces · tsdown(rolldown) · vitest · Biome · changesets. Node 22+.

## Commands

- `pnpm build`: 전 패키지 빌드 (tsdown, ESM + d.mts)
- `pnpm test`: vitest — core 의 SVG 스냅샷 포함
- `pnpm typecheck`: 패키지별 `tsc --noEmit`
- `pnpm lint` / `pnpm format`: Biome 검사 / 자동 수정
- `pnpm icons:sync <aws|gcp> [--from <zip>]`: 공식 아이콘 배포본에서 아이콘 패키지 재생성
- `pnpm changeset`: 변경마다 changeset 추가. 발행은 CI 몫이라 `pnpm release` 를 손으로 돌리지 않는다

CLI 표면은 넷뿐이다 — `archdraw <input>` 렌더, `archdraw types <query>` 어휘 검색, `archdraw schema` 입력 계약 출력, `--check` 검증. 주 사용자는 YAML 을 쓰는 AI CLI 다.

## Architecture

패키지는 전부 `packages/` 아래, 발행명은 `@archdraw/*`(CLI 만 `archdraw`).

- `packages/core`: 파이프라인 전부 — 파싱·검증(zod) → 평면 IR → ELK 레이아웃 → React 로 SVG.
  브라우저와 Node 가 같은 코드를 쓰고 DOM 을 타지 않는다. **아이콘 자산을 갖지 않고** `IconResolver` 인터페이스만 노출한다.
- `packages/icons-aws`·`packages/icons-gcp`·`packages/icons-brands`: 벤더 SVG + slug/alias 레지스트리. **의존성 0** —
  `IconPack` 타입을 core 에서 import 하지 않고 각자 `src/types.ts` 에 구조적으로 복제해 둔다.
- `packages/react`: `<Architecture />` — core 의 레이아웃을 비동기로 돌려 마운트하는 얇은 층.
- `packages/cli`: 세 아이콘 팩과 PNG 래스터화용 폰트를 번들해 `npx archdraw` 가 바로 동작한다. core 는 그러지 않는다.
  `fonts/` 는 시스템 폰트를 쓰지 않기 위한 것이고 정적 폰트로 바꾸면 글자가 사라진다 — `packages/cli/fonts/README.md`.
- `scripts/sync-icons.ts`: 아이콘 배포본을 받는 유일한 코드. 빌드·테스트는 커밋된 SVG 만 읽는다.
- `scripts/smoke-published.sh`: 발행 뒤 registry 에서 CLI 를 설치해 렌더까지 확인한다. 워크스페이스 검사는 전부 통과해도 registry 반영 지연으로 설치가 깨질 수 있다.

`packages/*/src/generated.ts` 는 `pnpm icons:sync` 산출물이므로 손으로 고치지 않는다.

## Release

main 푸시 → Release 워크플로가 버전 PR 을 연다. 그 PR 을 머지하면 발행된다.
npm trusted publishing(OIDC)으로 나가므로 토큰이 없다 — 신뢰 발행자는 패키지 단위라 새 패키지를 추가하면 npmjs.com 에서 그 패키지에 한 번 등록해야 한다(`No1Joon` / `archdraw` / `release.yml` / `npm publish`).
`release.yml` 의 npm 11 고정과 `registry-url` 부재는 OIDC 교환 조건이다 — 주석 참조.

## Invariants

다이어그램 모델 — `packages/core/src`

- 입력은 중첩 형(`children`)과 평면 형(`parent` 참조) 둘을 받는다. `normalize()` 가 하나의 평면 IR 로 만들고 이후 모든 단계는 평면 IR 만 본다.
- 평면 형은 생성기를 위한 것이다. 재귀가 없어 스키마로 강제하거나 한 번에 뱉기 쉽다.
- 검증 실패는 `DiagramError` 로 던지고, 메시지에 무엇이 왜 틀렸는지와 고칠 단서를 담는다.
- 렌더는 DOM 을 건드리지 않는다. 브라우저와 CLI 가 같은 컴포넌트로 동일한 SVG 를 내야 스냅샷이 두 환경을 함께 지킨다.
- SVG 스냅샷은 레이아웃 회귀 감시 장치다. 스냅샷이 바뀌면 렌더 결과를 눈으로 확인하고 갱신한다.
- 점선은 컨테이너 경계(`6 4` 대시)의 것이다. `style: dashed` 엣지는 둥근 점(`1 5`)을 써서 겹치지 않게 한다.

아이콘 — `packages/icons-*` · `packages/core/src/icons.ts` · `scripts/sync-icons.ts`

- 아이콘 갱신은 `pnpm icons:sync <provider>` 를 사람이 돌리고 `git diff` 를 눈으로 확인한 뒤 커밋하는 의도적 행위다. 빌드·CI 는 아이콘을 내려받지 않는다.
- 해석되지 않는 `type:` 은 에러다. 가장 가까운 아이콘으로 조용히 대체하지 않고 유사 후보를 붙인다.
- `aliases.ts` 는 사람이 관리하고 canonical slug 는 생성물이다. sync 는 존재하지 않는 slug 를 가리키는 alias 가 있으면 실패한다.
- 여러 아이콘이 한 SVG 문서에 인라인되므로 sync 는 SVGO `prefixIds` 로 id 를 접두한다. 끄면 그라디언트·클립패스 id 가 충돌해 엉뚱한 도형이 칠해진다.
- 각 아이콘 패키지의 `NOTICE` 는 코드(MIT)와 아이콘 자산(프로바이더 소유)의 라이선스가 다르다는 사실을 담는다. 프로바이더를 추가하면 `NOTICE` 도 함께 추가한다.

주석·커밋

- 주석은 한 줄 사실로 쓴다. 경위·추론 과정은 PR 본문과 git history 가 갖는다. 한 줄 안에서 이유를 잇는 것은 위반이 아니다.
- 커밋 메시지는 `<type>: <summary>` — 명령형, 72자 이내, 마침표 없음. AI 를 가리키는 trailer 는 붙이지 않는다.

## Environment

- Node 22+, pnpm 10. `pnpm icons:sync` 는 `unzip` 을 쓴다.

## References

- `README.md` — 진입점. `docs/` 로 연결
- `docs/schema.md` — 입력 계약(필드·두 형태·거부 규칙). `archdraw schema` 가 같은 계약을 JSON Schema 로 낸다
- `docs/agents.md` — 에이전트 사용법. `packages/cli/AGENTS.md` 가 이걸 자족형으로 줄인 사본이고 그쪽만 npm tarball 에 실린다 — 규칙을 고치면 둘 다 고친다
- `scripts/icon-sources.json` — 프로바이더별 아이콘 배포본 URL·슬러그 규칙
