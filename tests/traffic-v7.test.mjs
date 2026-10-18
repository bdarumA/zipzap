import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest as middleware} from '../functions/_middleware.js';
import {onRequestPost as click, onRequestGet as clickConfig} from '../functions/api/traffic-check.js';
import {onRequestGet as stats} from '../functions/api/traffic-stats.js';

const base='https://siankaiss-web.pages.dev';
function fakeDB(){
  const db=new Map();
  return {
    db,
    prepare(sql){return {bind(...params){return {
      async run(){const [day,metric]=params;db.set(day+'|'+metric,(db.get(day+'|'+metric)||0)+1);return {success:true}},
      async all(){const [start,end]=params;const results=[];for(const [key,event_count] of db){const [day_utc,metric]=key.split('|');if(day_utc>=start&&day_utc<=end)results.push({day_utc,metric,event_count})}return {results}}
    }}}}
  }
}
const mkReq=(path,method='GET',obj,more={})=>new Request(base+path,{
  method,headers:{Origin:base,...(obj?{'Content-Type':'application/json'}:{}),...(more.headers||{})},
  ...(obj?{body:JSON.stringify(obj)}:{})
});
const asJson=async r=>({status:r.status,body:await r.json()});
const baseEnv=db=>({SIANKAI_TRAFFIC_DB:db,SIANKAI_ADMIN_TOKEN:'test_token_0123456789',SIANKAI_SETTINGS:null});

test('V7 aggregates tipster page visits into one site-wide count, including non-JS crawlers',async()=>{
  const database=fakeDB(),env=baseEnv(database);
  const simulate=async (path,agent,cf)=>{
    const request=new Request(base+path,{headers:{'User-Agent':agent}});
    request.cf=cf;
    const tasks=[];
    const result=await middleware({request,env,next:async()=>new Response('<html></html>',{status:200}),waitUntil:p=>tasks.push(p)});
    await Promise.all(tasks);
    return result;
  };
  await simulate('/?tipster=alice','Mozilla/5.0',{});
  await simulate('/?tipster=bob','MySpiderBot/1.0',{});
  await simulate('/index.html?tipster=charlie','OfficialAgent/1.0',{botManagement:{verifiedBot:true}});
  await simulate('/admin.html','Mozilla/5.0',{});
  await simulate('/api/traffic-stats','Mozilla/5.0',{});
  const report=await asJson(await stats({request:mkReq('/api/traffic-stats?days=7','GET',null,{headers:{'X-Admin-Token':env.SIANKAI_ADMIN_TOKEN}}),env}));
  assert.equal(report.status,200);assert.equal(report.body.scope,'entire-site');
  assert.equal(report.body.totals.visits,3);assert.equal(report.body.totals.unknown,1);
  assert.equal(report.body.totals.automationIndicators,1);assert.equal(report.body.totals.verifiedAutomation,1);
  assert.ok(!('tipster' in report.body));
  assert.equal(report.body.days.length,7);
  const report30=await asJson(await stats({request:mkReq('/api/traffic-stats?days=30','GET',null,{headers:{'X-Admin-Token':env.SIANKAI_ADMIN_TOKEN}}),env}));
  assert.equal(report30.body.days.length,30);
});

test('Traffic dashboard denies missing or wrong admin token',async()=>{
  const env=baseEnv(fakeDB());
  assert.equal((await stats({request:mkReq('/api/traffic-stats'),env})).status,401);
  assert.equal((await stats({request:mkReq('/api/traffic-stats','GET',null,{headers:{'X-Admin-Token':'wrong'}}),env})).status,401);
  assert.equal((await stats({request:mkReq('/api/traffic-stats?days=365','GET',null,{headers:{'X-Admin-Token':env.SIANKAI_ADMIN_TOKEN}}),env})).status,400);
});

test('Middleware does not modify the landing-page response or count failed pageviews',async()=>{
  const db=fakeDB(),env=baseEnv(db),request=new Request(base+'/?tipster=test');
  const res=await middleware({request,env,next:async()=>new Response('Not found',{status:404}),waitUntil:()=>{throw Error('should not record')}});
  assert.equal(res.status,404);assert.equal(db.db.size,0);
});

test('Click without Turnstile is accepted but never labeled verified',async()=>{
  const db=fakeDB(),env=baseEnv(db);
  const config=await asJson(await clickConfig({env}));assert.equal(config.body.turnstileEnabled,false);
  const result=await asJson(await click({request:mkReq('/api/traffic-check','POST',{placement:'hero'}),env}));
  assert.equal(result.status,200);assert.equal(result.body.verified,false);
  assert.equal([...db.db.entries()].filter(([k])=>k.endsWith('click_unverified'))[0][1],1);
});

test('Click validates Turnstile action & hostname before verified count',async()=>{
  const db=fakeDB(),env={...baseEnv(db),SIANKAI_TURNSTILE_SITE_KEY:'publickey',SIANKAI_TURNSTILE_SECRET:'secret'};
  const origFetch=globalThis.fetch;
  try{
    globalThis.fetch=async()=>new Response(JSON.stringify({success:true,hostname:'siankaiss-web.pages.dev',action:'line_click'}),{status:200});
    const yes=await asJson(await click({request:mkReq('/api/traffic-check','POST',{placement:'hero',turnstileToken:'good'}),env}));
    assert.equal(yes.status,200);assert.equal(yes.body.verified,true);
    globalThis.fetch=async()=>new Response(JSON.stringify({success:true,hostname:'wrong.example',action:'line_click'}),{status:200});
    const no=await asJson(await click({request:mkReq('/api/traffic-check','POST',{placement:'hero',turnstileToken:'bad'}),env}));
    assert.equal(no.status,403);
    const report=await asJson(await stats({request:mkReq('/api/traffic-stats?days=7','GET',null,{headers:{'X-Admin-Token':env.SIANKAI_ADMIN_TOKEN}}),env}));
    assert.equal(report.body.totals.verifiedClicks,1);assert.equal(report.body.totals.rejectedChallenges,1);
  }finally{globalThis.fetch=origFetch}
});

test('Missing D1 reports setup required, but does not block normal LINE click',async()=>{
  const env={SIANKAI_ADMIN_TOKEN:'test_token_0123456789'};
  const report=await asJson(await stats({request:mkReq('/api/traffic-stats','GET',null,{headers:{'X-Admin-Token':env.SIANKAI_ADMIN_TOKEN}}),env}));
  assert.equal(report.status,503);
  const result=await asJson(await click({request:mkReq('/api/traffic-check','POST',{placement:'hero'}),env}));
  assert.equal(result.status,200);assert.equal(result.body.analyticsRecorded,false);
});
