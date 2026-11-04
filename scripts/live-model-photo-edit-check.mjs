// Canonical runner subcase: existing listing, no save/publish, cached provider outputs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
export async function checkExistingListing({context,folder,extensionId,options}){
 assert(options.newTab === true, 'Use an owned test tab so unsaved changes can always be discarded.');
 const page=context.pages()[options.page];
 assert(/\/items\/\d+\/edit$/.test(new URL(page.url()).pathname));
 if(options.collect){
  const urls=await page.locator('[data-testid="media-select-grid"] img,[data-testid="media-upload-grid"] img').evaluateAll(es=>es.map(e=>e.currentSrc||e.src));
  for(let i=0;i<urls.length;i++){const response=await fetch(urls[i]);assert(response.ok);writeFileSync(join(folder,`edit-source-${i}.webp`),Buffer.from(await response.arrayBuffer()));}
  writeFileSync(join(folder,'edit-source-urls.json'),JSON.stringify(urls,null,2));return {collected:true,count:urls.length};
 }
 const wake=await context.newPage();await wake.goto(`chrome-extension://${extensionId}/popup.html`);await wake.evaluate(()=>chrome.runtime.reload()).catch(()=>{});await new Promise(r=>setTimeout(r,1000));await wake.close().catch(()=>{});
 const worker=context.serviceWorkers().find(w=>w.url().startsWith(`chrome-extension://${extensionId}/`)) || await context.waitForEvent('serviceworker',{timeout:15000});
 await worker.evaluate(()=>{
  globalThis.__qaOriginalModelFetch=globalThis.fetch;
  globalThis.fetch=(url,options)=>{
   const pathname=new URL(url instanceof Request?url.url:String(url),'https://autolister.app').pathname;
   if(['/api/generate','/api/listing-model-photos'].includes(pathname))throw new Error('Paid production generation is blocked in this attachment-only check');
   if(String(url).includes('/api/user/model'))return Promise.resolve(new Response(JSON.stringify({enabled:true,listingPhotosAvailable:true,invitationState:'dismissed',model:{state:'ready',imageUrl:chrome.runtime.getURL('images/user-model-female.webp')}}),{status:200,headers:{'Content-Type':'application/json'}}));
   return globalThis.__qaOriginalModelFetch(url,options);
  };
 });
 await page.reload({waitUntil:'domcontentloaded'});
 const grid='[data-testid="media-select-grid"], [data-testid="media-upload-grid"]';
 const img=grid.split(',').map(s=>s.trim()+' img').join(',');
 const state=async()=>({title:await page.locator('[data-testid="title--input"]').inputValue(),description:await page.locator('[data-testid="description--input"],textarea[name="description"]').first().inputValue(),photos:await page.locator(img).evaluateAll(es=>es.map(e=>e.currentSrc||e.src))});
 await page.locator('[data-testid="title--input"]').waitFor();
 const before=await state();writeFileSync(join(folder,'edit-before.json'),JSON.stringify(before,null,2));
 await page.setViewportSize({width:1366,height:1050});await page.screenshot({path:join(folder,'edit-before.png'),fullPage:true});
 await page.locator('#quickvint-gen-btn').waitFor({timeout:30000});
 const cdp=await context.newCDPSession(page);const worlds=[];let world;cdp.on('Runtime.executionContextCreated',({context:c})=>worlds.push(c));await cdp.send('Runtime.enable');
 for(const candidate of worlds.filter(c=>c.origin===`chrome-extension://${extensionId}`)){
  const probe=await cdp.send('Runtime.evaluate',{contextId:candidate.id,expression:'typeof chrome.runtime?.sendMessage',returnByValue:true});if(probe.result?.value==='function'){world=candidate;break;}
 }
 assert(world,'Extension world required');
 const evaluate=async expression=>{const r=await cdp.send('Runtime.evaluate',{contextId:world.id,expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const result={realVinted:true,path:new URL(page.url()).pathname,cachedProviderResults:true,providerCalls:0,saveOrPublishClicks:0,textRequests:0,mutationRequests:[],uploadResponses:[],before};
 await page.route(/\/api\/v2\/items(?:\/|\?|$)/,route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
 page.on('request',r=>{const path=new URL(r.url()).pathname;if(r.method()!=='GET'&&/\/api\//.test(path))result.mutationRequests.push({method:r.method(),path});});
 page.on('response',r=>{const path=new URL(r.url()).pathname;if(r.request().method()==='POST'&&path==='/api/v2/photos')result.uploadResponses.push({path,status:r.status()});});
 await page.evaluate(()=>document.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();},true));
 const photos=['primary','secondary'].map(slot=>({slot,url:'data:image/jpeg;base64,'+readFileSync(options[slot]).toString('base64')}));
 await evaluate(`(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);const state={jobId:'22222222-3333-4444-8555-666666666666',status:'ready',eligible:true,photos:${JSON.stringify(photos)}};const model={enabled:true,listingPhotosAvailable:true,invitationState:'dismissed',model:{state:'ready',imageUrl:chrome.runtime.getURL('images/user-model-female.webp')}};globalThis.__editQaCalls=[];globalThis.__editQaTelemetry=[];if(globalThis.AutoListerTelemetry)AutoListerTelemetry.track=(event,context)=>{__editQaTelemetry.push({event,context});return Promise.resolve();};chrome.runtime.sendMessage=(m,...args)=>{if(m.type==='LISTING_PHOTO_REQUEST'){__editQaCalls.push({type:m.type,action:m.action,method:m.method,sources:m.sources});const response={ok:true,data:state};const callback=args.find(a=>typeof a==='function');if(callback)queueMicrotask(()=>callback(response));return Promise.resolve(response);}if(m.type==='USER_MODEL_REQUEST'){if(m.method==='PATCH')model.enabled=m.body.enabled;const response={ok:true,data:model};const callback=args.find(a=>typeof a==='function');if(callback)queueMicrotask(()=>callback(response));return Promise.resolve(response);}return send(m,...args);};return true;})()`);
 try{
  await page.locator('#quickvint-model-btn').waitFor();
  await page.waitForTimeout(1000);assert.equal(await page.locator(img).count(),before.photos.length,'Opening edit must not add photos');
  await page.locator('#quickvint-model-btn').click();
  const add=page.locator('[data-add-model-photos]');await add.waitFor();
  await page.screenshot({path:join(folder,'edit-model-action.png')});
  const started=Date.now();await add.click();
  const preview=page.locator('.mp-preview-dialog');await preview.waitFor();
  assert.equal((await state()).photos.length,before.photos.length,'Preview must not upload before confirmation');
  result.previewRequiredConfirmation=true;
  result.previewButtonFontSizes=await preview.locator('.mp-preview-actions button').evaluateAll(es=>es.map(e=>getComputedStyle(e).fontSize));
  assert.deepEqual(result.previewButtonFontSizes,['14px','14px']);
  await page.screenshot({path:join(folder,'edit-preview-desktop.png')});
  await page.setViewportSize({width:390,height:844});
  result.mobilePreviewBounds=await preview.boundingBox();
  const clientWidth=await page.evaluate(()=>document.documentElement.clientWidth);
  assert(result.mobilePreviewBounds.x>=8&&result.mobilePreviewBounds.x+result.mobilePreviewBounds.width<=clientWidth-8);
  await page.screenshot({path:join(folder,'edit-preview-mobile.png')});
  await page.setViewportSize({width:1366,height:1050});
  await preview.locator('.mp-preview-actions .um-primary').click();
  await page.waitForFunction(count=>globalThis.document.querySelectorAll('[data-testid="media-select-grid"] img,[data-testid="media-upload-grid"] img').length===count,before.photos.length+2,{timeout:60000});
  let status;const deadline=Date.now()+60000;
  while(Date.now()<deadline){status=await evaluate("globalThis.__editQaCalls.findLast(c=>['attached','order_failed','attachment_failed','cancelled','capacity'].includes(c.action))?.action");if(['attached','order_failed','attachment_failed','cancelled','capacity'].includes(status))break;await page.waitForTimeout(250);}
  result.elapsedMs=Date.now()-started;result.status=status;assert.equal(status,'attached');
  result.after=await state();assert.equal(result.after.title,before.title);assert.equal(result.after.description,before.description);assert.deepEqual(result.after.photos.slice(2),before.photos);
  result.calls=await evaluate('globalThis.__editQaCalls');assert.equal(result.calls.filter(c=>c.action==='create').length,1);
  result.controlledTelemetry=await evaluate('globalThis.__editQaTelemetry');result.contentTelemetryIsolated=true;
  for(const event of ['model_photos_uploaded','model_photos_attached'])assert.equal(result.controlledTelemetry.filter(e=>e.event===event).length,1);
  assert.equal(result.calls.find(c=>c.action==='create').sources.length,before.photos.length);
  await page.screenshot({path:join(folder,'edit-after.png'),fullPage:true});
  // Trigger a genuine host rerender without adding or removing an original.
  const title=page.locator('[data-testid="title--input"]');await title.fill(before.title+' ');await title.fill(before.title);await title.blur();await page.waitForTimeout(700);
  assert.deepEqual((await state()),result.after);result.rerenderVerified=true;
  assert(!result.mutationRequests.some(r=>/\/items(?:\/|$)/.test(r.path)),'Existing listing mutation must never be sent');
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-testid="title--input"]').waitFor();
  await page.waitForFunction(count=>document.querySelectorAll('[data-testid="media-select-grid"] img,[data-testid="media-upload-grid"] img').length===count,before.photos.length,{timeout:30000});
  result.afterDiscard=await state();assert.deepEqual(result.afterDiscard,before);result.publishedListingUnchanged=true;
  result.ok=true;
 }finally{result.calls=await evaluate('globalThis.__editQaCalls').catch(()=>result.calls||[]);writeFileSync(join(folder,'edit-result.json'),JSON.stringify(result,null,2));await cdp.detach();await worker.evaluate(()=>{if(globalThis.__qaOriginalModelFetch){globalThis.fetch=globalThis.__qaOriginalModelFetch;delete globalThis.__qaOriginalModelFetch;}}).catch(()=>{});}
 return result;
}
