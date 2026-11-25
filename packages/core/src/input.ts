import { parse as parseYaml, YAMLParseError } from 'yaml'
import { DiagramError } from './normalize.js'

export { createResolver } from './icons.js'
export { DiagramError, normalize } from './normalize.js'
export { toJsonSchema } from './schema.js'
export { selectView } from './view.js'

/** Parses YAML or JSON source into the untyped document `normalize` accepts. */
export function parse(source: string): unknown {
  try {
    return parseYaml(source)
  } catch (error) {
    if (!(error instanceof YAMLParseError)) throw error
    const at = error.linePos?.[0]
    throw new DiagramError(
      error.message,
      'Fix the YAML/JSON syntax before validating the diagram.',
      {
        code: 'parse-error',
        line: at?.line,
        column: at?.col,
      },
    )
  }
}
