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
| `scenario` / `focus` | Select a declared scenario and optionally remove inactive elements before layout |
| `collapsed` | Override collapsed group ids; `[]` expands all groups |
| `fallback` | What to draw while ELK lays out |
| `renderError` | What to draw when validation fails. Defaults to the error message |

Layout is asynchronous, so the first render shows `fallback`. It recomputes when the source, icon resolver or view controls change. Theme changes redraw without layout.

## Rendering on a server

Without the component, `@archdraw/core`'s `renderToSvg()` produces the same SVG string. It never touches the DOM, so it runs as-is under Node.

## Licence

MIT

## View controls

`<Architecture source={diagram} scenario="normal" focus collapsed={["project"]} />` uses the same scenario filtering and group projection as CLI exports. `scenario` must be declared; `focus` removes inactive elements and lays out again. `collapsed` overrides the input group defaults; `[]` expands all groups. Group-local `direction` and named `ports` are part of the input document. Changing a view cancels stale layout results before updating the SVG.
