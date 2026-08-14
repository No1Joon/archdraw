import {
  createResolver,
  Diagram,
  type ElkNode,
  type IconPack,
  type IconResolver,
  type Ir,
  layout,
  normalize,
  parse,
  type Theme,
} from '@archdraw/core'
import { useEffect, useState } from 'react'

export interface ArchitectureProps {
  /** YAML/JSON source, or an already-parsed document. */
  source: string | unknown
  icons?: IconResolver | IconPack | IconPack[]
  theme?: Theme
  /** Rendered while ELK is laying out. */
  fallback?: React.ReactNode
  /** Rendered when the source fails validation. Defaults to the error message. */
  renderError?: (error: Error) => React.ReactNode
}

type State =
  | { status: 'pending' }
  | { status: 'ready'; root: ElkNode; ir: Ir }
  | { status: 'error'; error: Error }

function toResolver(icons: ArchitectureProps['icons']): IconResolver {
  if (!icons) return createResolver()
  if ('resolve' in icons) return icons
  return Array.isArray(icons) ? createResolver(...icons) : createResolver(icons)
}

export function Architecture({ source, icons, theme, fallback, renderError }: ArchitectureProps) {
  const [state, setState] = useState<State>({ status: 'pending' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'pending' })
    ;(async () => {
      try {
        const ir = normalize(typeof source === 'string' ? parse(source) : source)
        const root = await layout(ir)
        if (!cancelled) setState({ status: 'ready', root, ir })
      } catch (error) {
        if (!cancelled) setState({ status: 'error', error: error as Error })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [source])

  if (state.status === 'pending') return <>{fallback ?? null}</>
  if (state.status === 'error') {
    return <>{renderError ? renderError(state.error) : <pre>{state.error.message}</pre>}</>
  }
  return <Diagram root={state.root} ir={state.ir} icons={toResolver(icons)} theme={theme} />
}
