---
name: smart-commit
description: Generates atomic commit messages based on staged changes, extracting issue IDs from the branch name (e.g., AD-123). Use this skill whenever the user asks to commit, says "commit this", "commit changes", "make a commit", or after completing a task that should be committed.
---

# Smart Commit

**형식**: `<ID> <type>: <summary>` — 예 `AD-123 feat: replace date pickers with VDateInput`

- **ID** = 현재 브랜치명에서 뽑은 `AD-<번호>`(`feat/AD-12-x`·`hotfix/AD-12`·`AD-12-x` 모두 해당). 없으면 ID 없이 `<type>: <summary>`.
  프리픽스는 프로젝트명 이니셜 2~3글자("Oh My Algorithm" → `OMA`).
  **대괄호 없음** — `[AD-12]`가 아니라 `AD-12`. (대괄호는 이슈 보드 표기용.)
- **summary** = 명령형 현재형(`add`/`fix`/`update`), 72자 이내, 마침표 없음.
- **본문**은 *왜*가 필요할 때만. 변경 파일 나열 금지.

## type (7종)

| type | 쓸 때 |
|------|-------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서만 변경 (`*.md`·주석·README·CLAUDE.md) |
| `style` | 동작 무변화 + 코드 의미도 무변화 — 포맷팅·공백·세미콜론·import 정렬 |
| `refactor` | 동작 무변화 + 코드 구조 변경 — 추출·이동·이름 변경·중복 제거 |
| `test` | 테스트 추가·수정 |
| `chore` | 위 어디에도 안 드는 나머지 — 빌드·설정·의존성·CI·스크립트 |

경계가 헷갈릴 때: **사용자 눈에 보이는 동작이 바뀌면** `feat`/`fix`. 안 바뀌면 무엇을 건드렸는지로 고른다 — 문서면 `docs`, 코드 모양만이면 `style`, 코드 구조면 `refactor`, 테스트면 `test`, 그 외 설정·도구면 `chore`.

## Atomic

한 커밋 = 한 가지 일. 관련 없는 변경이 섞였으면 파일 단위로 나눠 여러 번 커밋한다(작은 커밋 5개 > 불릿 나열된 큰 커밋 1개). 나누기 애매할 만큼 많으면 사용자에게 묶는 기준을 묻는다.

```bash
git restore --staged .                        # 깨끗한 상태에서 시작
git add <이 커밋에 속한 파일들>                 # 그룹별로
git commit -m "AD-123 fix: ..." # 반복
```

## 금지

**`Co-Authored-By`·`Signed-off-by` 등 Claude/AI를 가리키는 trailer를 절대 붙이지 않는다.** 커밋은 개발자가 직접 쓴 것처럼 보여야 한다.
