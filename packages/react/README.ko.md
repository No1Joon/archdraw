# @archdraw/react

[English](./README.md) · **한국어**

[archdraw](https://github.com/No1Joon/archdraw) 다이어그램을 브라우저에서 그리는 React 컴포넌트. `@archdraw/core` 의 레이아웃을 비동기로 돌려 마운트하는 얇은 층이다.

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
| `source` | YAML·JSON 문자열이나 이미 파싱된 문서 |
| `icons` | 아이콘 팩 하나, 팩 배열, 또는 직접 만든 `IconResolver` |
| `theme` | 색·폰트. 생략하면 `defaultTheme` |
| `fallback` | ELK 가 레이아웃하는 동안 그릴 것 |
| `renderError` | 검증 실패 시 그릴 것. 기본은 오류 메시지 |

레이아웃은 비동기라 첫 렌더에서 `fallback` 이 먼저 나온다. 다시 계산하는 것은 `source` 가 바뀔 때뿐이고, `icons` 와 `theme` 은 레이아웃에 영향을 주지 않으므로 다시 그리기만 한다.

## 서버에서 그리려면

컴포넌트 없이 `@archdraw/core` 의 `renderToSvg()` 가 같은 SVG 문자열을 낸다. DOM 을 타지 않으므로 Node 에서도 그대로 돈다.

## 라이선스

MIT

## 보기 제어

`<Architecture source={diagram} scenario="normal" focus collapsed={["project"]} />`로 CLI와 같은 시나리오·그룹 보기를 선택한다. `scenario`는 선언된 id여야 하고 `focus`는 제외 대상을 숨긴 뒤 다시 배치한다. `collapsed`는 입력의 기본 접힘을 덮어쓰며 `[]`는 모두 펼친다. 그룹별 `direction`·`ports`는 입력 문서에서 지정한다. 보기가 바뀌면 오래된 비동기 배치 결과는 반영하지 않는다.
