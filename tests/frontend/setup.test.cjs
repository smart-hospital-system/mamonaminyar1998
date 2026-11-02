const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('installer/index.html','utf8');
const source=fs.readFileSync('installer/setup.js','utf8');
let windows=[];
afterEach(()=>{for(const w of windows)w.close();windows=[];});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function create({hash='#token=private-test-token',mode='online',activation='local',afterInstall='ready'}={}){
 const dom=new JSDOM(html,{url:'http://127.0.0.1:33333/'+hash,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;windows.push(w);const requests=[];let installed=false;
 w.fetch=async(url,options={})=>{
  requests.push({url,options});let answer;
  if(url==='/api/status')answer={phase:installed?afterInstall:'idle',message:'TEST MESSAGE',percent:installed?100:0,mode,activation_mode:activation,version:'0.2.0-setup',installation_id:'synthetic-id',default_target:'C:\\Apps\\ASHNexus',target:'C:\\Apps\\ASHNexus'};
  if(url==='/api/preflight')answer={ok:true,target:'C:\\Apps\\ASHNexus',checks:['TEST CHECK']};
  if(url==='/api/install'){installed=true;answer={ok:true};}
  if(url==='/api/launch')answer={ok:true};
  return {ok:true,json:async()=>answer};
 };
 w.eval(source+'\nwindow.setupTest={getData:()=>data,getStep:()=>step};');
 for(let i=0;i<3;i++)await tick();
 const click=async action=>{const btn=w.document.querySelector(`[data-action=${action}]`);assert.ok(btn,action);assert.equal(btn.disabled,false,`button ${action} should remain usable after render`);btn.click();for(let i=0;i<3;i++)await tick();};
 const fill=(name,value)=>{const input=w.document.querySelector(`[name="${name}"]`);assert.ok(input,name);input.value=value;};
 return {w,requests,click,fill};
}
test('wizard clears capability fragment and authenticates status without storing secrets',async()=>{
 const {w,requests}=await create();assert.equal(w.location.hash,'');assert.equal(w.localStorage.length,0);assert.equal(w.sessionStorage.length,0);
 assert.equal(requests[0].options.headers.Authorization,'Bearer private-test-token');
 assert.ok(w.document.querySelector('.shell'));assert.ok(!w.document.body.textContent.includes('private-test-token'));
});
test('missing local capability never calls setup API',async()=>{
 const {w,requests}=await create({hash:''});assert.equal(requests.length,0);assert.ok(w.document.body.textContent.includes('Setup.cmd'));
});
async function completeToReview(app){
 await app.click('next'); // location
 await app.click('next'); // hospital + preflight
 await app.click('next'); // admin
 app.fill('admin_name','مدیر آزمایشی');
 app.fill('password','synthetic-setup-password');app.fill('password_repeat','synthetic-setup-password');
 await app.click('next'); // activation
 app.w.document.querySelector('[name=consent]').checked=true;
 await app.click('next'); // review
}
test('local wizard progresses, preflights, submits once and clears password after install',async()=>{
 const app=await create();await completeToReview(app);
 assert.equal(app.w.setupTest.getStep(),5);assert.ok(!app.w.document.body.textContent.includes('synthetic-setup-password'));
 await app.click('next');
 assert.equal(app.w.setupTest.getStep(),7);assert.ok(app.w.document.body.textContent.includes('نصب و راه‌اندازی تکمیل شد'));
 const request=app.requests.find(r=>r.url==='/api/install');assert.ok(request);
 assert.equal(JSON.parse(request.options.body).password,'synthetic-setup-password');
 assert.equal(app.w.setupTest.getData().password,'');
 await app.click('launch');assert.ok(app.requests.some(r=>r.url==='/api/launch'));
});
test('signed activation requires an activation file instead of accepting a fixed demo serial',async()=>{
 const app=await create({mode:'offline',activation:'signed'});
 await app.click('next');await app.click('next');await app.click('next');
 app.fill('admin_name','TEST ADMIN');app.fill('password','synthetic-password-12');app.fill('password_repeat','synthetic-password-12');await app.click('next');
 app.w.document.querySelector('[name=consent]').checked=true;await app.click('next');
 assert.equal(app.w.setupTest.getStep(),4);assert.ok(app.w.document.querySelector('#message').textContent.includes('فایل فعال‌سازی'));
 assert.equal(app.requests.some(r=>r.url==='/api/install'),false);
});
test('failed activation permits editing credentials without pretending installation is ready',async()=>{
 const app=await create({afterInstall:'needs_activation'});await completeToReview(app);await app.click('next');
 assert.equal(app.w.setupTest.getStep(),6);assert.equal(app.w.document.querySelector('[data-action=launch]'),null);
 await app.click('retry');assert.equal(app.w.setupTest.getStep(),2);await app.click('next');
 assert.equal(app.w.document.querySelector('[name=password]').value,'');
});
