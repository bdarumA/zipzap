// Site-wide aggregates only. Deliberately does not store visitor identity or tipster ID.
export const metrics = Object.freeze([
  'visit_unknown','visit_automation_indicator','visit_verified_automation',
  'click_verified','click_unverified','click_rejected'
]);
export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  }});
}
export function requestSameOrigin(request) {
  const url = new URL(request.url), origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return false;
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') return false;
  return true;
}
export async function authorized(request, env) {
  if (!env.SIANKAI_ADMIN_TOKEN) return false;
  const token = request.headers.get('X-Admin-Token') || '';
  if (!token || token.length > 4096) return false;
  const enc = new TextEncoder();
  const hash = async v => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(v)));
  const [supplied, expected] = await Promise.all([hash(token), hash(env.SIANKAI_ADMIN_TOKEN)]);
  if (supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < supplied.length; i++) diff |= supplied[i] ^ expected[i];
  return diff === 0;
}
export function utcDay(date = new Date()) {return date.toISOString().slice(0,10)}
export async function record(env, metric) {
  if (!env.SIANKAI_TRAFFIC_DB || !metrics.includes(metric)) return false;
  try {
    await env.SIANKAI_TRAFFIC_DB.prepare(
      'INSERT INTO traffic_daily (day_utc, metric, event_count) VALUES (?, ?, 1) '+
      'ON CONFLICT(day_utc, metric) DO UPDATE SET event_count = event_count + 1'
    ).bind(utcDay(), metric).run();
    return true;
  } catch (e) {
    // Never block a legitimate LINE click because the analytics backend is unavailable.
    console.warn('SIANKAI V7 analytics write failed', e?.message || 'unknown');
    return false;
  }
}
