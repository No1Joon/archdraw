import { aliases } from './aliases.js'
import { icons } from './generated.js'
import type { IconPack } from './types.js'

export type { IconAsset, IconPack } from './types.js'

export const gcpIcons: IconPack = {
  provider: 'gcp',
  icons,
  aliases,
}

export default gcpIcons
