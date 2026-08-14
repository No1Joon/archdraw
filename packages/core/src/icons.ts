import { DiagramError } from './normalize.js'

export interface IconAsset {
  /** viewBox of the source SVG, e.g. `0 0 48 48`. */
  viewBox: string
  /** Inner markup of the source SVG (everything between `<svg>` and `</svg>`). */
  content: string
}

export interface IconPack {
  provider: string
  /** Canonical slug -> asset. Generated from the official icon set. */
  icons: Record<string, IconAsset>
  /** Hand-maintained short names, e.g. `ecs` -> `amazon-elastic-container-service`. */
  aliases: Record<string, string>
}

export interface IconResolver {
  resolve(type: string): IconAsset
  list(): string[]
}

/** Unknown types are an error, never a silent fallback. */
export function createResolver(...packs: IconPack[]): IconResolver {
  const icons = new Map<string, IconAsset>()
  const aliases = new Map<string, string>()

  for (const pack of packs) {
    for (const [slug, asset] of Object.entries(pack.icons)) icons.set(slug, asset)
    for (const [alias, slug] of Object.entries(pack.aliases)) aliases.set(alias, slug)
  }

  const names = [...new Set([...icons.keys(), ...aliases.keys()])]

  return {
    list: () => [...names].sort(),
    resolve(type) {
      const slug = aliases.get(type) ?? type
      const asset = icons.get(slug)
      if (asset) return asset

      const guesses = suggest(type, names)
      throw new DiagramError(
        `Unknown type '${type}'.`,
        guesses.length > 0
          ? `Did you mean: ${guesses.join(', ')}?`
          : 'No icon pack registered for this provider — pass one via the `icons` option.',
      )
    },
  }
}

function suggest(input: string, candidates: string[], limit = 3): string[] {
  return candidates
    .map((name) => ({ name, score: distance(input, name) }))
    .filter(({ name, score }) => score <= Math.max(2, Math.floor(name.length / 3)))
    .sort((a, b) => a.score - b.score || a.name.length - b.name.length)
    .slice(0, limit)
    .map(({ name }) => name)
}

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min((row[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost)
    }
    prev = row
  }
  return prev[b.length] ?? 0
}
