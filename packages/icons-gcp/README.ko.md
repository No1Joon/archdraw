# @archdraw/icons-gcp

[English](./README.md) · **한국어**

[Google Cloud 아이콘](https://cloud.google.com/icons) 216 개를 [archdraw](https://github.com/No1Joon/archdraw) 아이콘 팩으로 묶은 것.

## 쓰는 법

CLI 로 쓸 때는 [`archdraw`](https://www.npmjs.com/package/archdraw) 가 이 팩을 이미 번들해 둔다. 직접 조합할 때만 설치한다.

```bash
npm i @archdraw/core @archdraw/icons-gcp
```

```ts
import { renderToSvg } from '@archdraw/core'
import { gcpIcons } from '@archdraw/icons-gcp'

const svg = await renderToSvg(source, { icons: gcpIcons })
```

여러 팩을 함께 넘길 수 있다 — `{ icons: [awsIcons, brandIcons] }`.

## slug 찾기

```bash
npx archdraw types <query> -p gcp
```

해석되지 않는 `type` 은 조용히 대체되지 않고 후보와 함께 실패한다.

## 의존성

없다. `IconPack` 타입은 `@archdraw/core` 에서 가져오지 않고 구조적으로 복제해 둔다 — 아이콘 팩이 core 버전에 묶이지 않는다.

## 자산

공식 배포본의 SVG 를 SVGO 로 최적화해 커밋해 둔다. 갱신은 `pnpm icons:sync gcp` 가 하고, 빌드·CI 는 네트워크를 타지 않는다.

## 라이선스

패키징 코드는 MIT. SVG 자산은 Google LLC 소유이며 [Google 브랜드 지침](https://cloud.google.com/icons)을 따른다 — `NOTICE` 참조.
