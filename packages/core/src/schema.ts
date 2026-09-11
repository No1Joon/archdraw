import { z } from 'zod'

const Id = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9_-]+$/, 'id must be alphanumeric with - or _')

/**
 * How much of this exists yet, as against how much is drawn. Saying nothing says nothing —
 * a diagram that never mentions status draws exactly as it did before there was one.
 */
export const StatusSchema = z.enum(['planned', 'in_progress', 'blocked', 'done'])

/** A single entry in the flat form. Non-recursive: structured outputs reject recursion. */
export const FlatNodeSchema = z
  .object({
    id: Id,
    label: z.string().optional(),
    /** Present on containers (VPC, subnet, account, ...). May carry `type` for a header icon. */
    kind: z.string().optional(),
    /** Provider service slug or alias, e.g. `ecs`, `s3`. Optional — without it a node is a labelled box. */
    type: z.string().optional(),
    /** id of the containing group, or null/omitted for top level. */
    parent: z.string().nullish(),
    /** `icon` puts the label under the mark (AWS style); `card` puts it beside (GCP style). */
    shape: z.enum(['icon', 'card']).optional(),
    /** Address this node answers on. Drawn above the mark, apart from the service name. */
    domain: z.string().optional(),
    /** Outside the system being drawn. Everything inside a group marked this way is too. */
    external: z.boolean().optional(),
    /** Built, being built, or not yet. A group's own status; it never reaches its children. */
    status: StatusSchema.optional(),
    /** Scenarios this is alive in. Omitted means every one of them. */
    when: z.array(Id).optional(),
    /** Scenarios this is failed in — drawn as down rather than merely absent. */
    down: z.array(Id).optional(),
  })
  .strict()

/** The authoring form additionally allows `children`. */
export type NodeEntry = z.infer<typeof FlatNodeSchema> & {
  children?: NodeEntry[]
}

export const NodeEntrySchema: z.ZodType<NodeEntry> = z.lazy(() =>
  FlatNodeSchema.extend({
    children: z.array(NodeEntrySchema).optional(),
  }).strict(),
)

export const EdgeSchema = z
  .object({
    /** A name to find this edge by in the output. Without one it is named for its two ends. */
    id: Id.optional(),
    from: Id,
    to: Id,
    label: z.string().optional(),
    style: z.enum(['solid', 'dashed']).default('solid'),
    /** Whether this connection exists yet. Independent of the nodes it joins. */
    status: StatusSchema.optional(),
    /**
     * Travelling dashes in the HTML target. Defaults to off for a connection that is not
     * built, so motion never claims traffic through something that does not run yet.
     */
    animation: z.enum(['none', 'flow']).optional(),
    /** Scenarios this edge carries traffic in. Omitted means every one of them. */
    when: z.array(Id).optional(),
  })
  .strict()

/** A named state of the system. The page draws one button per scenario, in this order. */
export const ScenarioSchema = z
  .object({
    id: Id,
    label: z.string().optional(),
  })
  .strict()

const Base = {
  provider: z.string().default('aws'),
  title: z.string().optional(),
  direction: z.enum(['RIGHT', 'DOWN']).default('RIGHT'),
  /** Default node shape; a node's own `shape` wins. */
  shape: z.enum(['icon', 'card']).default('icon'),
  /** Fold a long chain into several rows. Without it the canvas grows in one direction forever. */
  wrap: z.boolean().default(false),
  /** States the diagram can be read in. Only the HTML page draws them; SVG and PNG show all. */
  scenarios: z.array(ScenarioSchema).default([]),
  edges: z.array(EdgeSchema).default([]),
}

/** Permissive input schema — accepts both the nested authoring form and the flat form. */
export const DiagramSchema = z
  .object({
    ...Base,
    nodes: z.array(NodeEntrySchema).default([]),
    /** Alias for `nodes` that reads better when the top level is all containers. */
    groups: z.array(NodeEntrySchema).default([]),
  })
  .strict()

/** Strict flat schema — the form a generator emits. */
export const FlatDiagramSchema = z
  .object({
    ...Base,
    nodes: z.array(FlatNodeSchema),
  })
  .strict()

/**
 * The input contract as JSON Schema, derived from the zod schemas above so the two cannot drift.
 * `archdraw schema` prints it; agents read it instead of guessing the shape.
 */
export function toJsonSchema(form: 'input' | 'flat' = 'input'): Record<string, unknown> {
  return z.toJSONSchema(form === 'flat' ? FlatDiagramSchema : DiagramSchema, {
    io: 'input',
  }) as Record<string, unknown>
}

export type Diagram = z.infer<typeof DiagramSchema>
export type FlatDiagram = z.infer<typeof FlatDiagramSchema>
export type Edge = z.infer<typeof EdgeSchema>
export type Status = z.infer<typeof StatusSchema>
export type Scenario = z.infer<typeof ScenarioSchema>
