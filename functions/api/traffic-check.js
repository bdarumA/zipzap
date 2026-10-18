import { json, record, requestSameOrigin } from '../../lib/traffic.js';
// Applies the SAME LINE-click rules to every visitor, including platform crawlers.
export async function onRequestGet({env}){
  const turnstileEnabled=!!(env.SIANKAI_TURNSTILE_SITE_KEY&&env.SIANKAI_TURNSTILE_SECRET);
  return json({turnstileEnabled,siteKey:turnstileEnabled?env.SIANKAI_TURNSTILE_SITE_KEY:'',analyticsEnabled:!!env.SIANKAI_TRAFFIC_DB});
}
export async function onRequestPost({request,env}){
  if(!requestSameOrigin(request))return json({error:'Bad origin'},403);
  if(!(request.headers.get('Content-Type')||'').toLowerCase().includes('application/json'))return json({error:'JSON required'},415);
  let body;try{body=await request.json()}catch{return json({error:'Invalid request'},400)}
  const placement=String(body?.placement||'');
  if(!/^[a-z0-9_-]{1,40}$/.test(placement))return json({error:'Invalid placement'},400);
  const enabled=!!(env.SIANKAI_TURNSTILE_SITE_KEY&&env.SIANKAI_TURNSTILE_SECRET);
  if(enabled){
    const token=typeof body?.turnstileToken==='string'?body.turnstileToken:'';
    if(!token||token.length>2048)return json({ok:false,challengeRequired:true},403);
    const form=new FormData();form.set('secret',env.SIANKAI_TURNSTILE_SECRET);form.set('response',token);
    try{
      const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});
      if(!check.ok)return json({error:'Verification service temporarily unavailable'},503);
      const data=await check.json();
      const host=new URL(request.url).hostname.toLowerCase();
      const hostnameOk=String(data.hostname||'').toLowerCase()===host;
      const actionOk=data.action==='line_click';
      if(!data.success||!hostnameOk||!actionOk){
        await record(env,'click_rejected');
        return json({ok:false,challengeRequired:true},403);
      }
    }catch(e){return json({error:'Verification service temporarily unavailable'},503)}
  }
  const recorded=await record(env,enabled?'click_verified':'click_unverified');
  return json({ok:true,verified:enabled,analyticsRecorded:recorded});
}
