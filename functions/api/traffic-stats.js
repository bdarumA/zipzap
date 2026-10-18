import {json, authorized, utcDay, metrics} from '../../lib/traffic.js';
// Admin-only, global daily metrics. No segmentation by tipster, device or geography.
export async function onRequestGet({request,env}){
  if(!env.SIANKAI_ADMIN_TOKEN)return json({error:'Admin token not configured'},503);
  if(!(await authorized(request,env)))return json({error:'Unauthorized'},401);
  if(!env.SIANKAI_TRAFFIC_DB)return json({error:'ยังไม่ได้เชื่อม D1 binding SIANKAI_TRAFFIC_DB — ดูวิธีตั้งค่าใน README_V7.txt'},503);
  const period=new URL(request.url).searchParams.get('days')||'7';
  if(!['7','30'].includes(period))return json({error:'Period must be 7 or 30'},400);
  const n=Number(period),end=new Date(), start=new Date(end.getTime()-(n-1)*86400000);
  const from=utcDay(start),to=utcDay(end);
  let rows;
  try{
    const out=await env.SIANKAI_TRAFFIC_DB.prepare(
      'SELECT day_utc, metric, event_count FROM traffic_daily WHERE day_utc >= ? AND day_utc <= ? ORDER BY day_utc ASC'
    ).bind(from,to).all();
    rows=out.results||[];
  }catch(e){return json({error:'Database not initialized. Run schema.sql once on D1.'},503)}
  const lookup=new Map();
  for(const r of rows){if(metrics.includes(r.metric)&&typeof r.day_utc==='string')lookup.set(r.day_utc+':'+r.metric,Math.max(0,Number(r.event_count)||0))}
  const days=[];
  for(let i=0;i<n;i++){
    const date=utcDay(new Date(start.getTime()+i*86400000));
    const get=m=>lookup.get(date+':'+m)||0;
    const verifiedAutomation=get('visit_verified_automation'),automationIndicators=get('visit_automation_indicator'),unknown=get('visit_unknown');
    const verifiedClicks=get('click_verified'),unverifiedClicks=get('click_unverified'),rejectedChallenges=get('click_rejected');
    days.push({date,visits:verifiedAutomation+automationIndicators+unknown,verifiedAutomation,automationIndicators,unknown,verifiedClicks,unverifiedClicks,rejectedChallenges,acceptedClicks:verifiedClicks+unverifiedClicks});
  }
  const totals={visits:0,verifiedAutomation:0,automationIndicators:0,unknown:0,verifiedClicks:0,unverifiedClicks:0,rejectedChallenges:0,acceptedClicks:0};
  for(const day of days)for(const k of Object.keys(totals))totals[k]+=day[k];
  return json({periodDays:n,timezone:'UTC',scope:'entire-site',turnstileEnabled:!!(env.SIANKAI_TURNSTILE_SITE_KEY&&env.SIANKAI_TURNSTILE_SECRET),days,totals,definition:{visits:'Successful landing-page GET requests at the Cloudflare edge, including non-JavaScript clients. NOT unique visitors. Requests blocked upstream are not counted.',verifiedAutomation:'Provider-confirmed automated requests, only when Cloudflare exposes verifiedBot to this Worker; typically unavailable on the Free plan.',automationIndicators:'Unverified bot-like User-Agent strings; can be spoofed and do not establish crawler identity.',unknown:'Visits lacking a verifiable automation signal; NOT confirmed people or customers.',verifiedClicks:'LINE outbound attempts that passed server-side Turnstile validation; NOT confirmed friend adds.',unverifiedClicks:'Accepted LINE outbound attempts while Turnstile is not enabled.',rejectedChallenges:'Requests that failed Turnstile validation; NOT proof of a bot.'}});
}
