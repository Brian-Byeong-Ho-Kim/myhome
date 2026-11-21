// 내집분양 — 청약홈 API 중계 Worker
// 인증키(ODCLOUD_KEY)는 Cloudflare 비밀값에만 두고, 응답은 엣지 캐시에 잠깐 저장해 호출 한도를 아낀다.
import { makeGet, fetchList, fetchTypes, daysAgo } from './shape.js';

const json = (body, ttl, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${ttl}` },
});

async function cached(request, ctx, ttl, make) {
  const cache = caches.default, key = new Request(new URL(request.url).toString(), { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = json({ ...(await make()), fetchedAt: new Date().toISOString() }, ttl);
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.method !== 'GET') return json({ error: 'GET만 지원합니다' }, 0, 405);
    if (!env.ODCLOUD_KEY) return json({ error: '서버에 인증키가 설정되지 않았습니다' }, 0, 503);
    const get = makeGet(env.ODCLOUD_KEY);
    try {
      if (url.pathname === '/api/list') {
        const days = Math.min(365, Math.max(30, parseInt(url.searchParams.get('days') || '150', 10) || 150));
        return await cached(request, ctx, 1800, async () => ({ danji: await fetchList(get, daysAgo(days)) }));
      }
      const m = url.pathname.match(/^\/api\/danji\/(\d{6,12})$/);
      if (m) return await cached(request, ctx, 600, async () => ({ id: m[1], types: await fetchTypes(get, m[1]) }));
      return json({ error: '없는 경로입니다' }, 0, 404);
    } catch (e) {
      return json({ error: String(e.message || e) }, 0, 502);
    }
  },
};
