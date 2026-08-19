import { z } from 'zod'

const Id = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9_-]+$/, 'id must be alphanumeric with - or _')

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
    from: Id,
    to: Id,
    label: z.string().optional(),
    style: z.enum(['solid', 'dashed']).default('solid'),
  })
  .strict()

const Base = {
  provider: z.string().default('aws'),
  title: z.string().optional(),
  direction: z.enum(['RIGHT', 'DOWN']).default('RIGHT'),
  /** Default node shape; a node's own `shape` wins. */
  shape: z.enum(['icon', 'card']).default('icon'),
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
