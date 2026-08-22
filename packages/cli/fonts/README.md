# fonts

`NotoSansKR.ttf` 는 PNG 래스터화에 쓰는 유일한 폰트다. `cli.ts` 가 `Resvg` 에 이 파일만 넘기고
`loadSystemFonts` 를 끈다 — 같은 입력이 어느 머신에서나 같은 PNG 를 내야 하고, resvg 는 해석할
수 없는 family 를 만나면 글자를 아예 그리지 않는다.

## 출처

- Noto Sans KR, [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) `Sans/Variable/OTF/Subset/NotoSansKR-VF.otf`
- 라이선스 SIL OFL 1.1 — 전문은 `OFL.txt`

## 재생성

```bash
pip install fonttools
curl -sLO https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/OTF/Subset/NotoSansKR-VF.otf
pyftsubset NotoSansKR-VF.otf --output-file=sub.ttf --name-IDs='*' \
  --unicodes='U+0020-007E,U+00A0-00FF,U+2000-206F,U+20A0-20BF,U+2122,U+3000-303F,U+3130-318F,U+1100-11FF,U+AC00-D7A3,U+FF00-FFEF'
fonttools varLib.instancer sub.ttf wght=400:700 -o NotoSansKR.ttf
```

수록 범위는 라틴·한글 전체(11,172 음절)·문장부호다. 8.30 MB → 3.22 MB.

## 제약

- **가변 폰트로 유지한다.** `wght` 를 한 값으로 고정해 정적 폰트로 만들면 resvg 2.6.2 가 파일을
  읽지 못해 모든 글자가 사라진다. 축 범위를 좁히는 것(`400:700`)까지만 한다.
- resvg 는 `font-weight` 를 적용하지 않는다. 굵기 차이는 브라우저가 SVG 를 직접 열 때만 보인다.
- 한글 외 CJK(일본어 가나·한자)와 이모지는 수록 범위 밖이라 빈칸으로 나온다.

`cli.test.ts` 의 `PNG text` 가 글자가 실제로 그려지는지 지킨다 — 폰트를 지우면 실패한다.
