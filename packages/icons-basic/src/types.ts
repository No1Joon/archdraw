/** Structural copies keep this icon pack independent of core. */
export interface IconAsset {
  viewBox: string
  content: string
  monochrome?: boolean
}
export interface IconPack {
  provider: string
  icons: Record<string, IconAsset>
  aliases: Record<string, string>
  keywords?: Record<string, string[]>
}
