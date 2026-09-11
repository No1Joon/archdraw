# 입력 스키마

[English](./schema.md) · **한국어**

`archdraw schema` 가 이 문서와 같은 계약을 JSON Schema 로 출력한다(zod 정의에서 파생 — 둘은 어긋날 수 없다).

## 최상위

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `provider` | `aws` \| `gcp` \| `brands` | `aws` | 그릴 때 쓸 아이콘 팩. CLI 는 `-p` 가 없으면 이 값을 쓰고, `-p aws,brands` 로 여러 개를 건다 |
| `title` | string | — | SVG `<title>` 과 접근성 라벨 |
| `direction` | `RIGHT` \| `DOWN` | `RIGHT` | 흐름 방향. 다이어그램 전체에 적용된다(그룹별 지정은 불가) |
| `shape` | `icon` \| `card` | `icon` | 노드 기본 표현. `icon` 은 마크 아래 이름(AWS 관례), `card` 는 마크 옆 이름(GCP 관례) |
| `wrap` | boolean | `false` | 긴 사슬을 여러 줄로 접는다. 끄면 200 노드 사슬이 폭 수만 픽셀짜리 띠가 된다 |
| `nodes` | Node[] | `[]` | 노드 목록 |
| `groups` | Node[] | `[]` | `nodes` 의 별칭. 최상위가 전부 컨테이너일 때 읽기 좋다 |
| `edges` | Edge[] | `[]` | 연결 |
| `scenarios` | Scenario[] | `[]` | 다이어그램을 읽을 수 있는 상태들. 애니메이션 HTML 렌더에서만 그려지고 SVG·PNG 는 항상 전부 보여준다 |

## Node

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | ✓ | **`A-Z a-z 0-9 - _` 만.** 점·공백·한글은 거부된다 |
| `label` | string | — | 표시 이름. 한글 가능. 생략하면 `id` 를 쓴다. `\n` 으로 줄을 나누면 이름 아래에 식별자·URL 을 붙일 수 있다 |
| `type` | string | — | 서비스 slug 또는 별칭(`ecs`, `s3`). 리프면 아이콘, 컨테이너면 헤더 배지로 그린다 |
| `kind` | string | — | 컨테이너가 무엇인지 이름 붙인다(`vpc`, `region`, `account`...). `type` 을 함께 줘 헤더에 아이콘을 붙일 수 있다. 노드를 컨테이너로 만들지는 않는다 |
| `parent` | string \| null | — | 평면 형에서 상위 컨테이너 id |
| `shape` | `icon` \| `card` | — | 이 노드의 표현. 다이어그램 기본값을 덮어쓴다 |
| `domain` | string | — | 이 노드가 응답하는 주소. 마크 **위**에 작게 그려져 서비스 이름과 섞이지 않는다 |
| `external` | boolean | — | 그리는 시스템 바깥의 것. 이렇게 표시한 그룹 안은 스스로 달리 말하지 않는 한 전부 바깥이다. 애니메이션 HTML 렌더에서만 쓰여 들어오는·머무는·나가는 트래픽의 색을 가른다 |
| `status` | `planned` \| `in_progress` \| `blocked` \| `done` | — | 얼마나 만들어졌는지. 그룹 자신의 상태이고 자식에게 내려가지 않는다 — VM 이 있다고 그 안의 것이 배포된 것은 아니다 |
| `when` | string[] | — | 이것이 살아 있는 시나리오 id 들. 안 쓰면 전부 |
| `down` | string[] | — | 이것이 죽은 시나리오 id 들 — 그냥 없는 것이 아니라 색이 빠진 채로 그려진다 |
| `children` | Node[] | — | 중첩 형에서 하위 노드 |

여러 줄 라벨은 참조 아키텍처가 이름 아래 식별자를 적는 방식과 같다.

```yaml
- { id: cdn, type: cloudfront, label: "CloudFront\n(E3B54WIT00QZZG)\n(portal.example.com)" }
```

`type` 이 없으면 **라벨 박스**로 그려진다 — 벤더 아이콘이 없는 서드파티·자체호스팅 구성요소를 표현할 때 쓴다.

`children` 이 있거나, `groups` 에 있거나, 무언가가 `parent` 로 가리키면 컨테이너다. `kind` 는 컨테이너에 이름을 붙일 뿐 컨테이너로 만들지 않는다.

## Edge

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `from` | string | ✓ | 출발 노드 id |
| `to` | string | ✓ | 도착 노드 id |
| `label` | string | — | 선 위에 표시 |
| `style` | `solid` \| `dashed` | — | 기본 `solid` |
| `status` | `planned` \| `in_progress` \| `blocked` \| `done` | — | 이 연결이 존재하는지. 양 끝 노드의 상태와 무관하다 |
| `animation` | `none` \| `flow` | — | HTML 에서 흐르는 점선. `planned`·`blocked` 엣지는 기본 꺼짐, 나머지는 켜짐 |
| `when` | string[] | — | 이 엣지가 트래픽을 나르는 시나리오 id 들. 안 쓰면 전부 |

## Status

`status` 는 그것이 **얼마나 존재하는가**를 말한다 — 돌아가고 있는가(`scenarios`)와도, 경계 어느 쪽인가(`external`)와도 다른 축이다. SVG·PNG·HTML 어디에나 그려진다. 상태를 그리는 이유가 대개 보고서에 넣기 위해서이기 때문이다.

```yaml
nodes:
  - { id: redis, type: redis, label: Redis, status: done }
  - { id: api, type: ecs, label: Go API, status: in_progress }
edges:
  - { from: api, to: redis, label: get, status: planned }
```

노드는 모서리에, 그룹은 헤더에, 엣지는 라벨 옆에 배지를 단다. 상태마다 색뿐 아니라 모양이 다르다 — 고리·반원·막대·체크 — 그래서 흑백으로 인쇄해도 읽히고, 그래프 아래에 상태 이름을 글자로 적은 범례가 함께 그려진다. 그 도면이 실제로 쓴 상태만 나온다.

`planned`·`blocked` 엣지는 상태 색을 입고, `planned` 은 옅게 그려진다. `done` 엣지는 상태가 없는 엣지와 똑같이 그린다 — 존재하는 연결은 그냥 선이다.

움직임은 트래픽에 대한 주장으로 다룬다. 그래서 `planned`·`blocked` 엣지는 HTML 에서 애니메이션이 붙지 않는다. 움직임 자체가 요점인 엣지는 `animation: flow` 로 되살리고, 만들어졌지만 조용히 두고 싶으면 `animation: none` 을 쓴다.

일부러 하지 않는 것 둘. 그룹 상태는 그룹의 것이고 자식에게 내려가지 않는다 — VM 을 만들었다고 그 안의 서비스가 배포되지 않는다. 그리고 축은 하나다 — 코드는 끝났지만 배포 전인 노드는 오늘은 한 단어를 골라야 한다.

## Scenario

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | ✓ | 노드 id 와 같이 **`A-Z a-z 0-9 - _` 만** |
| `label` | string | — | 버튼에 쓰이는 글자. 기본값은 `id` |

시나리오가 무엇을 바꾸는지 나열하는 대신 **요소가 자기가 언제 살아 있는지**를 말한다. 한 줄이 한 요소를 설명해서 생성기가 한 번에 뱉을 수 있다. 선언되지 않은 이름을 쓰면 조용히 빠지는 게 아니라 오류다.

레이아웃은 모든 요소가 있는 채로 한 번만 잡고 시나리오는 무엇을 그릴지만 바꾼다 — 버튼을 눌러도 그림이 움직이지 않는다. 대가 하나는 의도한 것이다: 요소는 살아 있거나 아니거나뿐이라, 고장 → 감지 → 복구처럼 단계를 밟는 시나리오는 순서로 쓸 수 없다.

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
