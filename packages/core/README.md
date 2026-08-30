# @archdraw/core

**English** · [한국어](./README.ko.md)

The whole [archdraw](https://github.com/No1Joon/archdraw) pipeline — parse, validate (zod), flat IR, [ELK](https://eclipse.dev/elk/) layout, SVG.

**It carries no icon assets.** It exposes only the `IconResolver` interface, so icons come separately as packs. It never touches the DOM, so a browser and Node run the same code and get the same SVG.

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
| `renderToSvg(source, options?)` | A YAML/JSON string or a parsed document → an SVG string |
| `parse(source)` | YAML/JSON → an unvalidated document |
| `normalize(doc)` | Validate and flatten to the IR. Throws `DiagramError` on failure |
| `layout(ir)` | Run the ELK layout, returning an `ElkNode` tree |
| `Diagram(props)` | The React element that draws a layout result |
| `createResolver(...packs)` | Fold icon packs into one `IconResolver` |
| `toJsonSchema(form?)` | The input contract as JSON Schema |
| `defaultTheme` | Colours and font stacks. Replace via `options.theme` |

`RenderOptions.icons` accepts a single pack, an array of packs, or a resolver you built yourself.

## Input

Two shapes are accepted — nested (`children`) and flat (`parent`) — and `normalize()` turns both into the same flat IR. The flat shape has no recursion, so a generator can emit it in one pass.

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

Every field is in [`docs/schema.md`](https://github.com/No1Joon/archdraw/blob/main/docs/schema.md).

## Errors

A validation failure throws `DiagramError`, and the message carries what is wrong, why, and the clue to fix it — an unknown slug, a dangling edge, a duplicate id.

```
Unknown type 'lambdaa'.
  Did you mean: lambda?
```

An icon that does not resolve is never silently substituted. Failing beats drawing the wrong icon.

## Icon packs

- [`@archdraw/icons-aws`](https://www.npmjs.com/package/@archdraw/icons-aws)
- [`@archdraw/icons-gcp`](https://www.npmjs.com/package/@archdraw/icons-gcp)
- [`@archdraw/icons-brands`](https://www.npmjs.com/package/@archdraw/icons-brands)

To use it as a CLI instead, [`archdraw`](https://www.npmjs.com/package/archdraw) bundles every pack.

## Licence

MIT
