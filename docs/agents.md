# Using it from an agent

**English** · [한국어](./agents.ko.md)

archdraw never calls an LLM. **The agent writes the YAML; archdraw draws it.**

## Three steps

```bash
# 1. Find the types you can use — do not guess. Several queries in one run
npx archdraw types postgres
npx archdraw types s3 lambda kinesis clickhouse   # each answer under a `# query` heading
npx archdraw types run -p gcp
npx archdraw types redis -p aws,brands   # with several packs, both show up

# 2. Validate without rendering — fast, and exits 1 on failure
cat diagram.yaml | npx archdraw - --check

# 3. Draw it
cat diagram.yaml | npx archdraw - -o out.png -s 2
npx archdraw diagram.yaml -o out.svg          # a file works too
npx archdraw diagram.yaml -o out.html         # one self-contained page, with the traffic moving
npx archdraw diagram.yaml                     # without -o, SVG goes to stdout
```

`.html` is the same drawing with dots travelling along every edge in the direction it points, and pan and zoom. It is one file with nothing to serve it from. Mark whatever the system does not own with `external: true` — on a node, or on the group that holds them all — and the traffic arriving from outside, staying inside, and leaving is drawn in three colours, with a legend. Say nothing and everything counts as inside, which is one colour and no legend.

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

**A product and its managed service are different icons.** Decide which one you are drawing before you pick, and let the deployment decide — self-hosted takes the product's own mark from `brands`, a managed offering takes the vendor pack's. `redis` is not `amazon-elasticache`; `postgresql` is not `amazon-rds`; `apachekafka` is not `amazon-managed-streaming-for-apache-kafka`.

**An alias is a shortcut, not a ruling.** `postgres` resolves to `postgresql`, the self-hosted mark — so a managed "RDS Postgres" wants `rds`, and taking the alias would make the picture lie. Search the vendor pack too and choose between the results.

## Components with no icon

Omit `type` and the node is drawn as a labelled box. Use it for things none of the three packs carry, such as an internal service. Do not force a vaguely similar icon onto it.

**A workload takes no icon from the platform it runs on.** Three services on GKE are not three GKE, and three tasks on ECS are not three ECS — an icon that exists is not a reason to use it. Put the platform on the group once, as `kind` plus `type`, and leave the services inside it without a `type`.

```yaml
nodes:
  - { id: api, type: ecs, label: api }
  - { id: atlas, label: MongoDB Atlas }   # no icon — drawn as a box
edges:
  - { from: api, to: atlas, label: query }
```

## Rules for a diagram that reads well

- **Set `wrap: true` once a diagram runs long.** A chain laid out in one line grows without bound — 200 nodes render as a strip tens of thousands of pixels wide. Wrapping folds it into rows.
- **Wrapping has two prices.** An edge between two rows of the fold is routed around them, the same way a group boundary costs — archdraw names those edges after a render and says which of the two it was, so read the note before rearranging anything. And the fold follows the layout's layer index rather than the chain, so the main chain can stop reading in order: of six diagrams measured, four sent a reader backwards up the page, two bundled examples among them. Read the wrapped picture in order before keeping it.
- **The file's `provider` lists every pack the diagram draws from.** `-p` overrides it for one run; a file that renders only with the flag is broken for whoever opens it next, and archdraw says so after a render.
- **A label breaks a line with a real break** — `"one\ntwo"` in a quoted label, or a `|-` block. Written with two backslashes it draws `\n` as text, and the wider node is exactly what a narrow picture did not want.
- **Group the top-level siblings.** Gathering external dependencies and managed services into their own groups stops the picture stretching sideways and makes the boundaries visible.
- **But grouping has a price.** An edge whose ends sit in different groups is routed around every group in between, so a boundary drawn between two things that talk a lot makes the picture wider, not narrower. After a render archdraw names any edge that travelled more than twice its direct distance, and says which of the two causes it was — a boundary between a talkative pair, which regrouping fixes, or an edge running against `direction`, which it does not.
- **`direction` is global.** It cannot vary per group. `RIGHT` usually suits a flow that runs in one line; `DOWN` suits stacked tiers.
- **ids take alphanumerics, `-` and `_` only.** Labels may use any script; ids may not.
- Draw only what is true. Leave out any component you could not confirm.
