import type { Edge, Scenario, Status } from './schema.js'
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
  /** Outside the system being drawn — resolved, so a child of an external group carries it too. */
  external: boolean
  /** How much of this is built. A group's own; it does not reach the children. */
  status?: Status
  /** Scenarios this is alive in; `undefined` means all of them. */
  when?: string[]
  /** Scenarios this is failed in. */
  down?: string[]
}

export interface Ir {
  provider: string
  title?: string
  direction: 'RIGHT' | 'DOWN'
  /** Fold a long chain into several rows instead of letting the canvas run away. */
  wrap: boolean
  nodes: FlatNode[]
  edges: Edge[]
  /** Empty unless the diagram names states to read it in. */
  scenarios: Scenario[]
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
  // What each entry said about itself. Inheritance is resolved once the parents are all known,
  // because the flat form names a parent that may be declared further down the file.
  const saidExternal = new Map<string, boolean>()

  const walk = (entry: NodeEntry, parent: string | null, declared = false): void => {
    if (seen.has(entry.id)) {
      throw new DiagramError(`Duplicate id '${entry.id}'.`)
    }
    seen.add(entry.id)

    // What it holds, not what it calls itself: `kind` names a container but does not make one,
    // so writing it on an ordinary node draws that node rather than an empty box around it.
    // Anything the flat form points `parent` at is promoted below, once every entry is read.
    const isGroup = declared || (entry.children?.length ?? 0) > 0
    nodes.push({
      id: entry.id,
      label: entry.label ?? entry.id,
      type: entry.type,
      kind: entry.kind,
      shape: entry.shape ?? parsed.data.shape,
      domain: entry.domain,
      parent: entry.parent ?? parent,
      isGroup,
      external: false,
      // Unlike `external`, this is not inherited: a VM that exists does not deploy what is in it.
      status: entry.status,
      when: entry.when,
      down: entry.down,
    })
    if (entry.external !== undefined) saidExternal.set(entry.id, entry.external)

    for (const child of entry.children ?? []) walk(child, entry.id)
  }

  for (const entry of doc.groups) walk(entry, null, true)
  for (const entry of doc.nodes) walk(entry, null)

  // The other half of the flat form: `parent` names a container whether or not it was declared
  // under `groups`. A leaf with children is not built, and the children go with it.
  const claimed = new Set(nodes.map((node) => node.parent).filter((id) => id !== null))
  for (const node of nodes) {
    if (claimed.has(node.id)) node.isGroup = true
  }

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

  // A named scenario that does not exist would silently drop the element from every scene, so
  // it is an error with the declared names attached rather than a picture missing a line.
  const scenarios = new Set(doc.scenarios.map((scenario) => scenario.id))
  const known = [...scenarios].join(', ')
  const checkWhen = (where: string, field: 'when' | 'down', ids: string[] | undefined): void => {
    for (const id of ids ?? []) {
      if (scenarios.has(id)) continue
      throw new DiagramError(
        `${where} names scenario '${id}' in \`${field}\`, which is not declared.`,
        known ? `Declared scenarios: ${known}.` : 'The diagram declares no `scenarios`.',
      )
    }
  }
  for (const node of nodes) {
    checkWhen(`Node '${node.id}'`, 'when', node.when)
    checkWhen(`Node '${node.id}'`, 'down', node.down)
  }
  for (const edge of doc.edges) {
    checkWhen(`Edge ${edge.from} -> ${edge.to}`, 'when', edge.when)
  }

  // The nearest word wins: a group says it for everything inside it, a child may say otherwise.
  for (const node of nodes) {
    for (
      let cursor: string | null = node.id;
      cursor !== null;
      cursor = parentOf.get(cursor) ?? null
    ) {
      const said = saidExternal.get(cursor)
      if (said !== undefined) {
        node.external = said
        break
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
    scenarios: doc.scenarios,
  }
}
