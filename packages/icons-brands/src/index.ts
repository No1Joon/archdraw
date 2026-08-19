import { aliases } from './aliases.js'
import { icons } from './generated.js'
import type { IconPack } from './types.js'

export { aliases } from './aliases.js'
export { icons } from './generated.js'
export type { IconAsset, IconPack } from './types.js'

export const brandIcons: IconPack = {
  provider: 'brands',
  icons,
  aliases,
}
