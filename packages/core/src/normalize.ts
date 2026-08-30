import type { Edge } from './schema.js'
import { DiagramSchema, type NodeEntry } from './schema.js'

export interface FlatNode {
  id: string
  label: string
  /** `undefined` for containers. */
  type?: string
  kind?: string
  parent: string | null
  isGroup: boolean
  shape: 'icon' | 'card'
  domain?: string
}

export interface Ir {
  provider: string
  title?: string
  direction: 'RIGHT' | 'DOWN'
  /** Fold a long chain into several rows instead of letting the canvas run away. */
  wrap: boolean
  nodes: FlatNode[]
  edges: Edge[]
}

export class DiagramError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(hint ? `${message}\n  ${hint}` : message)
    this.name = 'DiagramError'
  }
}

/** Parses either input form into the flat IR. Semantic problems throw `DiagramError`. */
export function normalize(input: unknown): Ir {
  const parsed = DiagramSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    throw new DiagramError(
      `Invalid diagram at ${first?.path.join('.') || '<root>'}: ${first?.message}`,
    )
  }

  const doc = parsed.data
  const nodes: FlatNode[] = []
  const seen = new Set<string>()

  const walk = (entry: NodeEntry, parent: string | null): void => {
    if (seen.has(entry.id)) {
      throw new DiagramError(`Duplicate id '${entry.id}'.`)
    }
    seen.add(entry.id)

    const isGroup = entry.kind !== undefined || (entry.children?.length ?? 0) > 0
    nodes.push({
      id: entry.id,
      label: entry.label ?? entry.id,
      type: entry.type,
      kind: entry.kind,
      shape: entry.shape ?? parsed.data.shape,
      domain: entry.domain,
      parent: entry.parent ?? parent,
      isGroup,
    })

    for (const child of entry.children ?? []) walk(child, entry.id)
  }

  for (const entry of [...doc.groups, ...doc.nodes]) walk(entry, null)

  for (const node of nodes) {
    if (node.parent !== null && !seen.has(node.parent)) {
      throw new DiagramError(`Node '${node.id}' has parent '${node.parent}', which does not exist.`)
    }
  }

  // A node inside itself has no place in the tree the layout walks down from the root, so it
  // would vanish from the picture. A diagram that quietly loses a node is worse than one that
  // refuses to draw.
  const parentOf = new Map(nodes.map((node) => [node.id, node.parent]))
  for (const node of nodes) {
    const path = [node.id]
    for (let cursor = node.parent; cursor !== null; cursor = parentOf.get(cursor) ?? null) {
      if (cursor === node.id) {
        throw new DiagramError(
          `Node '${node.id}' is inside itself: ${[...path, cursor].join(' -> ')}.`,
          'A parent chain must end at the top level.',
        )
      }
      path.push(cursor)
    }
  }
  for (const edge of doc.edges) {
    for (const end of [edge.from, edge.to] as const) {
      if (!seen.has(end)) {
        throw new DiagramError(`Edge ${edge.from} -> ${edge.to} references unknown node '${end}'.`)
      }
    }
  }

  return {
    provider: doc.provider,
    title: doc.title,
    direction: doc.direction,
    wrap: doc.wrap,
    nodes,
    edges: doc.edges,
  }
}
