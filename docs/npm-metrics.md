# npm 지표와 AMP 연동 기준

2026-10-16 확인. 요청 ID: `AMP-ARCHDRAW-20261016-001`.

대표 지표는 공개 CLI **`archdraw`의 UTC 일별 다운로드**다. 로컬 package.json과 공개 registry의 이름·repository·directory를 대조했다. 모두 `No1Joon/archdraw`의 해당 패키지를 가리키며 공개 latest 조회가 성공했다. 이름 변경·deprecated 표시는 없었다.

| 공개 패키지 | 확인 버전 | 저장소 경로 |
|---|---|---|
| `archdraw` | 0.11.4 | packages/cli |
| `@archdraw/core` | 0.11.4 | packages/core |
| `@archdraw/react` | 0.1.22 | packages/react |
| `@archdraw/icons-aws` | 0.2.4 | packages/icons-aws |
| `@archdraw/icons-gcp` | 0.2.2 | packages/icons-gcp |
| `@archdraw/icons-brands` | 0.1.4 | packages/icons-brands |

공개 패키지는 CLI 포함 총 6개, 보조 패키지는 5개다. 공개 metadata의 repository 일치를 확인했으며 계정 권한이나 자격을 변경하지 않았다.

공식 npm 통계만 사용한다. 다운로드는 회원·고유 사용자·실제 설치 수와 다르며 의존 패키지 다운로드를 합산하지 않는다. UTC 기준 하루 집계와 KST 회원/스토어 지표를 같은 날짜 정의로 취급하지 않는다. 오늘 미집계·조회 실패·미수집을 0으로 채우지 않는다. `last-week`는 마지막 사용 가능한 7일이며 달력 주간이 아니다. scoped 패키지는 각각 조회한다.

[공식 download-counts 계약](https://github.com/npm/registry/blob/main/docs/download-counts.md)과 [CLI 공개 metadata](https://registry.npmjs.org/archdraw/latest)가 근거다. 공개 조회와 기준 확인만 수행했다. AMP 수집기·화면·설치·정기 실행은 AMP 담당이며 이 확인은 운영 연결 완료를 뜻하지 않는다. 원본 통계나 자격은 이 문서에 저장하지 않는다.

## AMP 인수

2026-10-16 AMP 담당이 위 확인 결과를 `/Users/joon/Documents/projects/all-my-projects/docs/integrations/npm.md`에 이관하고 인수 완료를 통보했다. 이로써 Archdraw의 대상 확인 요청은 종료했다. AMP의 수집기·화면 구현/검사는 AMP 정본이 관리하며 Archdraw에서 운영 검증을 대신 확정하지 않는다. POP 회신의 완료 본문은 정리했다.
