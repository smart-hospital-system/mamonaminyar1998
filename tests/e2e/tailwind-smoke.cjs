// Run only on a synthetic deployment. Checks generated CSS, not merely class strings.
const {chromium}=require('playwright-core'),packaged=require('@sparticuz/chromium');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const base=process.env.ASH_E2E_URL||'http://127.0.0.1:8000',out=process.env.ASH_E2E_OUTPUT||'.cache/tailwind-browser';
 if(!process.env.ASH_E2E_USERNAME||!process.env.ASH_E2E_PASSWORD)throw new Error('Set credentials for a TEST-only deployment.');
 const browser=await chromium.launch({executablePath:await packaged.executablePath(),args:packaged.args.filter(a=>!['--disable-web-security','--allow-running-insecure-content'].includes(a))});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(base).origin){external.push(route.request().url());return route.abort();}return route.continue();});
  await page.goto(base);await page.locator('[name=username]').fill(process.env.ASH_E2E_USERNAME);await page.locator('[name=password]').fill(process.env.ASH_E2E_PASSWORD);await page.locator('#login-form [type=submit]').click();await page.locator('[data-tailwind-dashboard]').waitFor();
  const columns=()=>page.locator('[data-dashboard-stats]').evaluate(el=>({display:getComputedStyle(el).display,columns:getComputedStyle(el).gridTemplateColumns.split(' ').length}));
  assert.deepEqual(await columns(),{display:'grid',columns:4});
  assert.equal(await page.locator('[data-dashboard-hero]').evaluate(el=>getComputedStyle(el).borderRadius),'16px');
  fs.mkdirSync(out,{recursive:true});await page.screenshot({path:out+'/tailwind-desktop.png',fullPage:true});
  const task=page.locator('[data-tailwind-dashboard] [data-action=workspace-task-state]').first();
  if(await task.count()){const id=await task.getAttribute('data-id');await task.click();await page.waitForFunction(id=>!document.querySelector(`[data-tailwind-dashboard] [data-action=workspace-task-state][data-id="${id}"]`),id);}
  await page.locator('.nav-link[data-page=appearance]').click();await page.locator('[name=theme][value=midnight]').check();await page.locator('#workspace-preferences [type=submit]').click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='midnight');await page.locator('.nav-link[data-page=dashboard]').click();await page.locator('[data-dashboard-hero]').waitFor();
  assert.equal(await page.locator('[data-dashboard-hero]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(35, 59, 67)');
  await page.screenshot({path:out+'/tailwind-night.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.deepEqual(await columns(),{display:'grid',columns:1});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/tailwind-mobile.png',fullPage:true});
  await page.locator('[data-action=menu]').click();await page.locator('.nav-link[data-page=departments]').click();await page.locator('[data-department-card]').first().waitFor();assert.equal(await page.locator('[data-department-card]').count(),5);assert.equal(await page.locator('[data-department-grid]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('[data-action=menu]').click();await page.locator('.nav-link[data-page=appearance]').click();await page.locator('[name=theme][value=sage]').check();await page.locator('#workspace-preferences [type=submit]').click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='sage');
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);console.log('PASS Tailwind: real 4/1-column layouts, radius, live dark theme, task action, department mobile layout, no overflow, no external/CDN requests or JS errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
