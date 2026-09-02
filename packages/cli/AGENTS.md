# archdraw for agents

archdraw never calls an LLM. **You write the YAML; archdraw draws it.** This file is the whole contract — you do not need the repository.

## Three steps

```bash
npx archdraw types postgres            # 1. look the type up. never guess it
cat diagram.yaml | npx archdraw - --check   # 2. validate. exits 1 on failure
cat diagram.yaml | npx archdraw - -o out.png -s 2   # 3. draw
```

`npx archdraw schema` prints the input contract as JSON Schema; `--flat` prints the flat shape only.

## Commands

```
archdraw <input> [-o out] [-p aws,brands] [--theme dark]   # `-` reads stdin. without -o, SVG goes to stdout
archdraw <input> --check                                   # validate only
archdraw types <query> [-p aws,brands]                     # search available types
archdraw schema [--flat]                                   # input contract as JSON Schema
```

`-o` ending in `.png` rasterises, anything else is SVG. `-s` is the PNG scale (0–10, default 2). `--theme` is `light` or `dark`.

## Rules

- **Never guess a `type`.** Run `archdraw types <query>` first. An unresolved type is an error with candidates attached, never a silent substitution — a wrong icon rendered as though it were right makes the diagram lie.
- **A component with no icon takes no `type`.** It renders as a labelled box, which is correct. Do not force a vaguely similar icon onto it.
- **A product and its managed service are different icons.** The deployment decides — self-hosted takes the product's mark from `brands`, a managed offering takes the vendor pack's. `redis` is not `amazon-elasticache`; `postgresql` is not `amazon-rds`.
- **An alias is a shortcut, not a ruling.** `postgres` resolves to `postgresql`, the self-hosted mark, so a managed "RDS Postgres" wants `rds`. Search the vendor pack too and choose between the results.
- **Read the errors and act on them.** They name what is wrong and what to fix. Do not substitute a value of your own.
- **Set `wrap: true` once a diagram runs long.** A chain laid out in one line grows without bound — 200 nodes render as a strip tens of thousands of pixels wide.
- **Group top-level siblings.** Gathering external dependencies and managed services into their own groups stops the picture stretching sideways.
- **But grouping has a price.** An edge whose ends sit in different groups is routed around every group in between, so a boundary drawn between two things that talk a lot makes the picture wider, not narrower. archdraw names those edges after a render and says why — a boundary between a talkative pair, which regrouping fixes, or an edge running against `direction`, which it does not.
- **`direction` is global**, not per-group. `RIGHT` suits a flow in one line; `DOWN` suits stacked tiers.
- **ids take alphanumerics, `-` and `_` only.** Labels may use any script; ids may not.
- **Draw only what is true.** Leave out any component you could not confirm.

## Icon packs

| Pack | What is in it |
|---|---|
| `aws` · `gcp` | Official cloud service icons |
| `brands` | Brand and OSS marks — Redis, nginx, PostgreSQL, Docker, Cloudflare and so on |

Pass several with commas (`-p aws,brands`). One diagram commonly holds both the cloud and the software running on top of it. Without `-p`, the diagram's own `provider` field decides.

## Example

```yaml
provider: aws
direction: RIGHT
nodes:
  - { id: alb, type: alb, label: public alb }
  - { id: api, type: ecs, label: api }
  - { id: cache, type: redis, label: redis (self-hosted) }
  - { id: atlas, label: MongoDB Atlas }
edges:
  - { from: alb, to: api, label: https }
  - { from: api, to: cache, label: cache }
  - { from: api, to: atlas, label: query }
```

```bash
npx archdraw diagram.yaml -p aws,brands -o out.png
```

Full documentation: https://github.com/No1Joon/archdraw
