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
    /** Present on containers (VPC, subnet, account, ...). Mutually exclusive with `type`. */
    kind: z.string().optional(),
    /** Provider service slug or alias, e.g. `ecs`, `s3`. Required on leaf nodes. */
    type: z.string().optional(),
    /** id of the containing group, or null/omitted for top level. */
    parent: z.string().nullish(),
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

export type Diagram = z.infer<typeof DiagramSchema>
export type FlatDiagram = z.infer<typeof FlatDiagramSchema>
export type Edge = z.infer<typeof EdgeSchema>
