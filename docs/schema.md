# Input schema

**English** · [한국어](./schema.ko.md)

`archdraw schema` prints this same contract as JSON Schema (derived from the zod definitions — the two cannot drift apart).

## Top level

| Field | Type | Default | Description |
|---|---|---|---|
| `provider` | `aws` \| `gcp` \| `brands` | `aws` | Icon packs to draw with. The CLI uses this unless `-p` is given, and `-p aws,brands` loads several |
| `title` | string | — | The SVG `<title>` and the accessible label |
| `direction` | `RIGHT` \| `DOWN` | `RIGHT` | Flow direction. Applies to the whole diagram; it cannot be set per group |
| `shape` | `icon` \| `card` | `icon` | Default node presentation. `icon` puts the name under the mark (the AWS convention); `card` puts it beside the mark (the GCP convention) |
| `wrap` | boolean | `false` | Fold a long chain into several rows. Without it a 200-node chain renders as one strip tens of thousands of pixels wide |
| `nodes` | Node[] | `[]` | The list of nodes |
| `groups` | Node[] | `[]` | An alias for `nodes`. Reads better when everything at the top level is a container |
| `edges` | Edge[] | `[]` | The connections |
| `scenarios` | Scenario[] | `[]` | States the diagram can be read in. Only an animated HTML render draws them; SVG and PNG always show everything |

## Node

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✓ | **`A-Z a-z 0-9 - _` only.** Dots, spaces and non-Latin scripts are rejected |
| `label` | string | — | The displayed name; any script is fine. Defaults to `id`. Split lines with `\n` to hang an identifier or URL under the name |
| `type` | string | — | A service slug or alias (`ecs`, `s3`). Drawn as an icon on a leaf, as a header badge on a container |
| `kind` | string | — | Marks a container (`vpc`, `region`, `account`…). Pair it with `type` to put an icon in the header |
| `parent` | string \| null | — | The containing id, in the flat shape |
| `shape` | `icon` \| `card` | — | This node's presentation. Overrides the diagram default |
| `domain` | string | — | The address this node answers on. Drawn small **above** the mark, so it does not blend into the service name |
| `external` | boolean | — | This is outside the system being drawn. Everything inside a group marked so is too, unless it says otherwise. Only an animated HTML render uses it, to colour traffic arriving, staying and leaving |
| `when` | string[] | — | The scenario ids this is alive in. Omitted means all of them |
| `down` | string[] | — | The scenario ids this has failed in — drawn drained of colour rather than merely absent |
| `children` | Node[] | — | Child nodes, in the nested shape |

A multi-line label mirrors how reference architectures write an identifier under the name.

```yaml
- { id: cdn, type: cloudfront, label: "CloudFront\n(E3B54WIT00QZZG)\n(portal.example.com)" }
```

With neither `type` nor `kind`, a node is drawn as a **labelled box** — use it for third-party or self-hosted components that have no vendor icon.

A node is a container if it has `kind` or `children`.

## Edge

| Field | Type | Required | Description |
|---|---|---|---|
| `from` | string | ✓ | Source node id |
| `to` | string | ✓ | Target node id |
| `label` | string | — | Shown on the line |
| `style` | `solid` \| `dashed` | — | Defaults to `solid` |
| `when` | string[] | — | The scenario ids this edge carries traffic in. Omitted means all of them |

## Scenario

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✓ | **`A-Z a-z 0-9 - _` only**, like a node id |
| `label` | string | — | The button's text. Defaults to `id` |

An element says when it is alive rather than a scenario listing what it changes, so one line describes one element and a generator can emit it in a single pass. A name no scenario declares is an error, not a silently missing line.

The graph is laid out once with every element present and a scenario only changes what is drawn, so pressing a button never moves the picture. One consequence is deliberate: an element is either alive or not, so a scenario that runs through stages — fails, is detected, recovers — cannot be written as a sequence.

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
