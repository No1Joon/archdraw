# @archdraw/icons-brands

[English](./README.md) · **한국어**

[Simple Icons](https://simple-icons.org) 3,453 개를 [archdraw](https://github.com/No1Joon/archdraw) 아이콘 팩으로 묶은 것. 각 마크는 해당 브랜드의 공식 색으로 칠해져 있다. 클라우드 팩에 없는 것들 — Redis·nginx·MongoDB·FastAPI·Cloudflare 등 — 을 채운다.

## 쓰는 법

CLI 로 쓸 때는 [`archdraw`](https://www.npmjs.com/package/archdraw) 가 이 팩을 이미 번들해 둔다. 직접 조합할 때만 설치한다.

```bash
npm i @archdraw/core @archdraw/icons-brands
```

```ts
import { renderToSvg } from '@archdraw/core'
import { brandIcons } from '@archdraw/icons-brands'

const svg = await renderToSvg(source, { icons: brandIcons })
```

여러 팩을 함께 넘길 수 있다 — `{ icons: [awsIcons, brandIcons] }`.

## slug 찾기

```bash
npx archdraw types <query> -p brands
```

해석되지 않는 `type` 은 조용히 대체되지 않고 후보와 함께 실패한다.

## 의존성

없다. `IconPack` 타입은 `@archdraw/core` 에서 가져오지 않고 구조적으로 복제해 둔다 — 아이콘 팩이 core 버전에 묶이지 않는다.

## 클라우드 팩과 함께

관리형 서비스는 클라우드 팩의 아이콘을, 직접 띄운 소프트웨어는 이 팩의 아이콘을 쓴다. 관리형 Redis 는 `elasticache`, 컨테이너로 띄운 Redis 는 `redis` 다.

```bash
npx archdraw diagram.yaml -p aws,brands -o out.png
```

## 라이선스

패키징 코드는 MIT. SVG 자산은 [Simple Icons](https://github.com/simple-icons/simple-icons) 의 CC0-1.0 데이터이며, 마크 자체에 대한 권리는 각 상표권자에게 있다 — `NOTICE` 참조.
