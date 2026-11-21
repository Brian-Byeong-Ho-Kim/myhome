# 내집분양 (myhome)

민영주택 청약 당첨 확률 계산기. 청약홈 공공데이터로 단지·주택형별 공급 세대수, 경쟁률, 당첨가점, 특별공급 신청현황을 실시간으로 불러온다.

## 구조

- `public/` — 정적 페이지(`index.html`)와 지역 중앙값·대체용 스냅숏(`data/danji.json`)
- `src/worker.js` — Cloudflare Worker. `/api/list`(최근 민영 공고, 30분 캐시), `/api/danji/:id`(주택형·경쟁률·가점·특공, 10분 캐시)
- `src/shape.js` — 청약홈 API 응답 정리 (Worker와 스냅숏 스크립트 공용)
- `scripts/snapshot.mjs` + `.github/workflows/snapshot.yml` — 매일 스냅숏 갱신

## 인증키

공공데이터포털 일반 인증키를 코드에 넣지 않는다.

- Cloudflare: Workers > myhome > 설정 > 변수 및 비밀 > `ODCLOUD_KEY` (비밀)
- GitHub: Settings > Secrets and variables > Actions > `ODCLOUD_KEY`

## 로컬 실행

```
echo "ODCLOUD_KEY=발급받은키" > .dev.vars
npx wrangler dev
```

## 출처

한국부동산원 청약홈 분양정보 조회 서비스, 청약접수 경쟁률 및 특별공급 신청현황 조회 서비스 (공공데이터포털, 이용허락범위 제한 없음). 계산 결과는 추정치이며 공식 자격·점수는 청약홈과 입주자모집공고에서 확인.
