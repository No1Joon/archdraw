# @archdraw/core

[archdraw](https://github.com/No1Joon/archdraw) 의 파이프라인 전부 — 파싱·검증(zod) → 평면 IR → [ELK](https://eclipse.dev/elk/) 레이아웃 → SVG.

**아이콘 자산을 갖지 않는다.** `IconResolver` 인터페이스만 노출하므로 아이콘은 팩으로 따로 넣는다. DOM 을 타지 않아 브라우저와 Node 가 같은 코드로 같은 SVG 를 낸다.

```bash
npm i @archdraw/core @archdraw/icons-aws
```

```ts
import { renderToSvg } from '@archdraw/core'
import { awsIcons } from '@archdraw/icons-aws'

const svg = await renderToSvg(
  `
nodes:
  - { id: alb, type: alb, label: public alb }
  - { id: api, type: ecs, label: api }
edges:
  - { from: alb, to: api, label: https }
`,
  { icons: awsIcons },
)
```

## API

| | |
|---|---|
| `renderToSvg(source, options?)` | YAML·JSON 문자열이나 파싱된 문서 → SVG 문자열 |
| `parse(source)` | YAML·JSON → 미검증 문서 |
| `normalize(doc)` | 검증하고 평면 IR 로. 실패하면 `DiagramError` |
| `layout(ir)` | ELK 레이아웃을 돌려 `ElkNode` 트리로 |
| `Diagram(props)` | 레이아웃 결과를 그리는 React 엘리먼트 |
| `createResolver(...packs)` | 아이콘 팩들을 하나의 `IconResolver` 로 |
| `toJsonSchema(form?)` | 입력 계약을 JSON Schema 로 |
| `defaultTheme` | 색·폰트 스택. `options.theme` 으로 교체한다 |

`RenderOptions.icons` 는 팩 하나, 팩 배열, 직접 만든 리졸버 중 아무거나 받는다.

## 입력

중첩 형(`children`)과 평면 형(`parent`) 두 가지를 받고, `normalize()` 가 둘을 같은 평면 IR 로 만든다. 평면 형은 재귀가 없어 생성기가 한 번에 뱉기 쉽다.

```yaml
groups:
  - id: vpc
    label: Production VPC
    kind: vpc
    children:
      - { id: api, type: ecs, label: API }
```

```yaml
nodes:
  - { id: vpc, kind: vpc, label: Production VPC }
  - { id: api, type: ecs, label: API, parent: vpc }
```

전체 필드는 [`docs/schema.md`](https://github.com/No1Joon/archdraw/blob/main/docs/schema.md) 에 있다.

## 오류

검증 실패는 `DiagramError` 로 던지고, 메시지에 무엇이 왜 틀렸는지와 고칠 단서를 담는다 — 없는 slug, 끊긴 edge, 중복 id.

```
Unknown type 'lambdaa'.
  Did you mean: lambda?
```

해석되지 않는 아이콘은 조용히 대체되지 않는다. 잘못된 아이콘이 그려지는 것보다 실패가 낫다.

## 아이콘 팩

- [`@archdraw/icons-aws`](https://www.npmjs.com/package/@archdraw/icons-aws)
- [`@archdraw/icons-gcp`](https://www.npmjs.com/package/@archdraw/icons-gcp)
- [`@archdraw/icons-brands`](https://www.npmjs.com/package/@archdraw/icons-brands)

CLI 로 쓰려면 [`archdraw`](https://www.npmjs.com/package/archdraw) 가 팩을 전부 번들해 둔다.

## 라이선스

MIT
