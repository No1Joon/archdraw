# @archdraw/icons-brands

**English** · [한국어](./README.ko.md)

3,453 [Simple Icons](https://simple-icons.org) packaged as an [archdraw](https://github.com/No1Joon/archdraw) icon pack. Each mark is filled with its brand's official colour. It fills the gaps the cloud packs leave — Redis, nginx, MongoDB, FastAPI, Cloudflare and the like.

## Using it

As a CLI, [`archdraw`](https://www.npmjs.com/package/archdraw) already bundles this pack. Install it only when composing things yourself.

```bash
npm i @archdraw/core @archdraw/icons-brands
```

```ts
import { renderToSvg } from '@archdraw/core'
import { brandIcons } from '@archdraw/icons-brands'

const svg = await renderToSvg(source, { icons: brandIcons })
```

Several packs can be passed together — `{ icons: [awsIcons, brandIcons] }`.

## Finding a slug

```bash
npx archdraw types <query> -p brands
```

A `type` that does not resolve fails with candidates rather than being silently substituted.

## Dependencies

None. The `IconPack` type is duplicated structurally rather than imported from `@archdraw/core`, so an icon pack is never tied to a core version.

## Alongside the cloud packs

A managed service takes its icon from the cloud pack; software you run yourself takes its icon from here. Managed Redis is `elasticache`; Redis in a container is `redis`.

```bash
npx archdraw diagram.yaml -p aws,brands -o out.png
```

## Licence

The packaging code is MIT. The SVG assets are CC0-1.0 data from [Simple Icons](https://github.com/simple-icons/simple-icons); rights in the marks themselves remain with their trademark holders — see `NOTICE`.
