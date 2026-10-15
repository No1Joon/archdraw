# archdraw for agents

archdraw never calls an LLM. **You write the YAML; archdraw draws it.** This file is the whole contract — you do not need the repository.

## Three steps

```bash
npx archdraw types postgres redis ecs  # 1. look every type up at once. never guess one
cat diagram.yaml | npx archdraw - --check   # 2. validate. exits 1 on failure
cat diagram.yaml | npx archdraw - -o out.png -s 2   # 3. draw
```

`npx archdraw schema` prints the input contract as JSON Schema; `--flat` prints the flat shape only.

## Commands

```
archdraw <input> [-o out] [-p aws,brands] [--theme dark]   # `-` reads stdin. without -o, SVG goes to stdout
archdraw <input> --check                                   # validate only
archdraw types <query...> [-p aws,brands]                  # search types; several queries in one run
archdraw schema [--flat]                                   # input contract as JSON Schema
```

`-o` ending in `.png` rasterises, `.html` is an animated page, anything else is SVG. `-s` is the PNG scale (0–10, default 2). `--theme` is `light` or `dark`.

## Rules

- **Never guess a `type`.** Run `archdraw types <query...>` first, and pass every type the diagram needs in one run — each match is listed under a `# query` heading. An unresolved type is an error with candidates attached, never a silent substitution — a wrong icon rendered as though it were right makes the diagram lie.
- **A component with no icon takes no `type`.** It renders as a labelled box, which is correct. Do not force a vaguely similar icon onto it.
- **A workload takes no icon from the platform it runs on.** Three services on GKE are not three GKE, and three tasks on ECS are not three ECS. Put the platform on the group once, as `kind` plus `type`, and leave the services inside it without a `type`.
- **`kind` names a container, it does not make one.** What holds something is a container: an entry with `children`, one listed under `groups`, or one another entry points `parent` at. `kind` says what that container is (`vpc`, `region`, `account`, the platform a group runs on); what a node *is* goes in `type`.
- **A product and its managed service are different icons.** The deployment decides — self-hosted takes the product's mark from `brands`, a managed offering takes the vendor pack's. `redis` is not `amazon-elasticache`; `postgresql` is not `amazon-rds`.
- **An alias is a shortcut, not a ruling.** `postgres` resolves to `postgresql`, the self-hosted mark, so a managed "RDS Postgres" wants `rds`. Search the vendor pack too and choose between the results.
- **Read the errors and act on them.** They name what is wrong and what to fix. Do not substitute a value of your own.
- **Set `wrap: true` once a diagram runs long.** A chain laid out in one line grows without bound — 200 nodes render as a strip tens of thousands of pixels wide. It has one price: an edge between two rows of the fold runs out past the end of its row and back in at the start of the next, which archdraw names after a render. The fold follows the chain — rows are cut between top-level boxes in reading order, never through a group.
- **`-o out.html` draws the traffic moving**, in one self-contained page with pan and zoom — the same picture, with dots travelling along each edge. Mark what the system does not own with `external: true`, on a node or on the group holding them, and traffic in from outside, inside, and out to outside takes three colours. Say nothing and it is all inside, in one.
- **Group top-level siblings.** Gathering external dependencies and managed services into their own groups stops the picture stretching sideways.
- **But grouping has a price.** An edge whose ends sit in different groups is routed around every group in between, so a boundary drawn between two things that talk a lot makes the picture wider, not narrower. archdraw names those edges after a render and says why — a boundary between a talkative pair, which regrouping fixes, or an edge running against `direction`, which it does not.
- **The file's `provider` lists every pack the diagram draws from.** `-p` overrides it for one run, so a file that renders only with the flag is broken for whoever opens it next. archdraw says so after a render.
- **A label breaks a line with a real break**, `"one\ntwo"` in a quoted label or a `|-` block. Written with two backslashes it draws `\n` as text and makes the node wider.
- **Say what is built with `status`, not in the label.** `status: planned | in_progress | blocked | done | deployed` on a node or an edge draws a mark in every target, with a legend naming the states in words; `[done]` written into a label resizes the card and tells the renderer nothing. A node and the edge into it are separate answers. `done` is written and `deployed` is running; whether it is up right now is `scenarios`. A group's status never reaches its children — `rollup: true` counts them in its header.
- **`direction` sets the default**, and groups may override it. `RIGHT` suits a flow in one line; `DOWN` suits stacked tiers.
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
provider: aws,brands
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
npx archdraw diagram.yaml -o out.png
```

Full documentation: https://github.com/No1Joon/archdraw

## Scenario focus and export

`archdraw diagram.yaml --scenario normal --focus -o normal.png` selects a declared scenario, removes inactive nodes and edges, and lays out the remaining graph again. Failed nodes named by `down` stay visible with failure styling. Ancestor visibility applies to descendants, and an edge cannot remain active when an endpoint is absent. Omit `--focus` to retain the full layout and fade inactive elements. Omit both flags to export the complete graph as before.

HTML keeps the existing fade view and adds a **Focus** switch and **Export SVG / Export PNG** buttons. Exports include the selected scenario and current view, without pan/zoom transforms or animated traffic. PNG uses the browser's available fonts at 2×; CLI PNG uses the bundled fonts. The page remains self-contained and works offline.

## Collapsing groups

Set `collapsed: true` on a group to start with a compact overview. Hidden descendants are omitted before layout; their external edges land on the outermost collapsed group, retaining edge ids and labels. Internal edges disappear. A leaf cannot use `collapsed`.

HTML's Groups panel toggles groups independently, with Collapse all / Expand all controls. Every change runs the same layout and SVG renderer locally; no service or network is needed. Scenario focus, export and live-reload view restoration retain the collapse selection. Interactive HTML embeds the layout runtime (about 1.7 MB before compression) and only the icons used by the diagram.

CLI: `archdraw diagram.yaml --collapse all -o overview.svg`, `--collapse project,other` to select groups, or `--expand-all` to override the input. Core: `RenderOptions.collapsed` accepts group ids; `[]` expands everything.

## Group directions and boundary ports

Groups may set `direction: RIGHT | DOWN`. Nested groups inherit the nearest direction unless they override it. Groups with a local direction or explicit ports are laid out independently, then their boundary crossings are joined into the enclosing graph; cross-boundary edges remain connected to their original endpoints.

Declare `ports: [{ id: ssh, side: WEST }]` on a group; sides are `NORTH | EAST | SOUTH | WEST`. Connect an edge to that group with `fromPort` or `toPort` (the endpoint id remains the group id). Connect the same port to an internal node with a second edge when the boundary hop should be explicit. Port ids are unique within a group, and a reference to an undeclared port is rejected. Ports and local direction are group-only fields. The boundary dots carry `data-port-id` in the SVG.

```yaml
groups:
  - id: project
    direction: DOWN
    ports: [{ id: ssh, side: WEST }]
    children: [{ id: api }, { id: db }]
nodes: [{ id: monitor }]
edges:
  - { from: monitor, to: project, toPort: ssh, label: SSH }
  - { from: project, fromPort: ssh, to: api }
  - { from: api, to: db }
```

Keep security boundaries that describe the system. Use ports to choose entry/exit sides instead of moving services into another security group just to shorten a route. With `wrap`, a group with an explicit direction/ports stays intact while the enclosing graph folds.

## Machine-readable quality diagnostics

`archdraw diagram.yaml --diagnostics quality.json -o diagram.png` writes both the render and a versioned JSON quality report. `--diagnostics -` prints JSON alone to stdout (unless `-o` also requests a render file). Reports use the selected scenario/collapse view and do not change the exit status for quality warnings; invalid input still exits 1. `--check` is validation only and cannot be combined with diagnostics, which require layout.

The report includes `version: 1`, `coordinateSpace: "layout"`, graph canvas dimensions, warning/info counts and `diagnostics`. Each entry has a stable `id`, `code`, `severity`, `elements` with node/edge ids, a message and a fix hint. Codes are `edge-detour`, `response-route`, `label-overlap`, `label-clipped` and `edge-crossing`; entries include a ratio/cause, label bounds or intersection point when applicable. Coordinates start at the layout graph, before the SVG title/status legend bands. Text geometry uses the same estimated metrics as layout (`textMeasurement: "estimated"`), so inspect the SVG/PNG after a suggested fix. A clean report is not a pixel-perfect guarantee; parallel overlapping rails and intentional shared endpoints are excluded from crossing reports.

Mark actual reply edges `role: response` (`request` is also accepted). A long response travelling against its enclosing layout direction is reported as informational `response-route` and omitted from stderr detour warnings. Direction alone never implies a response, and a forward response with an unnecessary detour is still a warning. Keep requests and replies separate when both paths matter.

Core callers can use `diagnose(ir, root)` inside `onLayout` to inspect the same render without a second layout pass.
