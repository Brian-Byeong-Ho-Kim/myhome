// 최근 민영 APT 전체를 받아 public/data/danji.json(지역 중앙값 + 실시간 조회 실패 시 대체 데이터)을 만든다.
// 사용: ODCLOUD_KEY=... node scripts/snapshot.mjs
import { writeFile } from 'node:fs/promises';
import { makeGet, fetchList, fetchTypes, medians, daysAgo } from '../src/shape.js';

const key = process.env.ODCLOUD_KEY;
if (!key) { console.error('ODCLOUD_KEY 환경변수가 필요합니다'); process.exit(1); }
const get = makeGet(key);
const from = daysAgo(150);
const list = await fetchList(get, from);
const danji = [];
// 단지 2개씩(동시 요청 8개 이하) 천천히 받아 API 요청 과다(429)를 피한다
for (let i = 0; i < list.length; i += 2) {
  const part = await Promise.all(list.slice(i, i + 2).map(async d => ({ ...d, types: await fetchTypes(get, d.id) })));
  danji.push(...part.filter(d => d.types.length));
  await new Promise(r => setTimeout(r, 300));
}
const meta = { updated: daysAgo(0), from, src: '한국부동산원 청약홈 분양정보·경쟁률 조회 서비스 (공공데이터포털)', med: medians(danji) };
await writeFile(new URL('../public/data/danji.json', import.meta.url), JSON.stringify({ meta, danji }));
console.log(`단지 ${danji.length}개, 기준일 ${meta.updated}`);
