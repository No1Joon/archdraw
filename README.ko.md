# archdraw

[English](./README.md) · **한국어**

YAML 로 클라우드 아키텍처 다이어그램(SVG/PNG)을 그리는 CLI·라이브러리. AWS 793 · GCP 216 · 브랜드/OSS 3,453 개의 아이콘을 쓴다.

**AI CLI 가 쓰라고 만들었다** — archdraw 는 LLM 을 호출하지 않는다. 에이전트가 YAML 을 쓰면 archdraw 가 그린다.

![web-app 예제](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/web-app.png)

위 그림은 [`examples/web-app.yaml`](./examples/web-app.yaml) 을 그대로 렌더한 것이다.

```bash
npx archdraw examples/web-app.yaml -o web-app.png
```

## 시작하기

설치 없이 바로:

```bash
cat <<'YAML' | npx archdraw - -o out.png
provider: aws
nodes:
  - { id: alb, type: alb, label: public alb }
  - { id: api, type: ecs, label: api }
  - { id: atlas, label: MongoDB Atlas }
edges:
  - { from: alb, to: api, label: https }
  - { from: api, to: atlas, label: query }
YAML
```

`type` 이 있는 노드는 벤더 아이콘으로, 없는 노드는 라벨 상자로 그려진다 — 아이콘이 없는 서드파티도 그림에서 빠지지 않는다.

## CLI

```bash
archdraw <input> [-o out] [-p aws,brands] [--theme dark]  # 렌더. input 이 - 면 stdin, -o 생략 시 stdout
archdraw <input> --check                                  # 검증만. 실패 시 exit 1
archdraw types <query> [-p aws,brands]                    # 쓸 수 있는 type 검색
archdraw schema [--flat]                                  # 입력 계약을 JSON Schema 로
archdraw serve <file> --watch [--port 4173]               # 저장할 때마다 다시 그리는 미리보기
```

| 옵션 | |
|---|---|
| `-o, --out <file>` | 확장자가 `.png` 면 래스터, `.html` 이면 트래픽이 엣지를 따라 흐르는 자족형 페이지 하나, 그 외는 SVG. 생략하면 stdout |
| `-p, --provider <names>` | 불러올 아이콘 팩. 쉼표로 여러 개 (`aws,gcp,brands`). 생략하면 다이어그램의 `provider` |
| `-s, --scale <n>` | PNG 배율. 0 초과 10 이하. 기본 `2` |
| `--theme <name>` | `light` 또는 `dark`. 기본 `light` |
| `--check` | 아무것도 쓰지 않고 검증만 |

해석되지 않는 `type` 은 조용히 대체되지 않고 후보와 함께 실패한다 — 잘못된 아이콘이 그려지는 것보다 낫다.

```
Unknown type 'lambdaa'.
  Did you mean: lambda?
```

## 입력

두 가지 형태를 받는다. 사람은 중첩 형(`children`)이 편하고, 생성기는 재귀 없는 평면 형(`parent`)이 편하다. 둘은 같은 그림이 된다.

```yaml
# 중첩 형
groups:
  - id: vpc
    label: Production VPC
    kind: vpc
    children:
      - { id: api, type: ecs, label: API }
```

```yaml
# 평면 형
nodes:
  - { id: vpc, kind: vpc, label: Production VPC }
  - { id: api, type: ecs, label: API, parent: vpc }
```

전체 필드는 [`docs/schema.ko.md`](./docs/schema.ko.md) 에 있다. 기계가 읽을 형태는 `npx archdraw schema` 가 JSON Schema 로 내며, zod 정의에서 파생하므로 문서와 어긋나지 않는다.

## 예제

규모가 달라져도 문법은 같다. 아래 그림은 전부 `examples/` 의 YAML 을 그대로 렌더한 것이다.

```bash
npx archdraw examples/startup.yaml -o startup.png
```

### 초기 — [`examples/startup.yaml`](./examples/startup.yaml)

단일 AZ. EC2 하나가 전부고 나머지는 관리형에 맡긴다.

![startup 예제](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/startup.png)

### 중간 — [`examples/growth.yaml`](./examples/growth.yaml)

멀티 AZ. 모놀리스를 ECS 서비스로 쪼개고 큐·캐시·읽기 복제본과 관측을 분리한다.

![growth 예제](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/growth.png)

### 대규모 — [`examples/enterprise.yaml`](./examples/enterprise.yaml)

계정으로 경계를 긋고 리전을 두 개 굴린다. EKS·Aurora Global·MSK 위에 데이터 플랫폼과 공용 서비스 계정이 붙는다.

![enterprise 예제](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/enterprise.png)

### 그 밖 — 같은 문법이 취하는 다른 모양들

렌더 방법은 같다. 열어서 보면 된다.

<details>
<summary><a href="./examples/serverless-api.yaml"><code>serverless-api.yaml</code></a> — API Gateway·Lambda·EventBridge — 놓을 서버가 없고 관리형 서비스뿐이다</summary>

![serverless-api](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/serverless-api.png)

</details>

<details>
<summary><a href="./examples/gcp-data-platform.yaml"><code>gcp-data-platform.yaml</code></a> — GCP 를 <code>shape: card</code> 와 <code>direction: DOWN</code> 으로, 계층을 쌓아서</summary>

![gcp-data-platform](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/gcp-data-platform.png)

</details>

<details>
<summary><a href="./examples/k8s-onprem.yaml"><code>k8s-onprem.yaml</code></a> — 자체 호스팅만 — 제품 자신의 마크를 쓰고 관리형 아이콘을 대신 세우지 않는다</summary>

![k8s-onprem](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/k8s-onprem.png)

</details>

<details>
<summary><a href="./examples/ml-platform.yaml"><code>ml-platform.yaml</code></a> — 생성기가 뱉는 평면 형, 팩 둘을 동시에</summary>

![ml-platform](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/ml-platform.png)

</details>

<details>
<summary><a href="./examples/iot-telemetry.yaml"><code>iot-telemetry.yaml</code></a> — <code>external</code> 로 표시한 기기군에서 시작해 핫·콜드 저장으로 흘러든다</summary>

![iot-telemetry](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/iot-telemetry.png)

</details>

<details>
<summary><a href="./examples/cicd-gitops.yaml"><code>cicd-gitops.yaml</code></a> — 배포 파이프라인 — 클러스터 둘이 그 종착지다</summary>

![cicd-gitops](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/cicd-gitops.png)

</details>

<details>
<summary><a href="./examples/hybrid-network.yaml"><code>hybrid-network.yaml</code></a> — 데이터센터와 깊게 중첩된 VPC 서브넷 사이의 Direct Connect·VPN</summary>

![hybrid-network](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/hybrid-network.png)

</details>

<details>
<summary><a href="./examples/jamstack-edge.yaml"><code>jamstack-edge.yaml</code></a> — 처음부터 끝까지 관리형 플랫폼, 마크가 없는 자리는 아이콘 없는 상자로</summary>

![jamstack-edge](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/jamstack-edge.png)

</details>

<details>
<summary><a href="./examples/batch-etl.yaml"><code>batch-etl.yaml</code></a> — <code>wrap: true</code> 가 긴 사슬을 접는 모습과 그 대가인 읽는 순서</summary>

![batch-etl](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/batch-etl.png)

</details>

<details>
<summary><a href="./examples/multicloud.yaml"><code>multicloud.yaml</code></a> — 세 팩을 한꺼번에 — AWS 서빙 옆에 GCP 분석</summary>

![multicloud](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/multicloud.png)

</details>

<details>
<summary><a href="./examples/cache-failover.yaml"><code>cache-failover.yaml</code></a> — 한 레이아웃 위에 시나리오 셋 — <code>-o x.html</code> 로 내보내 버튼을 눌러 본다</summary>

![cache-failover](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/cache-failover.png)

</details>

<details>
<summary><a href="./examples/build-status.yaml"><code>build-status.yaml</code></a> — 무엇이 만들어졌고 무엇이 아직인지를 한 그림에 — 상태 표식과 범례</summary>

![build-status](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/build-status.png)

</details>

## 문서

| | |
|---|---|
| [`docs/schema.ko.md`](./docs/schema.ko.md) | 입력 계약 — 전체 필드, 두 가지 입력 형태, 거부되는 것 |
| [`docs/agents.ko.md`](./docs/agents.ko.md) | 에이전트 사용법 — 어휘 탐색 → 검증 → 렌더 |
| [`examples/`](./examples) | 위 [예제](#예제) 전부의 원본 YAML |

## 패키지

| 패키지 | 역할 |
|---|---|
| [`archdraw`](./packages/cli) | CLI. 세 아이콘 팩과 폰트를 번들해 `npx` 로 바로 동작한다 |
| [`@archdraw/core`](./packages/core) | 파싱·검증·ELK 레이아웃·SVG 렌더. 아이콘 자산 없음 |
| [`@archdraw/react`](./packages/react) | `<Architecture />` 컴포넌트 |
| [`@archdraw/icons-aws`](./packages/icons-aws) · [`@archdraw/icons-gcp`](./packages/icons-gcp) | 클라우드 공식 아이콘 + slug/alias 레지스트리. 의존성 0 |
| [`@archdraw/icons-brands`](./packages/icons-brands) | 브랜드·OSS 아이콘(Simple Icons, CC0). Redis·nginx·MongoDB 등 |

## 렌더에 대해

- SVG 렌더는 DOM 을 타지 않는다. 브라우저와 Node 가 같은 코드로 같은 결과를 낸다.
- PNG 는 번들한 Noto Sans KR 로만 래스터화한다 — 시스템 폰트에 기대지 않으므로 어느 머신에서나 같은 그림이 나온다. 라틴·한글 범위는 [`packages/cli/fonts`](./packages/cli/fonts) 참조.
- 레이아웃은 [ELK](https://eclipse.dev/elk/) 가 잡는다. 간선은 직교로 라우팅되어 아이콘을 피한다.

## 개발

```bash
pnpm install
pnpm build          # tsdown (ESM + d.mts)
pnpm test           # vitest — core 의 SVG 스냅샷 포함
pnpm typecheck
pnpm lint           # biome
pnpm icons:sync aws # 공식 아이콘 배포본 → packages/icons-aws/svg
pnpm changeset      # 버전 제안
```

Node 22+, pnpm 10. `pnpm icons:sync` 는 `unzip` 을 쓴다.

## 라이선스

코드는 MIT. 아이콘·폰트 자산은 각 소유자의 것이며 해당 약관을 따른다 — 각 패키지의 `NOTICE` 를 참조한다.
