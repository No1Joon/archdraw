# 기능 요청 구현 현황

2026-10-10에 정리한 사용자 요청 4건. 사용자 승인으로 네 기능의 구현·검증과 PR 머지를 마쳤다.
발행 내역은 [Release 워크플로](https://github.com/No1Joon/archdraw/actions/workflows/release.yml)에서 확인한다.

1. **시나리오 집중 보기 + 개별 내보내기** — [#59](https://github.com/No1Joon/archdraw/pull/59), 구현·검증 완료
   현재는 배치를 유지하고 제외 대상을 흐리게 한다. 기존 방식은 유지하면서, 선택 흐름만 숨김·확대하는 집중 모드와 해당 시나리오 PNG/SVG 내보내기를 추가.
2. **그룹 접기·펼치기** — [#60](https://github.com/No1Joon/archdraw/pull/60), 구현·검증 완료
   전체 화면에서는 `CaliMeal / Teampler / 감시 서버 / Mac` 만 보이고, 프로젝트를 펼치면 SDK·수집기·DB 가 나오는 방식. 여러 프로젝트 구조도에서 효과가 큼.
3. **경계 연결점과 그룹별 배치 방향** — [#61](https://github.com/No1Joon/archdraw/pull/61), 구현·검증 완료
   SSH·상태 조회 선이 길게 우회했던 사례. 그룹의 입출력 연결점(포트)과 그룹별 방향(direction)을 지정할 수 있게 해 보안 경계를 유지하면서 선을 정리.
4. **AI 가 처리할 수 있는 품질 진단** — [#62](https://github.com/No1Joon/archdraw/pull/62), 구현·검증 완료
   기존 우회선 경고를 JSON 으로 출력하고, 라벨 겹침·잘림·교차도 함께 진단 → AI CLI 가 렌더 결과를 보고 수정하는 데 활용. 정상적인 응답 방향의 역방향 선은 경고에서 구분.

각 기능과 함께 `docs/schema.md`·`docs/agents.md` 및 한국어 가이드를 갱신했다.

검증: 전체 156개 테스트·빌드·타입 검사·린트 통과. 기존 SVG 스냅샷 변경 없음.
브라우저에서 독립 그룹 전환·장애 시나리오 집중 보기·PNG/SVG 다운로드를 확인했고,
경계 포트 예시는 `examples/group-routing.yaml`에 있다.
품질 진단의 글자 영역은 레이아웃과 같은 추정값이며, 인터랙티브 HTML에는 약 1.7 MB의 오프라인 런타임이 포함된다.
