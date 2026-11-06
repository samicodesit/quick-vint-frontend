// Subcase of the canonical persistent runner. Real Vinted uploads, cached AI results.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export async function checkLiveModelPhotos({ context, openRealCreatePage, extensionId, outputFile }) {
 const folder=dirname(outputFile);
 const optionsFile=join(folder,'live-photo-options.json');
 const testOptions=existsSync(optionsFile)?JSON.parse(readFileSync(optionsFile,'utf8')):{};
 if(testOptions.task==='inspect'){
  const page=await openRealCreatePage();
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:join(folder,'progressive-before-desktop.png'),fullPage:true});
  const fields=await page.locator('input,textarea,button').evaluateAll(elements=>elements.map(el=>({tag:el.tagName,type:el.type,testId:el.dataset.testid,placeholder:el.getAttribute('placeholder'),label:el.getAttribute('aria-label'),text:el.tagName==='BUTTON'?el.textContent.trim().slice(0,80):undefined})));
  writeFileSync(join(folder,'progressive-fields.json'),JSON.stringify(fields,null,2));
  return {realVinted:true,providerCalls:0,saveOrPublishClicks:0,fields:fields.length};
 }
 if(testOptions.task==='listing-tour'){
  const {previewListingTour}=await import(`./preview-listing-tour.mjs?run=${Date.now()}`);
  return previewListingTour({context,folder,extensionId});
 }
 if(testOptions.task==='photo-actions'){
  const {previewPhotoActions}=await import(`./preview-photo-actions.mjs?run=${Date.now()}`);
  return previewPhotoActions({context,folder,extensionId,options:testOptions});
 }
 if(testOptions.task==='quality-sheet'){
  const view=await context.newPage();
  const font=readFileSync(testOptions.font).toString('base64');
  const cells=testOptions.images.map(({path,label})=>`<figure><figcaption>${label}</figcaption><img src="data:image/${path.endsWith('.webp')?'webp':'jpeg'};base64,${readFileSync(path).toString('base64')}"></figure>`).join('');
  const html=`<!doctype html><html><head><style>@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font})}*{box-sizing:border-box}body{margin:0;padding:24px;font:14px Geist,Arial,sans-serif;color:#263044;background:#fff}h1{font-size:20px;letter-spacing:-.3px;margin:0 0 6px}p{margin:0 0 20px;color:#657084}main{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}figure{margin:0}figcaption{font-weight:550;margin:0 0 10px}img{width:100%;height:410px;object-fit:contain;background:#f5f6f8;border-radius:6px}</style></head><body><h1>Garment QA: corrected dress sample</h1><p>Local tests. The automatic checker still needs work; this is not a release approval.</p><main>${cells}</main></body></html>`;
  await view.setViewportSize({width:1120,height:570});await view.setContent(html);await view.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});await view.screenshot({path:join(folder,'quality-sheet.png')});await view.close();return {qualitySheet:true,paidCalls:0};
 }
 if(testOptions.task==='design'){
  const {previewDirections}=await import(`./preview-model-directions.mjs?run=${Date.now()}`);
  return previewDirections({context,folder,extensionId,options:testOptions});
 }
 if(testOptions.task==='edit'){
  const {checkExistingListing}=await import(`./live-model-photo-edit-check.mjs?run=${Date.now()}`);
  if(testOptions.newTab){
   assert(/^https:\/\/www\.vinted\.nl\/items\/\d+\/edit$/.test(testOptions.url));
   const owned=await context.newPage();
   try{
    await owned.goto(testOptions.url,{waitUntil:'domcontentloaded'});
    await owned.waitForURL(/\/items\/\d+\/edit(?:\?|$)/,{timeout:30000}).catch(()=>{});
    if(!/\/items\/\d+\/edit$/.test(new URL(owned.url()).pathname))
      throw new Error('Existing-listing audit redirected to '+new URL(owned.url()).pathname);
    return await checkExistingListing({context,folder,extensionId,options:{...testOptions,page:context.pages().indexOf(owned)}});
   }finally{
    for(const worker of context.serviceWorkers())await worker.evaluate(()=>{if(globalThis.__qaOriginalModelFetch){globalThis.fetch=globalThis.__qaOriginalModelFetch;delete globalThis.__qaOriginalModelFetch;}}).catch(()=>{});
    await owned.close();
   }
  }
  return checkExistingListing({context,folder,extensionId,options:testOptions});
 }
 const originalCount=Math.min(5,Math.max(1,testOptions.originals||1));
 if(testOptions.files){
  for(const [key,name] of [['original','ORIGINAL'],['primary','PRIMARY'],['secondary','SECONDARY']]){
   if(testOptions.files[key])process.env['AUTOLISTER_MODEL_PHOTO_'+name]=testOptions.files[key];
  }
 }
 const primary=readFileSync(process.env.AUTOLISTER_MODEL_PHOTO_PRIMARY);
 const secondary=readFileSync(process.env.AUTOLISTER_MODEL_PHOTO_SECONDARY);
 const inspection=await context.newPage();
 await inspection.goto('chrome://extensions');
 writeFileSync(join(folder,'extension-controls.json'),JSON.stringify(await inspection.locator('cr-toggle, cr-icon-button, cr-button').evaluateAll(es=>es.map(e=>({tag:e.tagName,id:e.id,role:e.getAttribute('role'),label:e.getAttribute('aria-label'),labelledBy:e.getAttribute('aria-labelledby'),pressed:e.getAttribute('aria-pressed'),checked:e.getAttribute('aria-checked'),title:e.getAttribute('title'),visible:!!e.getClientRects().length}))),null,2));
 writeFileSync(join(folder,'extension-inspection.json'),JSON.stringify(await inspection.locator('extensions-item').evaluateAll(es=>es.map(e=>({id:e.id,text:e.shadowRoot?.textContent}))),null,2));
 await inspection.screenshot({path:join(folder,'extension-inspection.png')});
 if(await inspection.locator('#devMode').getAttribute('aria-pressed')==='false')await inspection.locator('#devMode').click();
 const enable=inspection.locator(`extensions-item[id="${extensionId}"] #enableToggle`);
 if(await enable.getAttribute('aria-pressed')==='false')await enable.click();
 await inspection.close();
 const reload=await context.newPage();
 await reload.goto(`chrome-extension://${extensionId}/popup.html`);
 const badgeState=await reload.evaluate(async()=>{const {supabaseSession}=await chrome.storage.local.get('supabaseSession');const key='modelToolbarSeen:'+supabaseSession.user.id;const value=(await chrome.storage.local.get(key))[key];await chrome.storage.local.remove(key);return {key,value};});
 await reload.evaluate(()=>chrome.runtime.reload()).catch(()=>{});
 await new Promise(resolve=>setTimeout(resolve,1000));
 await reload.close().catch(()=>{});
 const page=await openRealCreatePage();
 await page.setViewportSize({width:testOptions.width||1440,height:1100});
 const cdp=await context.newCDPSession(page);
 const worlds=[];
 cdp.on('Runtime.executionContextCreated',({context})=>worlds.push(context));
 await cdp.send('Runtime.enable');
 const world=worlds.find(w=>w.origin===`chrome-extension://${extensionId}`);
 if(!world)throw new Error('Extension isolated world unavailable.');
 const evaluate=async expression=>{
  const r=await cdp.send('Runtime.evaluate',{contextId:world.id,expression,awaitPromise:true,returnByValue:true});
  if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result.value;
 };
 const grid='[data-testid="media-upload-grid"], [data-testid="media-select-grid"]';
 const imageSelector=grid.split(',').map(s=>s.trim()+' img').join(',');
 const summary={realVinted:true,cachedProviderResults:true,providerCalls:0,uploads:[],saveOrPublishClicks:0,originalCount,sortingWidth:testOptions.width||1440};
 await page.addInitScript(()=>{document.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();},true);});
 // Defense in depth only. This test never clicks Save, Publish or native submit controls.
 await page.evaluate(()=>{document.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();},true);});
 const uploadRequests=new Map();
 page.on('request',req=>{if(req.method()==='POST'&&/photo|upload|media/i.test(new URL(req.url()).pathname))uploadRequests.set(req,Date.now());});
 page.on('response',res=>{const start=uploadRequests.get(res.request());if(start)summary.uploads.push({path:new URL(res.url()).pathname,status:res.status(),ms:Date.now()-start});});
 const images=()=>page.locator(imageSelector).evaluateAll(xs=>xs.map(i=>new URL(i.currentSrc||i.src).pathname));
 try{
  await page.locator('input[data-testid="add-photos-input"]').first().setInputFiles(Array.from({length:originalCount},()=>process.env.AUTOLISTER_MODEL_PHOTO_ORIGINAL));
  await page.waitForFunction(({selector,count})=>Array.from(document.querySelectorAll(selector)).filter(i=>i.complete&&i.naturalWidth&&i.src.startsWith('https:')).length===count,{selector:imageSelector,count:originalCount},{timeout:60000});
  const originals=await images();assert.equal(originals.length,originalCount);
  await page.screenshot({path:join(folder,'model-photos-before.png'),fullPage:true});
  const photos=[['primary',primary],['secondary',secondary]].map(([slot,bytes])=>({slot,url:'data:image/jpeg;base64,'+bytes.toString('base64')}));
  if(testOptions.progressive){
   const title=page.locator('input[data-testid="title--input"]');
   const description=page.locator('textarea[data-testid="description--input"]');
   await title.fill('Black dress with blue print');
   await description.fill('Long sleeves and a plain black back.');
   await evaluate(`(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);globalThis.__progressiveState={jobId:'11111111-2222-4333-8444-555555555555',status:'generating',eligible:true,photos:${JSON.stringify(photos.slice(0,1))}};globalThis.__progressiveActions=[];const model={enabled:true,listingPhotosAvailable:true,invitationState:'dismissed',model:{state:'ready',imageUrl:chrome.runtime.getURL('images/user-model-female.webp')}};chrome.runtime.sendMessage=(message,...rest)=>{if(message.type==='LISTING_PHOTO_REQUEST'){__progressiveActions.push(message.action||'get');if(message.action==='retry'){__progressiveState.status='generating';__progressiveState.canRetry=false;}return Promise.resolve({ok:true,data:__progressiveState});}if(message.type==='USER_MODEL_REQUEST')return Promise.resolve({ok:true,data:model});return send(message,...rest);};AutoListerModels.startContent();return true;})()`);
   await page.locator('#quickvint-model-toggle').waitFor();
   await title.focus();
   await evaluate(`(async()=>{const owner=(await chrome.storage.local.get('supabaseSession')).supabaseSession.user.id;const c=globalThis.__autolisterLivePhotoController();globalThis.__livePhotoController=c;void c.start({jobId:'11111111-2222-4333-8444-555555555555',status:'queued'},owner);return true;})()`);
   const panel=page.locator('.mp-preview-panel');
   await panel.locator('img').waitFor({timeout:15000});
   assert.equal(await panel.locator('img').count(),1);
   assert(await title.evaluate(el=>document.activeElement===el),'Arrival must not move focus');
   assert.equal(await page.locator('dialog[open]').count(),0);
   await title.press('End');await title.pressSequentially(' - edited');
   const savedTitle=await title.inputValue();
   const capture=async stage=>{
    for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
     await page.setViewportSize({width,height});await panel.scrollIntoViewIfNeeded();
     await page.screenshot({path:join(folder,`progressive-${stage}-${device}.png`),fullPage:true});
     await page.locator(grid).first().locator('..').screenshot({path:join(folder,`progressive-${stage}-${device}-detail.png`)});
    }
   };
   await capture('first');
   await panel.locator('.mp-preview-actions button').click();
   await page.waitForFunction(({selector,count})=>Array.from(document.querySelectorAll(selector)).filter(i=>i.complete&&i.naturalWidth&&i.src.startsWith('https:')).length===count,{selector:imageSelector,count:originalCount+1},{timeout:60000});
   const firstOrder=await images();
   const firstGenerated=firstOrder.find(key=>!originals.includes(key));
   assert(firstGenerated,'First photo must upload through Vinted');
   await evaluate(`__progressiveState.status='failed';__progressiveState.canRetry=true;true`);
   await panel.locator('.mp-retry').waitFor({timeout:10000});
   await capture('partial-failure');
   await panel.locator('.mp-retry').click();
   await evaluate(`__progressiveState.status='ready';__progressiveState.canRetry=false;__progressiveState.photos=${JSON.stringify(photos)};true`);
   await page.waitForFunction(()=>document.querySelectorAll('.mp-preview-panel img').length===2);
   await capture('ready');
   await page.setViewportSize({width:1440,height:1000});
   await panel.locator('.mp-preview-actions button').click();
   await page.waitForFunction(({selector,count})=>Array.from(document.querySelectorAll(selector)).filter(i=>i.complete&&i.naturalWidth&&i.src.startsWith('https:')).length===count,{selector:imageSelector,count:originalCount+2},{timeout:60000});
   await page.waitForFunction(()=>!document.querySelector('.mp-preview-panel:not([hidden])'));
   const order=await images();
   assert.equal(order.filter(key=>key===firstGenerated).length,1,'Retry must not duplicate the good photo');
   assert.deepEqual(order.filter(key=>originals.includes(key)),originals);
   assert.equal(await title.inputValue(),savedTitle);
   assert.equal(await description.inputValue(),'Long sleeves and a plain black back.');
   assert.equal((await evaluate('__progressiveActions')).filter(action=>action==='retry').length,1);
   for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
    await page.setViewportSize({width,height});await page.locator(grid).first().scrollIntoViewIfNeeded();
    await page.screenshot({path:join(folder,`progressive-complete-${device}.png`),fullPage:true});
   }
   await page.locator('input[data-testid="add-photos-input"]').first().setInputFiles(process.env.AUTOLISTER_MODEL_PHOTO_ORIGINAL);
   await page.waitForFunction(({selector,count})=>document.querySelectorAll(selector).length===count,{selector:imageSelector,count:originalCount+3},{timeout:60000});
   await page.waitForTimeout(800);
   assert.deepEqual((await images()).slice(0,originalCount+2),order);
   Object.assign(summary,{progressive:true,firstPhotoUsableBeforeSecond:true,partialFailureRecovered:true,retainedFirstPhoto:true,formEditsPreserved:true,noAutomaticModal:true,arrivalPreservedFocus:true,rerenderVerified:true,placedFirst:order.slice(0,2).every(key=>!originals.includes(key)),order});
   return summary;
  }
  await evaluate(`(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);const state={jobId:'11111111-2222-4333-8444-555555555555',status:'ready',eligible:true,photos:${JSON.stringify(photos)}};const model={enabled:true,listingPhotosAvailable:true,invitationState:'dismissed',model:{state:'ready',imageUrl:chrome.runtime.getURL('images/user-model-female.webp')}};chrome.runtime.sendMessage=(message,...rest)=>{if(message.type==='LISTING_PHOTO_REQUEST')return Promise.resolve({ok:true,data:state});if(message.type==='USER_MODEL_REQUEST'){if(message.method==='PATCH')model.enabled=message.body.enabled;return Promise.resolve({ok:true,data:model});}return send(message,...rest);};AutoListerModels.startContent();return true;})()`);
  summary.cachedModelSettings=true;
  await page.locator('#quickvint-model-toggle').waitFor({timeout:10000});
  const start=Date.now();
  await evaluate(`(async()=>{const owner=(await chrome.storage.local.get('supabaseSession')).supabaseSession.user.id;const controller=globalThis.__autolisterLivePhotoController();globalThis.__livePhotoController=controller;void controller.start({jobId:'11111111-2222-4333-8444-555555555555',status:'ready'},owner);return true;})()`);
  let status;
  await page.locator('.mp-preview-panel .mp-preview-actions button').click({timeout:15000});
  while(Date.now()-start<90000){
   status=await evaluate('globalThis.__livePhotoController.status');
   if(['attached','order_failed','attachment_failed','cancelled','capacity'].includes(status))break;
   await page.waitForTimeout(250);
  }
  summary.elapsedMs=Date.now()-start;summary.status=status;summary.order=await images();summary.originals=originals;
  await page.screenshot({path:join(folder,'model-photos-result.png'),fullPage:true});
  summary.photoDom=await page.locator(grid).first().evaluate(e=>e.outerHTML);
  writeFileSync(join(folder,'model-photos-diagnostic.json'),JSON.stringify(summary,null,2));
  assert.equal(status,'attached','Requested upload must succeed.');
  assert.equal(summary.order.length,originalCount+2);
  assert.deepEqual(summary.order.slice(2),originals);
  await page.setViewportSize({width:1440,height:1100});
  for(const id of ['title','description'])assert(await page.locator(`#quickvint-${id}-language-select`).isVisible(),`${id} language control must be visible`);
  await page.evaluate(()=>{window.scrollTo(0,0);return document.fonts.ready;});
  await page.screenshot({path:join(folder,'model-photos-desktop.png')});
  await page.screenshot({path:join(folder,'model-photos-desktop-detail.png'),clip:{x:408,y:120,width:610,height:970}});
  await page.setViewportSize({width:390,height:1000});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:join(folder,'model-photos-mobile.png'),fullPage:true});
  const mobileClip=await page.locator('[data-testid="description"]').evaluate(e=>{const title=document.querySelector('label[for="'+document.querySelector('[data-testid="title--input"]').id+'"]');const y=title.getBoundingClientRect().top+scrollY-55;return {x:0,y,width:390,height:e.getBoundingClientRect().bottom+scrollY-y+30};});
  await page.screenshot({path:join(folder,'model-photos-mobile-detail.png'),fullPage:true,clip:mobileClip});
  summary.toolbarOverflow=await page.locator('.quickvint-tools').evaluate(e=>e.scrollWidth>e.clientWidth);
  assert.equal(summary.toolbarOverflow,false);
  await page.setViewportSize({width:1440,height:1100});
  const toggle=page.locator('#quickvint-model-toggle');
  await toggle.click();await page.waitForFunction(()=>document.getElementById('quickvint-model-toggle')?.getAttribute('aria-checked')==='false');
  await toggle.click();await page.waitForFunction(()=>document.getElementById('quickvint-model-toggle')?.getAttribute('aria-checked')==='true');
  summary.inlineToggleVerified=true;
  // Adding another original forces a genuine host upload and photo-grid rerender.
  await page.locator('input[data-testid="add-photos-input"]').first().setInputFiles(process.env.AUTOLISTER_MODEL_PHOTO_ORIGINAL);
  await page.waitForFunction(({selector,count})=>document.querySelectorAll(selector).length===count,{selector:imageSelector,count:originalCount+3},{timeout:60000});
  await page.waitForTimeout(800);
  summary.afterRerender=await images();
  assert.deepEqual(summary.afterRerender.slice(0,originalCount+2),summary.order);
  summary.rerenderVerified=true;
  await page.screenshot({path:join(folder,'model-photos-rerender.png'),fullPage:true});
  delete summary.photoDom;
  return summary;
 } finally {
  await evaluate(`chrome.storage.local.${badgeState.value===undefined?'remove('+JSON.stringify(badgeState.key)+')':'set('+JSON.stringify({[badgeState.key]:badgeState.value})+')'}`).catch(()=>{});
  await cdp.detach();
 }
}
