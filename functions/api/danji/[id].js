// GET /api/danji/:id — 주택형·경쟁률·당첨가점·특공 신청현황 (10분 캐시)
import { makeGet, fetchTypes } from '../../../src/shape.js';
import { cached, json } from '../../../src/cache.js';
export const onRequestGet = ctx => {
  const id = String(ctx.params.id || '');
  if (!/^\d{6,12}$/.test(id)) return json({ error: '단지 번호 형식이 아닙니다' }, 0, 400);
  return cached(ctx, 600, async () => ({ id, types: await fetchTypes(makeGet(ctx.env.ODCLOUD_KEY), id) }));
};
