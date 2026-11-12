# Input schema

**English** · [한국어](./schema.ko.md)

`archdraw schema` prints this same contract as JSON Schema (derived from the zod definitions — the two cannot drift apart).

## Top level

| Field | Type | Default | Description |
|---|---|---|---|
| `provider` | `aws` \| `gcp` \| `brands` \| `basic` | `aws` | Icon packs to draw with. The CLI uses this unless `-p` is given, and `-p aws,brands` loads several |
| `title` | string | — | The SVG `<title>` and the accessible label |
| `direction` | `RIGHT` \| `DOWN` | `RIGHT` | Default flow direction; a group may override it |
| `entry` | string | — | Preferred first top-level node or group; must be a direct child |
| `animation` | `none` \| `flow` | — | Document default for HTML/GIF edge motion; explicit edge values override it |
| `shape` | `icon` \| `card` | `icon` | Default node presentation. `icon` puts the name under the mark (the AWS convention); `card` puts it beside the mark (the GCP convention) |
| `wrap` | boolean | `false` | Fold a long chain into several rows. Without it a 200-node chain renders as one strip tens of thousands of pixels wide |
| `rollup` | boolean | `false` | Count each group's contents by status in its header — `2/3 done`. The group's own status stays its own |
| `nodes` | Node[] | `[]` | The list of nodes |
| `groups` | Node[] | `[]` | An alias for `nodes`. Reads better when everything at the top level is a container |
| `edges` | Edge[] | `[]` | The connections |
| `scenarios` | Scenario[] | `[]` | States the diagram can be read in. HTML provides scenario buttons; SVG and PNG select one with `--scenario` |

## Node

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✓ | **`A-Z a-z 0-9 - _` only.** Dots, spaces and non-Latin scripts are rejected |
| `label` | string | — | The displayed name; any script is fine. Defaults to `id`. Split lines with `\n` to hang an identifier or URL under the name |
| `type` | string | — | A service slug or alias (`ecs`, `s3`). Drawn as an icon on a leaf, as a header badge on a container |
| `kind` | string | — | Names what a container is (`vpc`, `region`, `account`…). Pair it with `type` to put an icon in the header. It does not make a node a container |
| `parent` | string \| null | — | The containing id, in the flat shape |
| `shape` | `icon` \| `card` | — | This node's presentation. Overrides the diagram default |
| `domain` | string | — | The address this node answers on. Drawn small **above** the mark, so it does not blend into the service name |
| `external` | boolean | — | This is outside the system being drawn. Everything inside a group marked so is too, unless it says otherwise. Only an animated HTML render uses it, to colour traffic arriving, staying and leaving |
| `status` | `planned` \| `in_progress` \| `blocked` \| `done` \| `deployed` | — | How much of this is built. A group's own status, never its children's — a VM that exists deploys nothing |
| `when` | string[] | — | The scenario ids this is alive in. Omitted means all of them |
| `down` | string[] | — | The scenario ids this has failed in — drawn drained of colour rather than merely absent |
| `collapsed` | boolean | — | Start a group as a compact overview; leaf nodes reject this field |
| `direction` | `RIGHT` \| `DOWN` | — | Direction inside a group; nested groups inherit it |
| `entry` | string | — | Preferred first direct child of this group; group-only |
| `ports` | `{ id, side }[]` | — | Named group boundary points; side is `NORTH`, `EAST`, `SOUTH` or `WEST` |
| `children` | Node[] | — | Child nodes, in the nested shape |

A multi-line label mirrors how reference architectures write an identifier under the name.

```yaml
- { id: cdn, type: cloudfront, label: "CloudFront\n(E3B54WIT00QZZG)\n(portal.example.com)" }
```

With no `type`, a node is drawn as a **labelled box** — use it for third-party or self-hosted components that have no vendor icon.

A node is a container if it has `children`, is listed under `groups`, or something names it as its `parent`. `kind` labels a container; it does not make one.

## Edge

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | — | A name to find this edge by in the output. **`A-Z a-z 0-9 - _` only**, unique among edges. Without one it is named `from->to`, and a second edge between the same pair `from->to#2` |
| `from` | string | ✓ | Source node id |
| `to` | string | ✓ | Target node id |
| `fromPort` / `toPort` | string | — | Port declared on the corresponding endpoint group |
| `role` | `request` \| `response` | — | Declare actual replies so expected reverse routes are informational |
| `layout` | `forward` \| `back` | — | Layout intent; `back` uses an exterior return lane between siblings without named ports |
| `label` | string | — | Shown on the line |
| `style` | `solid` \| `dashed` | — | Defaults to `solid` |
| `status` | `planned` \| `in_progress` \| `blocked` \| `done` \| `deployed` | — | Whether this connection exists yet. Independent of the nodes it joins |
| `animation` | `none` \| `flow` | — | Travelling dashes in the HTML target. Defaults to off for a `planned` or `blocked` edge, on for every other |
| `when` | string[] | — | The scenario ids this edge carries traffic in. Omitted means all of them |

## Status

`status` says how much of a thing exists, which is a different question from whether it is running (`scenarios`) or which way traffic crosses the boundary (`external`). It is drawn in every target — SVG, PNG and HTML alike — because the reason to draw it is usually to put it in a report.

```yaml
nodes:
  - { id: redis, type: redis, label: Redis, status: done }
  - { id: api, type: ecs, label: Go API, status: in_progress }
edges:
  - { from: api, to: redis, label: get, status: planned }
```

A node carries a mark in its corner, a group carries one in its header, and an edge carries one beside its label. Each state has its own shape as well as its own colour — a ring, a half disc, a bar, a tick, a play mark — so a diagram printed in grey still reads, and a legend naming the states in words is drawn under the graph. Only the states a diagram uses appear in it.

A `planned` or `blocked` edge takes the status colour and, where it is planned, draws faint. A `done` or `deployed` edge is drawn exactly as an edge with no status at all: a connection that exists is just a line.

Motion is treated as a claim about traffic, so a `planned` or `blocked` edge does not animate in the HTML target. `animation: flow` overrides that for an edge whose movement is the point, and `animation: none` silences one that is built.

`done` means written, `deployed` means running where it is meant to run — one ladder rather than two fields, so every element carries one mark. A thing that is running an old version while the new one is being written is `in_progress`.

A group's status is its own and never reaches its children, so a created VM cannot mark the services inside it deployed. To see how far along a group's contents are, set `rollup: true` at the top level: each group header then counts what is inside it at any depth — `2/3 done`, with `deployed` counted as done and anything without a status left out — beside, not instead of, the group's own mark.

## Scenario

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✓ | **`A-Z a-z 0-9 - _` only**, like a node id |
| `label` | string | — | The button's text. Defaults to `id` |

An element says when it is alive rather than a scenario listing what it changes, so one line describes one element and a generator can emit it in a single pass. A name no scenario declares is an error, not a silently missing line.

The graph is laid out once with every element present and a scenario only changes what is drawn, so pressing a button never moves the picture. One consequence is deliberate: an element is either alive or not, so a scenario that runs through stages — fails, is detected, recovers — cannot be written as a sequence.

## Finding things in the output

Every rendered node and group carries `data-node-id`, every edge `data-edge-id`, and either carries `data-status` when it has one. They are names, not positions, so the same file gives the same ids on every render and adding an element leaves the others' ids alone. Patch a status from a script, wire a click, or compare two renders by them.

```html
<g transform="translate(96, 40)" data-node-id="api" data-status="in_progress">
<g data-edge-id="api-&gt;redis" data-status="planned">
```

## The two input shapes

The same picture can be written either nested or flat. Internally both normalise to one flat IR.

Nested — easier for people to write.

```yaml
provider: aws
groups:
  - id: vpc
    kind: vpc
    label: prod-vpc
    children:
      - { id: alb, type: alb, label: public alb }
      - { id: api, type: ecs, label: api }
edges:
  - { from: alb, to: api, label: https }
```

Flat — easier for generators. With no recursion, it is easy to emit in one pass.

```yaml
provider: aws
nodes:
  - { id: vpc, kind: vpc, label: prod-vpc }
  - { id: alb, type: alb, label: public alb, parent: vpc }
  - { id: api, type: ecs, label: api, parent: vpc }
edges:
  - { from: alb, to: api, label: https }
```

## What gets rejected

| Input | Message |
|---|---|
| An unknown slug | `Unknown type 'lambdaa'.` plus near matches |
| A misspelled key | `Unrecognized key: "typ"` |
| A dangling edge | `Edge a -> ghost references unknown node 'ghost'` |
| A duplicate id | `Duplicate id` |
| An illegal id character | `id must be alphanumeric with - or _` |

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

The report includes `version: 1`, `coordinateSpace: "layout"`, graph canvas dimensions, warning/info counts and `diagnostics`. Each entry has a stable `id`, `code`, `severity`, `elements` with node/edge ids, a message and a fix hint. Codes are `edge-detour`, `response-route`, `label-overlap`, `label-clipped` and `edge-crossing` and `edge-overlap`; entries include a ratio/cause, label bounds or intersection point when applicable. Coordinates start at the layout graph, before the SVG title/status legend bands. Text geometry uses the same estimated metrics as layout (`textMeasurement: "estimated"`), so inspect the SVG/PNG after a suggested fix. A clean report is not a pixel-perfect guarantee; intentional shared endpoints are excluded from crossing reports. Wrapped diagrams additionally report collinear rail overlap as `edge-overlap` (with overlap bounds and `cause: "wrap"`); common fan-out/fan-in endpoint stubs are excluded.

Mark actual reply edges `role: response` (`request` is also accepted). A long response travelling against its enclosing layout direction is reported as informational `response-route` and omitted from stderr detour warnings. Direction alone never implies a response, and a forward response with an unnecessary detour is still a warning. Keep requests and replies separate when both paths matter.

Core callers can use `diagnose(ir, root)` inside `onLayout` to inspect the same render without a second layout pass.

## Workflow entry and return lanes

Root `entry` names a direct top-level node/group; a group's `entry` names its direct child. It is a layout hint, not an execution rule, and creates no edges. When an explicit `WEST`/`NORTH` boundary hop connects to that entry, its port aligns with the entry's leading face. Incoming arrowheads leave space for the boundary dot in entry-based layouts.

Mark main-flow edges `layout: forward`. Mark a repeat/correction edge `layout: back` to remove it from forward layering and route it outside the sibling boxes after wrapping: below a `RIGHT` flow, to the right of a `DOWN` flow. Separate back edges get separate exterior lanes. Original endpoint/edge ids and arrow directions are preserved. `style` remains independent: dashed does not imply back, and back does not imply a response.

A back edge must join nodes with the same immediate parent, without `fromPort`/`toPort`. Cross-group returns must use explicit boundary hops or ordinary layout; unsupported back edges fail with `invalid-back-edge`. `entry` must name a direct child or validation fails with `invalid-entry`. A group with an entry or back edges is placed independently; ordinary crossing edges are reconnected. These hints reduce route ambiguity but do not guarantee zero crossings. Inspect diagnostics and the rendered image.

```yaml
provider: basic
entry: check
animation: none
nodes:
  - { id: check, type: basic-shield }
  - { id: answer, type: basic-message }
edges:
  - { from: check, to: answer, layout: forward }
  - { from: answer, to: check, layout: back, style: dashed, label: Retry }
```

Document `animation: none` makes HTML/GIF edges still. An explicit edge `animation: flow` overrides it. Document `flow` keeps `planned`/`blocked` edges still unless that edge explicitly opts in. With no document setting, existing animation defaults are preserved. SVG/PNG remain static. See [`examples/workflow-loops.yaml`](../examples/workflow-loops.yaml).
