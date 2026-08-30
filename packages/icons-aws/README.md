# @archdraw/icons-aws

**English** · [한국어](./README.ko.md)

793 [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) packaged as an [archdraw](https://github.com/No1Joon/archdraw) icon pack. Carries both the service architecture icons and the general resource icons (client, mobile client, user, firewall, internet and so on).

## Using it

As a CLI, [`archdraw`](https://www.npmjs.com/package/archdraw) already bundles this pack. Install it only when composing things yourself.

```bash
npm i @archdraw/core @archdraw/icons-aws
```

```ts
import { renderToSvg } from '@archdraw/core'
import { awsIcons } from '@archdraw/icons-aws'

const svg = await renderToSvg(source, { icons: awsIcons })
```

Several packs can be passed together — `{ icons: [awsIcons, brandIcons] }`.

## Finding a slug

```bash
npx archdraw types <query> -p aws
```

A `type` that does not resolve fails with candidates rather than being silently substituted.

## Dependencies

None. The `IconPack` type is duplicated structurally rather than imported from `@archdraw/core`, so an icon pack is never tied to a core version.

## Assets

The `_48` and `_48_Light` SVGs from the official distribution, optimised with SVGO and committed. `pnpm icons:sync aws` refreshes them; builds and CI never touch the network.

## Licence

The packaging code is MIT. The SVG assets belong to Amazon Web Services and follow the [AWS trademark guidelines](https://aws.amazon.com/trademark-guidelines/) — see `NOTICE`.
