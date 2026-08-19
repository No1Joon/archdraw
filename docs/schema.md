# 입력 스키마

`archdraw schema` 가 이 문서와 같은 계약을 JSON Schema 로 출력한다(zod 정의에서 파생 — 둘은 어긋날 수 없다).

## 최상위

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `provider` | `aws` \| `gcp` | `aws` | 아이콘 팩. CLI 는 `-p` 가 우선한다 |
| `title` | string | — | SVG `<title>` 과 접근성 라벨 |
| `direction` | `RIGHT` \| `DOWN` | `RIGHT` | 흐름 방향. 다이어그램 전체에 적용된다(그룹별 지정은 불가) |
| `nodes` | Node[] | `[]` | 노드 목록 |
| `groups` | Node[] | `[]` | `nodes` 의 별칭. 최상위가 전부 컨테이너일 때 읽기 좋다 |
| `edges` | Edge[] | `[]` | 연결 |

## Node

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | ✓ | **`A-Z a-z 0-9 - _` 만.** 점·공백·한글은 거부된다 |
| `label` | string | — | 표시 이름. 한글 가능. 생략하면 `id` 를 쓴다 |
| `type` | string | — | 서비스 slug 또는 별칭(`ecs`, `s3`). 리프면 아이콘, 컨테이너면 헤더 배지로 그린다 |
| `kind` | string | — | 컨테이너 표시(`vpc`, `region`, `account`...). `type` 을 함께 줘 헤더에 아이콘을 붙일 수 있다 |
| `parent` | string \| null | — | 평면 형에서 상위 컨테이너 id |
| `children` | Node[] | — | 중첩 형에서 하위 노드 |

`type` 도 `kind` 도 없으면 **라벨 박스**로 그려진다 — 벤더 아이콘이 없는 서드파티·자체호스팅 구성요소를 표현할 때 쓴다.

`kind` 가 있거나 `children` 이 있으면 컨테이너다.

## Edge

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `from` | string | ✓ | 출발 노드 id |
| `to` | string | ✓ | 도착 노드 id |
| `label` | string | — | 선 위에 표시 |
| `style` | `solid` \| `dashed` | — | 기본 `solid` |

## 두 가지 입력 형태

같은 그림을 중첩 형과 평면 형 어느 쪽으로도 쓸 수 있다. 내부에서는 평면 IR 하나로 정규화된다.

중첩 형 — 사람이 쓰기 좋다.

```yaml
provider: aws
groups:
  - id: vpc
    kind: vpc
    label: prod-vpc
    children:
      - { id: alb, type: alb, label: public alb }
      - { id: api, type: ecs, label: api }
edges:
  - { from: alb, to: api, label: https }
```

평면 형 — 생성기가 쓰기 좋다. 재귀가 없어 한 번에 뱉기 쉽다.

```yaml
provider: aws
nodes:
  - { id: vpc, kind: vpc, label: prod-vpc }
  - { id: alb, type: alb, label: public alb, parent: vpc }
  - { id: api, type: ecs, label: api, parent: vpc }
edges:
  - { from: alb, to: api, label: https }
```

## 거부되는 것

| 입력 | 메시지 |
|---|---|
| 없는 slug | `Unknown type 'lambdaa'.` + 유사 후보 |
| 오타 키 | `Unrecognized key: "typ"` |
| 끊긴 엣지 | `Edge a -> ghost references unknown node 'ghost'` |
| 중복 id | `Duplicate id` |
| id 문자 위반 | `id must be alphanumeric with - or _` |
