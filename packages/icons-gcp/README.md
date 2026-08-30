# @archdraw/icons-gcp

**English** · [한국어](./README.ko.md)

216 [Google Cloud icons](https://cloud.google.com/icons) packaged as an [archdraw](https://github.com/No1Joon/archdraw) icon pack.

## Using it

As a CLI, [`archdraw`](https://www.npmjs.com/package/archdraw) already bundles this pack. Install it only when composing things yourself.

```bash
npm i @archdraw/core @archdraw/icons-gcp
```

```ts
import { renderToSvg } from '@archdraw/core'
import { gcpIcons } from '@archdraw/icons-gcp'

const svg = await renderToSvg(source, { icons: gcpIcons })
```

Several packs can be passed together — `{ icons: [awsIcons, brandIcons] }`.

## Finding a slug

```bash
npx archdraw types <query> -p gcp
```

A `type` that does not resolve fails with candidates rather than being silently substituted.

## Dependencies

None. The `IconPack` type is duplicated structurally rather than imported from `@archdraw/core`, so an icon pack is never tied to a core version.

## Assets

The SVGs from the official distribution, optimised with SVGO and committed. `pnpm icons:sync gcp` refreshes them; builds and CI never touch the network.

## Licence

The packaging code is MIT. The SVG assets belong to Google LLC and follow [Google's brand guidelines](https://cloud.google.com/icons) — see `NOTICE`.
