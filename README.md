# archdraw

YAML 로 클라우드 아키텍처 다이어그램(SVG/PNG)을 그리는 CLI·라이브러리. AWS 747 · GCP 216 개의 공식 아이콘을 쓴다.

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
| `archdraw` | CLI — SVG·PNG 내보내기 |

## CLI

에이전트가 쓰기 좋게 만들어졌다 — 어휘를 물어보고, 파이프로 넣고, 그리기 전에 검증한다.

```bash
archdraw types cache             # 쓸 수 있는 type 검색 (별칭 → canonical slug)
archdraw types sql -p gcp

cat diagram.yaml | archdraw - --check    # 렌더 없이 검증만. 실패 시 exit 1
cat diagram.yaml | archdraw - -o out.png -s 2
archdraw diagram.yaml -o out.svg
```

해석되지 않는 `type:` 은 조용히 대체하지 않고 후보와 함께 실패한다.

```
Unknown type 'lambdaa'.
  Did you mean: lambda?
```

## 입력

사람이 쓰는 중첩 형과 생성기가 뱉는 평면 형을 모두 받아 내부에서 평면 IR 로 정규화한다.

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
