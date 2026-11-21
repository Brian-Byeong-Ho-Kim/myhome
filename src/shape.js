// 청약홈 API 응답을 계산기용 형태로 바꾸는 공용 함수 (Worker와 스냅숏 스크립트가 함께 씀)
export const API = 'https://api.odcloud.kr/api/';
export const EP = {
  list: 'ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail',
  mdl: 'ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancMdl',
  cmp: 'ApplyhomeInfoCmpetRtSvc/v1/getAPTLttotPblancCmpet',
  score: 'ApplyhomeInfoCmpetRtSvc/v1/getAptLttotPblancScore',
  sp: 'ApplyhomeInfoCmpetRtSvc/v1/getAPTSpsplyReqstStus',
};
const CAP = ['서울', '경기', '인천'], METRO = ['부산', '대구', '광주', '대전', '울산'];
const SKIP = /조합원|취소분|임대|공공분양|토지임대|지분적립/;
const num = v => { const x = parseFloat(v); return Number.isFinite(x) ? x : null; };

export function makeGet(key, fetchFn = fetch) {
  return async path => {
    const r = await fetchFn(API + path, { headers: { Authorization: 'Infuser ' + key } });
    if (!r.ok) throw new Error('청약홈 API 응답 ' + r.status);
    return r.json();
  };
}

export async function fetchList(get, from) {
  let all = [];
  for (let p = 1; p <= 5; p++) {
    const d = await get(`${EP.list}?page=${p}&perPage=200&cond[RCRIT_PBLANC_DE::GTE]=${from}`);
    all = all.concat(d.data || []);
    if (!d.data || d.data.length < 200) break;
  }
  return all
    .filter(x => x.HOUSE_DTL_SECD_NM === '민영' && !SKIP.test(x.HOUSE_NM))
    .map(x => ({
      id: x.HOUSE_MANAGE_NO, nm: x.HOUSE_NM, sido: x.SUBSCRPT_AREA_CODE_NM, addr: x.HSSPLY_ADRES,
      pub: x.RCRIT_PBLANC_DE, rc: x.RCEPT_BGNDE, win: x.PRZWNER_PRESNATN_DE,
      rg: x.SPECLT_RDN_EARTH_AT === 'Y' ? 'tg' : x.MDAT_TRGET_AREA_SECD === 'Y' ? 'cg'
        : (CAP.includes(x.SUBSCRPT_AREA_CODE_NM) || METRO.includes(x.SUBSCRPT_AREA_CODE_NM) ? 'nm' : 'nl'),
      pt: x.PUBLIC_HOUSE_EARTH_AT === 'Y', url: x.PBLANC_URL,
    }))
    .sort((a, b) => b.pub.localeCompare(a.pub));
}

export async function fetchTypes(get, id) {
  const q = `?page=1&perPage=300&cond[HOUSE_MANAGE_NO::EQ]=${encodeURIComponent(id)}`;
  const [m, c, s, sp] = await Promise.all([EP.mdl, EP.cmp, EP.score, EP.sp].map(p => get(p + q)));
  const T = {};
  (m.data || []).forEach(r => {
    const ty = r.HOUSE_TY.trim();
    T[ty] = { ty, g: r.SUPLY_HSHLDCO, pr: num(r.LTTOT_TOP_AMOUNT),
      sp: { nh: r.NWWDS_HSHLDCO, fs: r.LFE_FRST_HSHLDCO, nb: r.NWBB_HSHLDCO, mc: r.MNYCH_HSHLDCO, op: r.OLD_PARNTS_SUPORT_HSHLDCO, in: r.INSTT_RECOMEND_HSHLDCO } };
  });
  (c.data || []).forEach(r => {
    const t = T[r.HOUSE_TY.trim()]; if (!t) return;
    (t.c ||= {})[r.SUBSCRPT_RANK_CODE + '_' + r.RESIDE_SECD] = [num(r.REQ_CNT), num(r.CMPET_RATE)];
  });
  (s.data || []).forEach(r => {
    const t = T[r.HOUSE_TY.trim()]; if (!t) return;
    const v = [num(r.LWET_SCORE), num(r.AVRG_SCORE), num(r.TOP_SCORE)];
    if (v[0]) (t.s ||= {})[r.RESIDE_SECD] = v;
  });
  (sp.data || []).forEach(r => {
    const t = T[r.HOUSE_TY.trim()]; if (!t) return;
    const a = k => (r['CRSPAREA_' + k] || 0) + (r['CTPRVN_' + k] || 0) + (r['ETC_AREA_' + k] || 0);
    t.q = { nh: a('NWWDS_NMTW_CNT'), fs: a('LFE_FRST_CNT'), nb: a('NWBB_NWBBSHR_CNT'), mc: a('MNYCH_CNT'), op: a('OPS_CNT') };
  });
  return Object.values(T);
}

export function rate1(t, k = '1_01') {
  const c = t.c && t.c[k];
  if (!c || c[0] == null) return null;
  return c[1] != null ? c[1] : (t.g ? +(c[0] / t.g).toFixed(2) : null);
}

export function medians(danji) {
  const med = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  const R = {}, S = {};
  for (const d of danji) for (const t of d.types || []) {
    const r = rate1(t), m = t.s && t.s['01'] && t.s['01'][0];
    if (r != null) (R[d.sido] ||= []).push(r);
    if (m) (S[d.sido] ||= []).push(m);
  }
  const allR = Object.values(R).flat(), allS = Object.values(S).flat(), out = {};
  for (const k of new Set(danji.map(d => d.sido))) out[k] = { r: +(med(R[k] || allR) ?? 1).toFixed(1), s: Math.round(med(S[k] || allS) ?? 50), nr: (R[k] || []).length, ns: (S[k] || []).length };
  out['전국'] = { r: +(med(allR) ?? 1).toFixed(1), s: Math.round(med(allS) ?? 50), nr: allR.length, ns: allS.length };
  return out;
}

export const daysAgo = n => new Date(Date.now() - n * 864e5 + 9 * 36e5).toISOString().slice(0, 10);
