import { DiagramError, type DiagramIssue, type IconResolver, type Ir } from '@archdraw/core'

export interface ValidationReport {
  version: 1
  valid: boolean
  errors: DiagramIssue[]
}

export function validationReport(error?: unknown): ValidationReport {
  if (error === undefined) return { version: 1, valid: true, errors: [] }
  const issue: DiagramIssue =
    error instanceof DiagramError
      ? error.issue
      : {
          code:
            typeof (error as NodeJS.ErrnoException)?.code === 'string'
              ? 'io-error'
              : 'validation-error',
          severity: 'error',
          message: error instanceof Error ? error.message : String(error),
          hint: 'Check the input file and command options.',
          path: [],
          elements: [],
        }
  return { version: 1, valid: false, errors: [issue] }
}

function nodePath(input: unknown, id: string): (string | number)[] {
  const visit = (entries: unknown, path: (string | number)[]): (string | number)[] | undefined => {
    if (!Array.isArray(entries)) return
    for (const [index, entry] of entries.entries()) {
      const at = [...path, index]
      if (entry.id === id) return at
      const found = visit(entry.children, [...at, 'children'])
      if (found) return found
    }
  }
  const doc = input as { groups?: unknown; nodes?: unknown }
  return visit(doc.groups, ['groups']) ?? visit(doc.nodes, ['nodes']) ?? []
}

/** A resolver knows the type; the CLI also knows which input node requested it. */
export function checkIcons(document: unknown, ir: Ir, icons: IconResolver): void {
  for (const node of ir.nodes) {
    if (!node.type) continue
    try {
      icons.resolve(node.type)
    } catch (error) {
      if (error instanceof DiagramError) {
        error.issue.path = [...nodePath(document, node.id), 'type']
        error.issue.elements = [{ kind: 'node', id: node.id }]
      }
      throw error
    }
  }
}
