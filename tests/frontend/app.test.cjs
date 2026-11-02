// DOM-level checks with simulated API responses, not real-browser print tests.
const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('frontend/index.html','utf8');
const source=fs.readFileSync('frontend/app.js','utf8');
const fixtures={hospital:{name:'شفاخانهٔ آزمایشی',english_name:'TEST HOSPITAL',services:'test',phone:'test',address:'test address',email:'',website:'',template_id:1},
 templates:Array.from({length:200},(_,i)=>({id:i+1,name:`طرح ${i+1}`,collection:`group-${Math.floor(i/20)}`,collection_name:`مجموعه ${Math.floor(i/20)+1}`,slug:'classic',color:'#147d78',header:['center','split','rail','band'][i%4],border:'solid',table:'grid',footer:'columns',density:'normal'})),
 stats:{patients:1,prescriptions:1,medicines:0,low_stock:0,lab:0,radiology:0,occupied_beds:0}};
const person={id:1,mrn:'ASH-0000001',first_name:'مریض آزمایشی',last_name:'نمونه',father_name:'',age:30,sex:'female',weight_kg:60,allergies:'',phone:'',history:''};
let windows=[];
afterEach(()=>{for(const w of windows)w.close();windows=[];});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function app(role='admin',workspace=false,professional=false){
 const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;windows.push(w);const requests=[];let prefs={theme:'sage',density:'comfortable',font_size:'normal',favorites:[]};let tasks=[];
 w.scrollTo=()=>{};w.confirm=()=>true;w.print=()=>{};
 w.fetch=async(url,options={})=>{
  requests.push({url,options});const path=url.split('?')[0];let data;
  if(path==='/api/auth/me')data={user:{id:1,name:'کارمند آزمایشی',role,username:'test'},csrf:'test-csrf'};
  else if(path==='/api/hospital')data=options.body?JSON.parse(options.body):fixtures.hospital;
  else if(path==='/api/templates')data=fixtures.templates;
  else if(path==='/api/dashboard')data=fixtures.stats;
  else if(path==='/api/professional/session')data={demo:false};
  else if(path==='/api/professional/health-summary')data={status:'warning',issues:1,critical:0,checked_at:1000};
  else if(path==='/api/professional/departments')data={opd:{registered_patients:1,drafts:0},pharmacy:{items:0,low_stock:0},lab:{pending:0,completed:0},radiology:{pending:0,completed:0},inpatient:{occupied:0,capacity:10}};
  else if(path==='/api/professional/studio')data=options.body?{...JSON.parse(options.body),revision:2}:{revision:1,enabled:true,profiles:Array.from({length:10},(_,i)=>({id:i+1,title:'Family '+i,primary:'#123456',wash:'#ffffff',logo:'cross',heading:'Document',footer_note:'TEST ONLY',compact:false}))};
  else if(path==='/api/professional/health'||path==='/api/professional/health/check')data={status:'warning',checked_at:1000,checks:[{name:'database',status:'ok'}],alerts:[],policy:'TEST NO REPAIR'};
  else if(path==='/api/workspace/preferences'){if(options.body)prefs=JSON.parse(options.body);data=prefs;}
  else if(path==='/api/workspace/overview')data={day:'2026-10-30',tasks_open:tasks.length,tasks_overdue:0,notes_today:0,appointments_today:0,trend:[]};
  else if(path==='/api/workspace/tasks'){if(options.body){tasks.push({...JSON.parse(options.body),id:tasks.length+1,done:false,revision:1});data={id:tasks.length};}else data={items:tasks,total:tasks.length};}
  else if(path==='/api/workspace/appointments')data={items:[],total:0};
  else if(path==='/api/workspace/clinicians')data=[{id:1,name:'TEST DOCTOR'}];
  else if(path==='/api/patients')data=options.method==='POST'?person:[person];
  else if(path==='/api/prescriptions')data=[];
  else if(path==='/api/auth/logout')data={ok:true};
  else if(path==='/api/knowledge/symptoms')data={matches:[{label:'سردرد'}]};
  else data=[];
  return {ok:true,status:200,json:async()=>data,blob:async()=>new w.Blob(['test'])};
 };
 vm.runInContext(fs.readFileSync('frontend/dashboard.js','utf8'),dom.getInternalVMContext());
 if(workspace)vm.runInContext(fs.readFileSync('frontend/workspace.js','utf8'),dom.getInternalVMContext());
 if(professional)vm.runInContext(fs.readFileSync('frontend/professional.js','utf8'),dom.getInternalVMContext());
 vm.runInContext(source+'\nwindow.testAPI={S,navigate,printSheet,rxModal,preview,resetLogin,readRx,esc};',dom.getInternalVMContext());
 for(let i=0;i<6;i++)await settle();
 return {w,api:w.testAPI,requests};
}
test('login page has no default credentials or session localStorage',async()=>{
 const {w,api}=await app();api.resetLogin();assert.ok(w.document.querySelector('#login-form'));
 assert.equal(w.document.querySelector('[name=password]').value,'');assert.equal(w.localStorage.length,0);
 assert.equal(w.document.querySelector('.workspace'),null);
});
test('dashboard displays supplied real counts and role-filtered links',async()=>{
 const {w}=await app('lab');assert.ok(w.document.querySelector('[data-page=lab]'));
 assert.equal(w.document.querySelector('[data-page=users]'),null);
 assert.equal(w.document.querySelector('[data-page=patients]'),null);
 assert.ok(w.document.querySelector('.stats').textContent.includes('مریضان ثبت‌شده'));
});
test('all two hundred templates are selectable and admin selection persists via CSRF',async()=>{
 const {w,api,requests}=await app();await api.navigate('templates');
 assert.equal(w.document.querySelectorAll('.template-card').length,200);
 w.document.querySelector('[data-action=template-select][data-id="200"]').click();
 for(let i=0;i<4;i++)await settle();
 const request=requests.find(r=>r.url==='/api/hospital'&&r.options.method==='PUT');
 assert.ok(request);assert.equal(JSON.parse(request.options.body).template_id,200);
 assert.equal(request.options.headers['X-CSRF-Token'],'test-csrf');
});
test('patient names and user input are escaped rather than interpreted as HTML',async()=>{
 const {w,api}=await app();await api.navigate('patients');api.S.patients[0]={...person,first_name:'<img src=x onerror=alert(1)>'};
 // Render via the same preview renderer and inspect the resulting DOM.
 const rx={id:1,patient:api.S.patients[0],doctor:'<script>bad()</script>',created:1,status:'draft',complaint:'<svg onload=alert(1)>',diagnosis:'test',notes:'',items:[]};
 const node=w.document.createElement('div');node.innerHTML=api.printSheet(rx,1);
 assert.equal(node.querySelector('img'),null);assert.equal(node.querySelector('script'),null);assert.equal(node.querySelector('svg'),null);
 assert.ok(node.textContent.includes('<img src=x'));
});
test('new prescription has no forced drug, dose, serum or injection',async()=>{
 const {w,api}=await app('doctor');await api.rxModal(1);
 assert.equal(w.document.querySelectorAll('.rx-item').length,0);
 assert.deepEqual(JSON.parse(JSON.stringify(api.readRx().items)),[]);
 w.document.querySelector('[data-action=rx-add]').click();await settle();
 assert.equal(w.document.querySelector('[name=dose]').value,'');
 assert.equal(w.document.querySelector('[name=form]').value,'');
});
test('all print layouts preserve clinical data and draft watermark',async()=>{
 const {api}=await app('doctor');
 const rx={id:5,patient:person,doctor:'داکتر آزمایشی',created:1,status:'draft',complaint:'TEST COMPLAINT',diagnosis:'TEST DIAGNOSIS',notes:'TEST NOTES',items:[{name:'TEST MEDICINE',form:'TEST FORM',dose:'MANUAL DOSE',frequency:'MANUAL FREQUENCY',duration:'MANUAL DURATION',quantity:1,instructions:'MANUAL INSTRUCTIONS'}]};
 for(let id=1;id<=20;id++){
  const content=api.printSheet(rx,id);
  for(const value of ['TEST MEDICINE','MANUAL DOSE','TEST COMPLAINT','TEST NOTES','ASH-0000001','پیش‌نویس'])assert.ok(content.includes(value));
 }
});
test('confirmed print uses archived hospital information, not current settings',async()=>{
 const {api}=await app('doctor');const rx={id:1,patient:person,hospital:{...fixtures.hospital,name:'ARCHIVED HOSPITAL'},doctor:'test',created:1,status:'confirmed',complaint:'test',diagnosis:'test',notes:'',items:[]};
 const content=api.printSheet(rx,1);assert.ok(content.includes('ARCHIVED HOSPITAL'));assert.ok(!content.includes('شفاخانهٔ آزمایشی'));
});
test('logout clears visible patient data and prepared print content',async()=>{
 const {w,api}=await app();await api.navigate('patients');w.document.querySelector('#print-root').textContent='SENSITIVE TEST';
 w.document.querySelector('[data-action=logout]').click();for(let i=0;i<4;i++)await settle();
 assert.ok(w.document.querySelector('#login-form'));assert.equal(w.document.querySelector('#print-root').textContent,'');
 assert.equal(api.S.patients.length,0);assert.equal(api.S.csrf,'');
});

test('workspace dashboard uses operational counts and role-filtered new navigation',async()=>{
 const {w}=await app('lab',true);
 assert.ok(w.document.querySelector('[data-dashboard-hero]'));
 assert.ok(w.document.querySelector('[data-page=tasks]'));
 assert.ok(w.document.querySelector('[data-page=appearance]'));
 assert.equal(w.document.querySelector('[data-page=appointments]'),null);
 assert.equal(w.document.querySelector('[data-page=smart]'),null);
 assert.ok(w.document.querySelector('[data-dashboard-stats]').textContent.includes('کارهای باز من'));
});
test('200-layout studio paginates, filters collections and persists ID 200',async()=>{
 const {w,api,requests}=await app('admin',true);await api.navigate('templates');
 assert.equal(w.document.querySelectorAll('.template-tile').length,40);
 const select=w.document.querySelector('#template-collection');select.value='group-9';select.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(w.document.querySelectorAll('.template-tile').length,20);
 w.document.querySelector('[data-action=template-select][data-id="200"]').click();for(let i=0;i<5;i++)await settle();
 assert.equal(w.document.querySelectorAll('.template-tile').length,20);
 assert.ok(w.document.querySelector('[data-action=template-select][data-id="200"]').closest('.template-tile').classList.contains('selected'));
 assert.ok(requests.some(r=>r.url==='/api/hospital'&&r.options.method==='PUT'&&JSON.parse(r.options.body).template_id===200));
});
test('favorites are per-user server preferences and filtering never truncates IDs',async()=>{
 const {w,api,requests}=await app('doctor',true);await api.navigate('templates');
 w.document.querySelector('[data-action=workspace-favorite][data-id="2"]').click();for(let i=0;i<5;i++)await settle();
 const saved=requests.find(r=>r.url==='/api/workspace/preferences'&&r.options.method==='PUT');
 assert.deepEqual(JSON.parse(saved.options.body).favorites,[2]);
 w.document.querySelector('[data-action=workspace-favorites-filter]').click();await settle();
 assert.equal(w.document.querySelectorAll('.template-tile').length,1);
});
test('personal theme is persisted but print colors and archived design remain independent',async()=>{
 const {w,api}=await app('doctor',true);await api.navigate('appearance');
 w.document.querySelector('[name=theme][value=midnight]').checked=true;
 w.document.querySelector('#workspace-preferences').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 for(let i=0;i<5;i++)await settle();assert.equal(w.document.documentElement.dataset.theme,'midnight');
 const rx={id:1,template_id:200,template_config:{...fixtures.templates[199],name:'ARCHIVED DESIGN',color:'#123456',ornament:'ribbon',typography:'serif'},patient:person,doctor:'TEST',created:1,status:'confirmed',complaint:'TEST',diagnosis:'TEST',notes:'',items:[]};
 const markup=api.printSheet(rx,200);assert.ok(markup.includes('ARCHIVED DESIGN'));assert.ok(markup.includes('ornament-ribbon'));assert.ok(markup.includes('--accent:#123456'));
 api.resetLogin();assert.equal(w.document.documentElement.dataset.theme,'sage');assert.equal(w.document.querySelector('.workspace'),null);
});
test('task form sends a real API mutation with CSRF and no local storage',async()=>{
 const {w,api,requests}=await app('lab',true);await api.navigate('tasks');
 w.document.querySelector('[data-action=workspace-task-new]').click();await settle();
 const f=w.document.querySelector('#workspace-task-form');f.querySelector('[name=title]').value='<img src=x onerror=alert(1)>';
 f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));for(let i=0;i<8;i++)await settle();
 const r=requests.find(r=>r.url==='/api/workspace/tasks'&&r.options.method==='POST');assert.ok(r);assert.equal(r.options.headers['X-CSRF-Token'],'test-csrf');assert.equal(JSON.parse(r.options.body).due_at,null);
 assert.equal(w.document.querySelector('.work-task img'),null);assert.ok(w.document.querySelector('.work-task').textContent.includes('<img src=x'));assert.equal(w.localStorage.length,0);
});
test('command palette searches authorized sections, not patient content',async()=>{
 const {w}=await app('reception',true);w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));await settle();
 assert.ok(w.document.querySelector('#workspace-command-query'));assert.equal(w.document.querySelector('.command-item[data-page=users]'),null);
 const q=w.document.querySelector('#workspace-command-query');q.value='نوبت';q.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.document.querySelectorAll('.command-item').length,1);
});
test('appointment form encodes Kabul wall time explicitly and stores half-hour timestamps',async()=>{
 const {w,api,requests}=await app('reception',true);await api.navigate('appointments');w.document.querySelector('[data-action=workspace-appointment-new]').click();for(let i=0;i<5;i++)await settle();
 const f=w.document.querySelector('#workspace-appointment-form');f.querySelector('[name=patient_id]').value='1';f.querySelector('[name=doctor_id]').value='1';f.querySelector('[name=starts_at]').value='2026-10-30T10:30';f.querySelector('[name=reason]').value='TEST ONLY';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));for(let i=0;i<8;i++)await settle();
 const request=requests.find(r=>r.url==='/api/workspace/appointments'&&r.options.method==='POST');assert.ok(request);const data=JSON.parse(request.options.body);assert.equal(data.starts_at,Date.parse('2026-10-30T10:30:00+04:30')/1000);assert.equal(data.starts_at%1800,0);
});

test('professional module registers five guided departments without fake completion',async()=>{
 const {w,api}=await app('admin',true,true);await api.navigate('departments');
 assert.equal(w.document.querySelectorAll('[data-department-card]').length,5);
 w.document.querySelector('[data-action=professional-next]').click();
 assert.equal(w.document.querySelector('[aria-current=step]').dataset.step,'1');
 assert.ok(w.document.querySelector('[data-department-wizard]').textContent.includes('به معنی انجام'));
});
test('professional editor contains all ten validated profile forms',async()=>{
 const {w,api}=await app('admin',true,true);await api.navigate('printstudio');
 assert.equal(w.document.querySelectorAll('[data-profile]').length,10);
 assert.equal(w.document.querySelectorAll('input[type=color]').length,20);
 assert.equal(w.document.querySelector('[data-profile="1"] input[name=title]').value,'Family 0');
});
test('health view does not silently enable audio; logout drops professional timers and state',async()=>{
 const {w,api}=await app('admin',true,true);await api.navigate('healthcare');
 assert.ok(w.document.querySelector('[data-action=professional-sound]').textContent.includes('فعال‌کردن'));
 api.resetLogin();assert.equal(w.document.querySelectorAll('.health-checks').length,0);
 assert.ok(w.document.querySelector('#login-form'));
});
test('personal appearance exposes all ten choices without changing clinical content',async()=>{
 const {w,api}=await app('admin',true,true);await api.navigate('appearance');
 assert.equal(w.document.querySelectorAll('[name=theme]').length,10);
 assert.equal(w.document.querySelector('[name=theme][value=copper]').type,'radio');
});

test('Tailwind dashboard uses escaped names, real values and accessible trend rows',async()=>{
 const {w,api}=await app('admin',true);
 api.S.user.name='<img src=x onerror=alert(1)>';
 const html=w.ASHTailwindDashboard.render({stats:fixtures.stats,overview:{appointments_today:3,notes_today:2,tasks_open:1,tasks_overdue:0,trend:[{day:'2026-10-31',patients:4,visits:2}]},tasks:[]});
 const box=w.document.createElement('div');box.innerHTML=html;
 assert.equal(box.querySelectorAll('img').length,0);
 assert.ok(box.querySelector('[data-dashboard-hero]').textContent.includes('<img'));
 assert.ok(box.querySelector('[data-dashboard-stats]').textContent.includes('۳'));
 assert.equal(box.querySelector('tbody tr').children[1].textContent,'۴');
 assert.ok(box.querySelector('[data-tailwind-dashboard]'));
 assert.ok(box.querySelector('[class*="tw:grid"]'));
});
test('local Tailwind stylesheet is loaded without Preflight or CDN',()=>{
 assert.ok(html.includes('/assets/tailwind.css'));
 const input=fs.readFileSync('frontend/tailwind.input.css','utf8');
 assert.ok(input.includes('tailwindcss/utilities.css'));
 assert.ok(!input.includes('@import "tailwindcss/preflight.css"'));
 assert.ok(!html.includes('cdn.tailwindcss'));
 const css=fs.readFileSync('frontend/tailwind.css','utf8');
 assert.ok(css.includes('tailwindcss v4.3.3'));
 assert.ok(css.includes('.tw\\:grid'));
});
