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
- `pnpm changeset` → `pnpm release`: 버전 제안 후 npm 발행

CLI 표면은 셋뿐이다 — `archdraw <input>` 렌더, `archdraw types <query>` 어휘 검색, `--check` 검증만. 주 사용자는 YAML 을 쓰는 AI CLI 다.

## Architecture

패키지는 전부 `packages/` 아래, 발행명은 `@archdraw/*`(CLI 만 `archdraw`).

- `packages/core`: 파이프라인 전부 — 파싱·검증(zod) → 평면 IR → ELK 레이아웃 → React 로 SVG.
  브라우저와 Node 가 같은 코드를 쓰고 DOM 을 타지 않는다. **아이콘 자산을 갖지 않고** `IconResolver` 인터페이스만 노출한다.
- `packages/icons-aws`·`packages/icons-gcp`: 벤더 SVG + slug/alias 레지스트리. **의존성 0** —
  `IconPack` 타입을 core 에서 import 하지 않고 각자 `src/types.ts` 에 구조적으로 복제해 둔다.
- `packages/react`: `<Architecture />` — core 의 레이아웃을 비동기로 돌려 마운트하는 얇은 층.
- `packages/cli`: 두 아이콘 팩을 모두 번들해 `npx archdraw` 가 바로 동작한다. core 는 그러지 않는다.
- `scripts/sync-icons.ts`: **네트워크를 타는 유일한 코드.** 빌드·CI 는 커밋된 SVG 만 읽는다.

`packages/*/src/generated.ts` 는 `pnpm icons:sync` 산출물이므로 손으로 고치지 않는다.

## Skills

- `.claude/skills/smart-commit/SKILL.md` — 스테이지된 변경으로 원자적 커밋 메시지 작성(`AD-<번호>` 이슈 ID 추출)

## Environment

- Node 22+, pnpm 10. `pnpm icons:sync` 는 `unzip` 을 쓴다.

## References

- `README.md` — 진입점. `docs/` 로 연결
- `docs/schema.md` — 입력 계약(필드·두 형태·거부 규칙). `archdraw schema` 가 같은 계약을 JSON Schema 로 낸다
- `docs/agents.md` — 에이전트 사용법
- `scripts/icon-sources.json` — 프로바이더별 아이콘 배포본 URL·슬러그 규칙
