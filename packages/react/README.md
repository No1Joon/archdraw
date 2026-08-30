# @archdraw/react

**English** · [한국어](./README.ko.md)

The React component that draws an [archdraw](https://github.com/No1Joon/archdraw) diagram in the browser. A thin layer that runs `@archdraw/core`'s layout asynchronously and mounts the result.

```bash
npm i @archdraw/react @archdraw/core @archdraw/icons-aws
```

```tsx
import { Architecture } from '@archdraw/react'
import { awsIcons } from '@archdraw/icons-aws'

const source = `
nodes:
  - { id: alb, type: alb, label: public alb }
  - { id: api, type: ecs, label: api }
edges:
  - { from: alb, to: api, label: https }
`

export function Diagram() {
  return <Architecture source={source} icons={awsIcons} fallback={<span>laying out…</span>} />
}
```

## Props

| | |
|---|---|
| `source` | A YAML/JSON string or an already-parsed document |
| `icons` | A single pack, an array of packs, or an `IconResolver` you built yourself |
| `theme` | Colours and fonts. Defaults to `defaultTheme` |
| `fallback` | What to draw while ELK lays out |
| `renderError` | What to draw when validation fails. Defaults to the error message |

Layout is asynchronous, so the first render shows `fallback`. It only recomputes when `source` changes — `icons` and `theme` do not affect layout, so they merely redraw.

## Rendering on a server

Without the component, `@archdraw/core`'s `renderToSvg()` produces the same SVG string. It never touches the DOM, so it runs as-is under Node.

## Licence

MIT
