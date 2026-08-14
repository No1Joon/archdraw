import { aliases } from './aliases.js'
import { icons } from './generated.js'
import type { IconPack } from './types.js'

export type { IconAsset, IconPack } from './types.js'

export const awsIcons: IconPack = {
  provider: 'aws',
  icons,
  aliases,
}

export default awsIcons
