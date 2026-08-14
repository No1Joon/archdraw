# archdraw

프롬프트 또는 YAML 로 클라우드 아키텍처 다이어그램을 그리는 React 기반 라이브러리·CLI.

```bash
npm i @archdraw/core @archdraw/icons-aws
npx archdraw diagram.yaml -o out.svg
```

## 패키지

| 패키지 | 역할 |
|---|---|
| `@archdraw/core` | 파싱·검증·ELK 레이아웃·SVG 렌더. 아이콘 자산 없음 |
| `@archdraw/react` | `<Architecture />` 컴포넌트 |
| `@archdraw/icons-aws` | AWS 공식 아이콘 + slug/alias 레지스트리 |
| `@archdraw/icons-gcp` | Google Cloud 공식 아이콘 + slug/alias 레지스트리 |
| `@archdraw/ai` | 자연어 프롬프트 → 검증된 DSL (Anthropic SDK, 옵셔널) |
| `archdraw` | CLI — SVG·PNG 내보내기 |

## 입력

사람이 쓰는 중첩 형과 `@archdraw/ai` 가 생성하는 평면 형을 모두 받아 내부에서 평면 IR 로 정규화한다.

```yaml
provider: aws
groups:
  - id: vpc
    label: Production VPC
    kind: vpc
    children:
      - { id: alb, type: alb }
      - { id: api, type: ecs, label: API Service }
edges:
  - { from: alb, to: api, label: HTTPS }
```

## 개발

```bash
pnpm install
pnpm build          # tsdown
pnpm test           # vitest (SVG 스냅샷)
pnpm icons:sync aws # 공식 아이콘 배포본 → packages/icons-aws/svg
pnpm changeset      # 버전 제안
```

## 라이선스

코드는 MIT. `@archdraw/icons-*` 의 SVG 자산은 각 클라우드 제공자 소유이며 해당 약관을 따른다 — 각 패키지의 `NOTICE` 참조.
