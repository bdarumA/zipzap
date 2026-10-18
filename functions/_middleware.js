import { record } from '../lib/traffic.js';
// Record successful landing-page GETs at the edge, including clients that do not run JS.
// This middleware never changes routing, content or LINE behavior for any visitor.
export async function onRequest({ request, next, env, waitUntil }) {
  const url = new URL(request.url);
  const landing = request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html');
  const response = await next();
  if (landing && response.status === 200 && env.SIANKAI_TRAFFIC_DB) {
    const providerVerified = request.cf?.botManagement?.verifiedBot === true;
    const agent = request.headers.get('User-Agent') || '';
    // User-Agent matches are UNSUBSTANTIATED automation indicators, not identity proofs.
    // Meta-related tokens here are treated identically to all other bot-like tokens.
    const browserHint = /(?:bot|crawler|spider|facebookexternalhit|meta-externalagent|meta-externalfetcher|headlesschrome)/i.test(agent);
    const metric = providerVerified ? 'visit_verified_automation' : browserHint ? 'visit_automation_indicator' : 'visit_unknown';
    const p = record(env, metric);
    if (typeof waitUntil === 'function') waitUntil(p);
    else await p;
  }
  return response;
}
