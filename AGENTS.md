# archdraw

> 역할: 단일 repo
> 재개 노트: `temp-memory.md`(gitignore) — 있으면 **세션 시작 때 읽고, 수행한 뒤 지운다.**

프롬프트 또는 YAML 로 클라우드 아키텍처 다이어그램(SVG/PNG)을 그리는 TypeScript 모노레포.
pnpm workspaces · tsdown(rolldown) · vitest · Biome · changesets. Node 22+.

## Commands

- `pnpm build`: 전 패키지 빌드 (tsdown, ESM + d.mts)
- `pnpm test`: vitest — core 의 SVG 스냅샷 포함
- `pnpm typecheck`: 패키지별 `tsc --noEmit`
- `pnpm lint` / `pnpm format`: Biome 검사 / 자동 수정
- `pnpm icons:sync <aws|gcp> [--from <zip>]`: 공식 아이콘 배포본에서 아이콘 패키지 재생성
- `pnpm changeset`: 변경마다 changeset 추가. 발행은 CI 몫이라 `pnpm release` 를 손으로 돌리지 않는다

CLI 표면은 다섯이다 — `archdraw <input>` 렌더, `archdraw types <query>` 어휘 검색, `archdraw schema` 입력 계약 출력, `--check` 검증, `archdraw serve <file> --watch` 저장 시 다시 그리는 로컬 미리보기. 주 사용자는 YAML 을 쓰는 AI CLI 다.

## Architecture

패키지는 전부 `packages/` 아래, 발행명은 `@archdraw/*`(CLI 만 `archdraw`).

- `packages/core`: 파이프라인 전부 — 파싱·검증(zod) → 평면 IR → 시나리오·그룹 보기 선택 → ELK 레이아웃 → React 로 SVG.
  브라우저와 Node 가 같은 코드를 쓰고 DOM 을 타지 않는다. **아이콘 자산을 갖지 않고** `IconResolver` 인터페이스만 노출한다.
- `packages/icons-aws`·`packages/icons-gcp`·`packages/icons-brands`: 벤더 SVG + slug/alias 레지스트리. **의존성 0** —
  `IconPack` 타입을 core 에서 import 하지 않고 각자 `src/types.ts` 에 구조적으로 복제해 둔다.
- `packages/react`: `<Architecture />` — core 의 레이아웃을 비동기로 돌려 마운트하는 얇은 층.
- `packages/cli`: 세 아이콘 팩과 PNG 래스터화용 폰트를 번들해 `npx archdraw` 가 바로 동작한다. core 는 그러지 않는다.
  `fonts/` 는 시스템 폰트를 쓰지 않기 위한 것이고 정적 폰트로 바꾸면 글자가 사라진다 — `packages/cli/fonts/README.md`.
- `scripts/build-viewer.ts`: core 빌드 전에 동일한 배치·렌더 코드를 오프라인 HTML용 IIFE로 번들한다. `viewer-bundle.generated.ts`는 gitignore 빌드 산출물이고 원본은 `viewer.ts`다.
- `packages/core/src/diagnostics.ts`: 배치 결과의 우회·라벨·교차를 진단하며 CLI `--diagnostics`가 JSON을 출력한다.
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
- 그룹 컨테이너 경계는 기본 실선이다. `style: dashed` 엣지는 둥근 점(`1 5`)으로 그린다.

아이콘 — `packages/icons-*` · `packages/core/src/icons.ts` · `scripts/sync-icons.ts`

- 아이콘 갱신은 `pnpm icons:sync <provider>` 를 사람이 돌리고 `git diff` 를 눈으로 확인한 뒤 커밋하는 의도적 행위다. 빌드·CI 는 아이콘을 내려받지 않는다.
- 해석되지 않는 `type:` 은 에러다. 가장 가까운 아이콘으로 조용히 대체하지 않고 유사 후보를 붙인다.
- `aliases.ts` 는 사람이 관리하고 canonical slug 는 생성물이다. sync 는 존재하지 않는 slug 를 가리키는 alias 가 있으면 실패한다.
- 여러 아이콘이 한 SVG 문서에 인라인되므로 sync 는 SVGO `prefixIds` 로 id 를 접두한다. 끄면 그라디언트·클립패스 id 가 충돌해 엉뚱한 도형이 칠해진다.
- 각 아이콘 패키지의 `NOTICE` 는 코드(MIT)와 아이콘 자산(프로바이더 소유)의 라이선스가 다르다는 사실을 담는다. 프로바이더를 추가하면 `NOTICE` 도 함께 추가한다.

주석·커밋

- 주석은 한 줄 사실로 쓴다. 경위·추론 과정은 PR 본문과 git history 가 갖는다. 한 줄 안에서 이유를 잇는 것은 위반이 아니다.
- 커밋 메시지는 `<type>: <summary>` — 명령형, 72자 이내, 마침표 없음. AI 를 가리키는 trailer 는 붙이지 않는다 — 세션 링크(`Claude-Session:`)·생성 표기도 같다.

## Environment

- Node 22+, pnpm 10. `pnpm icons:sync` 는 `unzip` 을 쓴다.

## References

- `README.md` — 진입점. `docs/` 로 연결
- `docs/schema.md` — 입력 계약(필드·두 형태·거부 규칙). `archdraw schema` 가 같은 계약을 JSON Schema 로 낸다
- `docs/agents.md` — 에이전트 사용법. `packages/cli/AGENTS.md` 가 이걸 자족형으로 줄인 사본이고 그쪽만 npm tarball 에 실린다 — 규칙을 고치면 둘 다 고친다
- `scripts/icon-sources.json` — 프로바이더별 아이콘 배포본 URL·슬러그 규칙

## AMP 요청·회신

프로젝트 간 통신은 `/Users/joon/Documents/projects/all-my-projects/docs/projects/README.md`의 POP 접수함을 사용한다.
Archdraw 담당은 `archdraw-request.md`를 작성하고 AMP가 작성한 `archdraw-amp.md`는 읽는다.
결과·결정은 프로젝트 정본에 보존하며, 상대 인수 확인 뒤 각 작성자가 자기 파일의 완료 본문만 비운다.
수신·구현·로컬 검사·운영 적용은 구분하고 기존 작업 승인 범위를 유지한다.

<!-- pr-ui-shots:start -->
# UI PR 전후 스크린샷

UI가 바뀌는 PR을 열거나 그 PR에 새 커밋을 푸시할 때 `$pr-ui-shots` (`~/.codex/skills/pr-ui-shots/SKILL.md`)를 적용한다. UI PR은 새 HEAD마다 캡처한다. 도구·CI·문서·서버만의 PR은 제외한다.

- 이 저장소에는 Storybook이 없다. 다이어그램 변경은 실제 core 렌더러와 CLI의 PNG 래스터화 경로로 같은 fixture를 main/HEAD에서 그려 비교하고, Storybook·브라우저 화면 미검증 범위를 명시한다.

- main과 현재 HEAD의 실제 Storybook 컴포넌트를 같은 데이터·테마·폭으로 확인한다. 기본 폭과 iPhone SE 급 최소 폭, 글자 크기 변경이면 큰 글씨도 찍는다. 스토리에 없는 화면 단위 변경은 동일 기기·데이터의 시뮬레이터를 사용한다.
- `~/.cache/pr-shots/<GitHub repo 이름>/pr-<HEAD7>/`에 `<번호>-<장면>.before.png`(main)·같은 이름의 `.after.png`(HEAD)를 저장한다. 실제 PNG이며 빈 화면·로딩·오류 화면을 성공으로 남기지 않는다. main에 대응 UI가 없으면 그 사실을 밝히고 임의 이전 커밋으로 대체하지 않는다.
- 현재 HEAD로 새로 캡처하고 `python3 .agents/scripts/pr_ui_shots.py --repo .` 및 해당 폴더 `ls`로 모든 짝을 확인한다. 개인정보·토큰은 캡처에 넣지 않는다. 쓰기가 sandbox로 막히면 우회하지 않고 알린다.
- 웹 예시와 네이티브 구현이 다르면 실제 네이티브 화면도 확인한다. 소스/HEAD 변경 후 이전 캡처를 새 증거로 복사하지 않는다. 확인한 이미지·플랫폼·미완료를 보고한다.
<!-- pr-ui-shots:end -->
