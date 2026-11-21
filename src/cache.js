// Pages Functions 공용: 엣지 캐시에 응답을 잠깐 저장해 청약홈 API 호출 한도를 아낀다.
export const json = (body, ttl, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${ttl}` },
});
export async function cached(context, ttl, make) {
  if (!context.env.ODCLOUD_KEY) return json({ error: '서버에 인증키가 설정되지 않았습니다' }, 0, 503);
  const cache = caches.default, key = new Request(new URL(context.request.url).toString(), { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const res = json({ ...(await make()), fetchedAt: new Date().toISOString() }, ttl);
    context.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) {
    return json({ error: String(e.message || e) }, 0, 502);
  }
}
