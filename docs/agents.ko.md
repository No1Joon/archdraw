# 에이전트용 사용법

[English](./agents.md) · **한국어**

archdraw 는 LLM 을 호출하지 않는다. **에이전트가 YAML 을 쓰고 archdraw 가 그린다.**

## 3단계

```bash
# 1. 쓸 수 있는 type 을 찾는다 — 추측하지 않는다
npx archdraw types postgres
npx archdraw types run -p gcp
npx archdraw types redis -p aws,brands   # 팩을 여러 개 걸면 둘 다 나온다

# 2. 렌더 없이 검증한다 — 빠르고, 실패하면 exit 1
cat diagram.yaml | npx archdraw - --check

# 3. 그린다
cat diagram.yaml | npx archdraw - -o out.png -s 2
npx archdraw diagram.yaml -o out.svg          # 파일도 된다
npx archdraw diagram.yaml                     # -o 생략 시 stdout 으로 SVG
```

입력 계약은 [`schema.ko.md`](./schema.ko.md) 에 있고, 같은 내용을 기계가 읽을 형태로도 낸다.

```bash
npx archdraw schema          # JSON Schema (중첩 형 포함)
npx archdraw schema --flat   # 평면 형만
```

## 오류를 신호로 쓴다

메시지는 그대로 읽고 고칠 수 있게 쓰여 있다. 임의로 다른 값을 넣지 말고 메시지가 시키는 대로 고친다.

```
$ echo 'nodes: [{ id: a, type: lambdaa }]' | archdraw - --check
Unknown type 'lambdaa'.
  Did you mean: lambda?
```

해석되지 않는 `type` 은 **절대 비슷한 아이콘으로 대체되지 않는다.** 틀린 아이콘이 맞는 것처럼 렌더되면 다이어그램이 거짓말을 하기 때문이다.

## 팩 고르기

| 팩 | 무엇이 있나 |
|---|---|
| `aws` · `gcp` | 클라우드 공식 서비스 아이콘 |
| `brands` | 브랜드·OSS 마크 — Redis·nginx·PostgreSQL·Docker·Cloudflare 등 |

`-p aws,brands` 처럼 콤마로 여러 개를 건다. 하나의 다이어그램이 클라우드와 그 위에서 도는 소프트웨어를 함께 담는 일이 흔하다.

**같은 것을 가리키는 두 아이콘을 구분한다** — `redis`(Redis 자체)와 `amazon-elasticache`(AWS 관리형)는 다른 것이다. 자체호스팅에 관리형 아이콘을 붙이면 그림이 거짓말을 한다.

## 아이콘이 없는 구성요소

`type` 을 생략하면 라벨 박스로 그려진다. 세 팩 어디에도 없는 사내 서비스 같은 것을 여기에 쓴다. 억지로 비슷한 아이콘을 붙이지 않는다.

```yaml
nodes:
  - { id: api, type: ecs, label: api }
  - { id: atlas, label: MongoDB Atlas }   # 아이콘 없음 — 박스로 그려진다
edges:
  - { from: api, to: atlas, label: query }
```

## 읽히는 그림을 만드는 규칙

- **최상위 형제를 묶는다.** 외부 의존과 매니지드 서비스를 각각 그룹으로 모으면 가로로만 길어지는 것을 막고 경계가 드러난다.
- **`direction` 은 전역이다.** 그룹마다 다르게 줄 수 없다. 흐름이 한 줄로 길면 `RIGHT`, 층이 쌓이면 `DOWN` 이 대체로 낫다.
- **id 는 영숫자·`-`·`_` 만.** 라벨에는 한글을 써도 되지만 id 에는 못 쓴다.
- 사실만 그린다. 확인하지 못한 구성요소는 넣지 않는다.
