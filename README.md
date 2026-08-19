# archdraw

YAML 로 클라우드 아키텍처 다이어그램(SVG/PNG)을 그리는 CLI·라이브러리. AWS 747 · GCP 216 개의 공식 아이콘을 쓴다.

**AI CLI 가 쓰라고 만들었다** — archdraw 는 LLM 을 호출하지 않고, 에이전트가 YAML 을 쓰면 archdraw 가 그린다.

```bash
cat <<'YAML' | npx archdraw - -o out.png
provider: aws
nodes:
  - { id: alb, type: alb, label: public alb }
  - { id: api, type: ecs, label: api }
  - { id: atlas, label: MongoDB Atlas }
edges:
  - { from: alb, to: api, label: https }
  - { from: api, to: atlas, label: query }
YAML
```

## 문서

| | |
|---|---|
| [`docs/schema.md`](./docs/schema.md) | 입력 계약 — 전체 필드, 두 가지 입력 형태, 거부되는 것 |
| [`docs/agents.md`](./docs/agents.md) | 에이전트 사용법 — 어휘 탐색 → 검증 → 렌더 |

기계가 읽을 형태는 `npx archdraw schema` 가 JSON Schema 로 낸다. zod 정의에서 파생하므로 문서와 어긋나지 않는다.

## CLI

```bash
archdraw <input> [-o out] [-p aws|gcp] [-s 2]   # 렌더. input 이 - 면 stdin, -o 생략 시 stdout
archdraw <input> --check                        # 검증만. 실패 시 exit 1
archdraw types <query> [-p aws|gcp]             # 쓸 수 있는 type 검색
archdraw schema [--flat]                        # 입력 계약을 JSON Schema 로
```

해석되지 않는 `type` 은 조용히 대체되지 않고 후보와 함께 실패한다.

```
Unknown type 'lambdaa'.
  Did you mean: lambda?
```

## 패키지

| 패키지 | 역할 |
|---|---|
| `archdraw` | CLI. 두 아이콘 팩을 번들해 `npx` 로 바로 동작한다 |
| `@archdraw/core` | 파싱·검증·ELK 레이아웃·SVG 렌더. 아이콘 자산 없음 |
| `@archdraw/react` | `<Architecture />` 컴포넌트 |
| `@archdraw/icons-aws` · `@archdraw/icons-gcp` | 공식 아이콘 + slug/alias 레지스트리. 의존성 0 |

## 개발

```bash
pnpm install
pnpm build          # tsdown
pnpm test           # vitest
pnpm icons:sync aws # 공식 아이콘 배포본 → packages/icons-aws/svg
pnpm changeset      # 버전 제안
```

## 라이선스

코드는 MIT. `@archdraw/icons-*` 의 SVG 자산은 각 클라우드 제공자 소유이며 해당 약관을 따른다 — 각 패키지의 `NOTICE` 참조.
