# archdraw

**English** · [한국어](./README.ko.md)

A CLI and library that draws cloud architecture diagrams (SVG/PNG) from YAML. Ships 793 AWS · 216 GCP · 3,453 brand/OSS icons.

**Built for AI CLIs** — archdraw never calls an LLM. The agent writes the YAML; archdraw draws it.

![web-app example](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/web-app.png)

That picture is [`examples/web-app.yaml`](./examples/web-app.yaml), rendered as-is.

```bash
npx archdraw examples/web-app.yaml -p aws,brands -o web-app.png
```

## Getting started

No install needed:

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

A node with a `type` is drawn as a vendor icon; one without is drawn as a labelled box — so a third party with no icon still makes it into the picture.

## CLI

```bash
archdraw <input> [-o out] [-p aws,brands] [-s 2]  # render. `-` reads stdin; without -o, writes stdout
archdraw <input> --check                          # validate only. exits 1 on failure
archdraw types <query> [-p aws,brands]            # search the types you can use
archdraw schema [--flat]                          # print the input contract as JSON Schema
```

| Option | |
|---|---|
| `-o, --out <file>` | `.png` rasterises, anything else is SVG. Omit for stdout |
| `-p, --provider <names>` | Icon packs to load. Comma-separated (`aws,gcp,brands`). Defaults to `aws` |
| `-s, --scale <n>` | PNG scale factor. Defaults to `2` |
| `--check` | Validate without writing anything |

A `type` that does not resolve fails with candidates rather than being silently substituted — better than drawing the wrong icon.

```
Unknown type 'lambdaa'.
  Did you mean: lambda?
```

## Input

Two shapes are accepted. People find the nested shape (`children`) easier; generators find the recursion-free flat shape (`parent`) easier. Both produce the same picture.

```yaml
# nested
groups:
  - id: vpc
    label: Production VPC
    kind: vpc
    children:
      - { id: api, type: ecs, label: API }
```

```yaml
# flat
nodes:
  - { id: vpc, kind: vpc, label: Production VPC }
  - { id: api, type: ecs, label: API, parent: vpc }
```

Every field is in [`docs/schema.md`](./docs/schema.md). For the machine-readable form, `npx archdraw schema` emits JSON Schema derived from the zod definitions, so it cannot drift from the docs.

## Examples

The syntax does not change with scale. Every picture below is YAML from `examples/`, rendered as-is.

```bash
npx archdraw examples/startup.yaml -p aws,brands -o startup.png
```

### Early — [`examples/startup.yaml`](./examples/startup.yaml)

Single AZ. One EC2 instance is the whole application; everything else is managed.

![startup example](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/startup.png)

### Growing — [`examples/growth.yaml`](./examples/growth.yaml)

Multi-AZ. The monolith is split into ECS services, with queues, cache, a read replica and observability pulled apart.

![growth example](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/growth.png)

### Large — [`examples/enterprise.yaml`](./examples/enterprise.yaml)

Accounts draw the boundaries and two regions run in parallel. EKS, Aurora Global and MSK carry a data platform and a shared-services account on top.

![enterprise example](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/enterprise.png)

## Docs

| | |
|---|---|
| [`docs/schema.md`](./docs/schema.md) | The input contract — every field, both input shapes, what gets rejected |
| [`docs/agents.md`](./docs/agents.md) | Using it from an agent — explore vocabulary → validate → render |
| [`examples/`](./examples) | The source YAML for the four [examples](#examples) above |

## Packages

| Package | Role |
|---|---|
| [`archdraw`](./packages/cli) | The CLI. Bundles all three icon packs and a font, so `npx` works straight away |
| [`@archdraw/core`](./packages/core) | Parse, validate, ELK layout, SVG render. Carries no icon assets |
| [`@archdraw/react`](./packages/react) | The `<Architecture />` component |
| [`@archdraw/icons-aws`](./packages/icons-aws) · [`@archdraw/icons-gcp`](./packages/icons-gcp) | Official cloud icons plus a slug/alias registry. Zero dependencies |
| [`@archdraw/icons-brands`](./packages/icons-brands) | Brand and OSS icons (Simple Icons, CC0). Redis, nginx, MongoDB and friends |

## About the rendering

- The SVG renderer never touches the DOM. A browser and Node run the same code and get the same result.
- PNGs rasterise with the bundled Noto Sans KR alone — no reliance on system fonts, so the same input gives the same picture on any machine. See [`packages/cli/fonts`](./packages/cli/fonts) for the Latin and Hangul coverage.
- [ELK](https://eclipse.dev/elk/) does the layout. Edges route orthogonally and steer around the icons.

## Development

```bash
pnpm install
pnpm build          # tsdown (ESM + d.mts)
pnpm test           # vitest — includes core's SVG snapshots
pnpm typecheck
pnpm lint           # biome
pnpm icons:sync aws # official icon distribution → packages/icons-aws/svg
pnpm changeset      # propose a version
```

Node 22+, pnpm 10. `pnpm icons:sync` uses `unzip`.

## Licence

The code is MIT. Icon and font assets belong to their owners and follow their own terms — see each package's `NOTICE`.
