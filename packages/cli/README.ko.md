# archdraw

[English](./README.md) · **한국어**

YAML 로 클라우드 아키텍처 다이어그램(SVG/PNG)을 그리는 CLI. AWS 793 · GCP 216 · 브랜드/OSS 3,453 개의 아이콘과 폰트를 번들해 `npx` 로 바로 동작한다.

**AI CLI 가 쓰라고 만들었다** — archdraw 는 LLM 을 호출하지 않는다. 에이전트가 YAML 을 쓰면 archdraw 가 그린다.

![web-app 예제](https://raw.githubusercontent.com/No1Joon/archdraw/main/docs/img/web-app.png)

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

`type` 이 있는 노드는 벤더 아이콘으로, 없는 노드는 라벨 상자로 그려진다.

## 명령

```bash
archdraw <input> [-o out] [-p aws,brands] [-s 2]  # 렌더. input 이 - 면 stdin, -o 생략 시 stdout
archdraw <input> --check                          # 검증만. 실패 시 exit 1
archdraw types <query> [-p aws,brands]            # 쓸 수 있는 type 검색
archdraw schema [--flat]                          # 입력 계약을 JSON Schema 로
```

| 옵션 | |
|---|---|
| `-o, --out <file>` | 확장자가 `.png` 면 래스터, 그 외는 SVG. 생략하면 stdout |
| `-p, --provider <names>` | 불러올 아이콘 팩. 쉼표로 여러 개 (`aws,gcp,brands`). 기본 `aws` |
| `-s, --scale <n>` | PNG 배율. 기본 `2` |
| `--check` | 아무것도 쓰지 않고 검증만 |

## 에이전트로 쓸 때

`types` 로 어휘를 찾고, `--check` 로 검증한 뒤, 렌더한다.

```bash
npx archdraw types redis -p aws,brands   # 쓸 수 있는 slug 확인
npx archdraw diagram.yaml --check        # exit 1 이면 stderr 에 고칠 단서가 있다
npx archdraw diagram.yaml -o out.png
```

해석되지 않는 `type` 은 조용히 대체되지 않고 후보와 함께 실패한다 — 잘못된 아이콘이 그려지는 것보다 낫다.

```
Unknown type 'lambdaa'.
  Did you mean: lambda?
```

기계가 읽을 입력 계약은 `npx archdraw schema` 가 JSON Schema 로 낸다.

## PNG 폰트

번들한 Noto Sans KR 하나로만 래스터화하고 시스템 폰트는 쓰지 않는다 — 같은 입력이 어느 머신에서나 같은 PNG 를 낸다. 라틴·한글 전체가 들어 있고, 한글 외 CJK 와 이모지는 범위 밖이다.

## 문서

- [입력 계약](https://github.com/No1Joon/archdraw/blob/main/docs/schema.ko.md) — 전체 필드, 두 가지 입력 형태, 거부되는 것
- [에이전트 사용법](https://github.com/No1Joon/archdraw/blob/main/docs/agents.ko.md)
- [저장소](https://github.com/No1Joon/archdraw)

## 라이선스

코드는 MIT. 아이콘·폰트 자산은 각 소유자의 것이며 해당 약관을 따른다 — `NOTICE` 와 `fonts/OFL.txt` 참조.
