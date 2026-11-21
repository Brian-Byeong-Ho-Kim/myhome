// GET /api/list?days=150 — 최근 민영 APT 공고 목록 (30분 캐시)
import { makeGet, fetchList, daysAgo } from '../../src/shape.js';
import { cached } from '../../src/cache.js';
export const onRequestGet = ctx => {
  const days = Math.min(365, Math.max(30, parseInt(new URL(ctx.request.url).searchParams.get('days') || '150', 10) || 150));
  return cached(ctx, 1800, async () => ({ danji: await fetchList(makeGet(ctx.env.ODCLOUD_KEY), daysAgo(days)) }));
};
