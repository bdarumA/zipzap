const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
const DEFAULT_LINE_URL = 'https://lin.ee/YZ36jX0';
const DEFAULT_BRAND_NAME = 'เซียนไก่';
const DEFAULT_ACTIVE_SLUG = 'siankai';
const MAX_PROFILES = 80;
const profileKey = slug => `tipster_profile:${slug}`;
const validSlug = v => typeof v === 'string' && /^[a-z0-9][a-z0-9_-]{1,39}$/.test(v);
const validBrandName = v => typeof v === 'string' && v.length > 0 && v.length <= 60 && !/[<>\x00-\x1f]/.test(v);
const validImage = (v, maxLen) => typeof v === 'string' && (!v || (/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(v) && v.length <= maxLen));
function validLineUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && ['lin.ee', 'line.me', 'www.line.me', 'page.line.me'].includes(u.hostname.toLowerCase()) && value.length <= 500;
  } catch { return false; }
}
const validLineId = id => !id || /^@[a-zA-Z0-9._-]{2,40}$/.test(id);
const derivedUrl = id => `https://line.me/R/ti/p/${id}`;
const sanitizeProfile = (p = {}) => ({
  brandName: validBrandName(p.brandName) ? p.brandName : DEFAULT_BRAND_NAME,
  brandImage: validImage(p.brandImage, 130000) ? p.brandImage : '',
  heroImage: validImage(p.heroImage, 220000) ? p.heroImage : '',
  galleryImage: validImage(p.galleryImage, 220000) ? p.galleryImage : ''
});
async function getGlobals(env) {
  const [pixelId, lineId, storedLineUrl, activeTipsterSlug, profilesIndex] = await Promise.all([
    env.SIANKAI_SETTINGS.get('meta_pixel_id'),
    env.SIANKAI_SETTINGS.get('line_oa_id'),
    env.SIANKAI_SETTINGS.get('line_oa_url'),
    env.SIANKAI_SETTINGS.get('active_tipster_slug'),
    env.SIANKAI_SETTINGS.get('tipster_profiles_index', 'json')
  ]);
  const profiles = Array.isArray(profilesIndex) ? profilesIndex.filter(validSlug).slice(0, MAX_PROFILES) : [];
  return {
    pixelId: pixelId || '',
    lineId: lineId || '',
    lineConfiguredUrl: validLineUrl(storedLineUrl) ? storedLineUrl : '',
    lineUrl: validLineUrl(storedLineUrl) ? storedLineUrl : (validLineId(lineId) && lineId ? derivedUrl(lineId) : DEFAULT_LINE_URL),
    activeTipsterSlug: validSlug(activeTipsterSlug || '') ? activeTipsterSlug : (profiles[0] || DEFAULT_ACTIVE_SLUG),
    profiles
  };
}
async function getProfile(env, slug) {
  const raw = await env.SIANKAI_SETTINGS.get(profileKey(slug), 'json');
  if (!raw) return { brandName: DEFAULT_BRAND_NAME, brandImage: '', heroImage: '', galleryImage: '' };
  return sanitizeProfile(raw);
}
export async function onRequestGet({ request, env }) {
  if (!env.SIANKAI_SETTINGS) return response({ error: 'KV binding is not configured' }, 503);
  const url = new URL(request.url);
  const admin = url.searchParams.get('admin') === '1';
  const requested = url.searchParams.get('tipster') || '';
  const globals = await getGlobals(env);
  const chosen = validSlug(requested) ? requested : globals.activeTipsterSlug;
  const profile = await getProfile(env, chosen);
  return response({
    pixelId: globals.pixelId,
    lineId: globals.lineId,
    lineUrl: globals.lineUrl,
    lineConfiguredUrl: globals.lineConfiguredUrl,
    defaultLineUrl: DEFAULT_LINE_URL,
    activeTipsterSlug: globals.activeTipsterSlug,
    tipsterSlug: chosen,
    brandName: profile.brandName,
    brandImage: profile.brandImage,
    heroImage: profile.heroImage,
    galleryImage: profile.galleryImage,
    ...(admin ? { profiles: globals.profiles, profile } : {})
  });
}
async function authorized(request, env) {
  if (!env.SIANKAI_ADMIN_TOKEN) return false;
  const token = request.headers.get('X-Admin-Token') || '';
  const enc = new TextEncoder();
  const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)));
  const [provided, expected] = await Promise.all([digest(token), digest(env.SIANKAI_ADMIN_TOKEN)]);
  if (!token || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided[i] ^ expected[i];
  return diff === 0;
}
export async function onRequestPut({ request, env }) {
  if (!env.SIANKAI_SETTINGS || !env.SIANKAI_ADMIN_TOKEN) return response({ error: 'Server configuration incomplete' }, 503);
  if (!(await authorized(request, env))) return response({ error: 'Unauthorized' }, 401);
  let body;
  try {
    const len = Number(request.headers.get('Content-Length'));
    if (len && len > 550000) return response({ error: 'Request too large' }, 413);
    body = await request.json();
  } catch { return response({ error: 'Invalid JSON' }, 400); }
  if (!body || typeof body !== 'object') return response({ error: 'Invalid body' }, 400);

  const pixelId = typeof body.pixelId === 'string' ? body.pixelId.trim() : '';
  const lineId = typeof body.lineId === 'string' ? body.lineId.trim() : '';
  const lineUrl = typeof body.lineUrl === 'string' ? body.lineUrl.trim() : '';
  const profileSlug = typeof body.profileSlug === 'string' ? body.profileSlug.trim() : '';
  const brandName = typeof body.brandName === 'string' ? body.brandName.trim() : '';
  const brandImage = typeof body.brandImage === 'string' ? body.brandImage : '';
  const heroImage = typeof body.heroImage === 'string' ? body.heroImage : '';
  const galleryImage = typeof body.galleryImage === 'string' ? body.galleryImage : '';
  const makeActive = !!body.makeActive;

  if (pixelId && !/^\d{10,20}$/.test(pixelId)) return response({ error: 'Pixel ID must be 10–20 digits' }, 400);
  if (!validLineId(lineId)) return response({ error: 'LINE OA ID must begin with @ and contain 2–40 letters, numbers, dots, underscores or hyphens' }, 400);
  if (lineUrl && !validLineUrl(lineUrl)) return response({ error: 'LINE link must be a valid https://lin.ee/ or https://line.me/ URL' }, 400);
  if (!validSlug(profileSlug)) return response({ error: 'Profile slug must use 2–40 lowercase letters, numbers, underscore or hyphen' }, 400);
  if (!validBrandName(brandName)) return response({ error: 'ชื่อเซียนต้องมี 1–60 ตัวอักษร' }, 400);
  if (!validImage(brandImage, 130000)) return response({ error: 'รูปโปรไฟล์ไม่ถูกต้องหรือใหญ่เกิน โปรดเลือกรูปใหม่' }, 400);
  if (!validImage(heroImage, 220000)) return response({ error: 'รูป Hero ไม่ถูกต้องหรือใหญ่เกิน โปรดเลือกรูปใหม่' }, 400);
  if (!validImage(galleryImage, 220000)) return response({ error: 'รูปประกอบไม่ถูกต้องหรือใหญ่เกิน โปรดเลือกรูปใหม่' }, 400);

  const globals = await getGlobals(env);
  const nextProfiles = Array.from(new Set([...globals.profiles, profileSlug])).filter(validSlug).slice(0, MAX_PROFILES);
  await Promise.all([
    env.SIANKAI_SETTINGS.put('meta_pixel_id', pixelId),
    env.SIANKAI_SETTINGS.put('line_oa_id', lineId),
    env.SIANKAI_SETTINGS.put('line_oa_url', lineUrl),
    env.SIANKAI_SETTINGS.put('tipster_profiles_index', JSON.stringify(nextProfiles)),
    env.SIANKAI_SETTINGS.put(profileKey(profileSlug), JSON.stringify({ brandName, brandImage, heroImage, galleryImage })),
    makeActive ? env.SIANKAI_SETTINGS.put('active_tipster_slug', profileSlug) : Promise.resolve()
  ]);
  return response({ ok: true, profileSlug, activeTipsterSlug: makeActive ? profileSlug : globals.activeTipsterSlug || profileSlug, profiles: nextProfiles });
}
