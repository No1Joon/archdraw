/** Structurally identical to `IconAsset` / `IconPack` in `@archdraw/core`, duplicated so icon packs stay dependency-free. */
export interface IconAsset {
  viewBox: string
  content: string
}

export interface IconPack {
  provider: string
  icons: Record<string, IconAsset>
  aliases: Record<string, string>
}
