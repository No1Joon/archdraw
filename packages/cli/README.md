# archdraw

**English** · [한국어](./README.ko.md)

A CLI that draws cloud architecture diagrams (SVG/PNG) from YAML. Bundles 793 AWS · 216 GCP · 3,453 brand/OSS icons plus a font, so `npx` works straight away.

**Built for AI CLIs** — archdraw never calls an LLM. The agent writes the YAML; archdraw draws it.

![web-app example](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/web-app.png)

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

A node with a `type` is drawn as a vendor icon; one without is drawn as a labelled box.

## Commands

```bash
archdraw <input> [-o out] [-p aws,brands] [--theme dark]  # render. `-` reads stdin; without -o, writes stdout
archdraw <input> --check                                  # validate only. exits 1 on failure
archdraw types <query> [-p aws,brands]                    # search the types you can use
archdraw schema [--flat]                                  # print the input contract as JSON Schema
```

| Option | |
|---|---|
| `-o, --out <file>` | `.png` rasterises, anything else is SVG. Omit for stdout |
| `-p, --provider <names>` | Icon packs to load. Comma-separated (`aws,gcp,brands`). Defaults to the diagram's own `provider` |
| `-s, --scale <n>` | PNG scale factor, between 0 and 10. Defaults to `2` |
| `--theme <name>` | `light` or `dark`. Defaults to `light` |
| `--check` | Validate without writing anything |

## Using it from an agent

Find the vocabulary with `types`, validate with `--check`, then render.

```bash
npx archdraw types redis -p aws,brands   # see which slugs exist
npx archdraw diagram.yaml --check        # on exit 1, stderr carries the clue to fix
npx archdraw diagram.yaml -o out.png
```

A `type` that does not resolve fails with candidates rather than being silently substituted — better than drawing the wrong icon.

```
Unknown type 'lambdaa'.
  Did you mean: lambda?
```

For the machine-readable input contract, `npx archdraw schema` emits JSON Schema.

## PNG fonts

Rasterising uses the bundled Noto Sans KR alone and never a system font — the same input yields the same PNG on any machine. Latin and the full Hangul range are covered; CJK beyond Hangul and emoji are out of range.

## Docs

- [Input contract](https://github.com/No1Joon/archdraw/blob/main/docs/schema.md) — every field, both input shapes, what gets rejected
- [Using it from an agent](https://github.com/No1Joon/archdraw/blob/main/docs/agents.md)
- [Repository](https://github.com/No1Joon/archdraw)

## Licence

The code is MIT. Icon and font assets belong to their owners and follow their own terms — see `NOTICE` and `fonts/OFL.txt`.
