# Using it from an agent

**English** · [한국어](./agents.ko.md)

archdraw never calls an LLM. **The agent writes the YAML; archdraw draws it.**

## Three steps

```bash
# 1. Find the types you can use — do not guess
npx archdraw types postgres
npx archdraw types run -p gcp
npx archdraw types redis -p aws,brands   # with several packs, both show up

# 2. Validate without rendering — fast, and exits 1 on failure
cat diagram.yaml | npx archdraw - --check

# 3. Draw it
cat diagram.yaml | npx archdraw - -o out.png -s 2
npx archdraw diagram.yaml -o out.svg          # a file works too
npx archdraw diagram.yaml                     # without -o, SVG goes to stdout
```

The input contract is in [`schema.md`](./schema.md), and the same content is available in machine-readable form.

```bash
npx archdraw schema          # JSON Schema (nested shape included)
npx archdraw schema --flat   # the flat shape only
```

## Treat the errors as signal

Messages are written to be read and acted on directly. Do not substitute a value of your own — fix what the message asks for.

```
$ echo 'nodes: [{ id: a, type: lambdaa }]' | archdraw - --check
Unknown type 'lambdaa'.
  Did you mean: lambda?
```

A `type` that does not resolve is **never** replaced with a similar icon. A wrong icon rendered as though it were right makes the diagram lie.

## Choosing packs

| Pack | What is in it |
|---|---|
| `aws` · `gcp` | Official cloud service icons |
| `brands` | Brand and OSS marks — Redis, nginx, PostgreSQL, Docker, Cloudflare and so on |

Pass several with commas, as in `-p aws,brands`. One diagram commonly holds both the cloud and the software running on top of it.

**Distinguish two icons that name the same thing** — `redis` (Redis itself) and `amazon-elasticache` (the AWS managed service) are not the same. Putting the managed icon on something self-hosted makes the picture lie.

## Components with no icon

Omit `type` and the node is drawn as a labelled box. Use it for things none of the three packs carry, such as an internal service. Do not force a vaguely similar icon onto it.

```yaml
nodes:
  - { id: api, type: ecs, label: api }
  - { id: atlas, label: MongoDB Atlas }   # no icon — drawn as a box
edges:
  - { from: api, to: atlas, label: query }
```

## Rules for a diagram that reads well

- **Group the top-level siblings.** Gathering external dependencies and managed services into their own groups stops the picture stretching sideways and makes the boundaries visible.
- **`direction` is global.** It cannot vary per group. `RIGHT` usually suits a flow that runs in one line; `DOWN` suits stacked tiers.
- **ids take alphanumerics, `-` and `_` only.** Labels may use any script; ids may not.
- Draw only what is true. Leave out any component you could not confirm.
