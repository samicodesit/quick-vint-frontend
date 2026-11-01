// Local visual exploration only. No provider calls or listing submissions.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

export async function previewPhotoActions({context,folder,extensionId,options}) {
 const {previewDirections}=await import(`./preview-model-directions.mjs?photoRun=${Date.now()}`);
 const root=join(folder,'photo-actions');mkdirSync(root,{recursive:true});
 if(options.reloadExtension){
  const reload=await context.newPage();await reload.goto(`chrome-extension://${extensionId}/popup.html`);
  await reload.evaluate(()=>chrome.runtime.reload()).catch(()=>{});
  await new Promise(resolve=>setTimeout(resolve,1000));await reload.close().catch(()=>{});
 }
 const emptyListing=await context.newPage();
 const fontRequests=[];
 emptyListing.on('requestfailed',r=>{if(/woff|font/i.test(r.url()))fontRequests.push({url:r.url(),error:r.failure()?.errorText});});
 emptyListing.on('response',r=>{if(/woff/i.test(r.url()))fontRequests.push({url:r.url(),status:r.status()});});
 await emptyListing.goto('https://www.vinted.nl/items/new',{waitUntil:'domcontentloaded'});
 await emptyListing.locator('.quickvint-tools').waitFor({timeout:30000});
 const previewOptions={...options,page:context.pages().indexOf(emptyListing)};
 try {
 for(const photoDirection of (options.onlyDirection?[options.onlyDirection]:['A','B','C'])) {
  const out=join(root,photoDirection);mkdirSync(out,{recursive:true});
  await previewDirections({context,folder:out,extensionId,options:{...previewOptions,photoDirection}});
 }
 }finally{writeFileSync(join(root,'font-requests.json'),JSON.stringify(fontRequests,null,2));await emptyListing.close();}
 const icons=Object.fromEntries(['image-plus','smartphone','monitor','chevron-down','wand-sparkles'].map(n=>[n,readFileSync(join(options.iconRoot,n+'.svg'),'utf8')]));
 const page=await context.newPage();
 try {
  await page.goto('https://autolister.app/welcome/en',{waitUntil:'networkidle'});
  await page.setViewportSize({width:1440,height:1100});
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:join(root,'welcome-before.png'),fullPage:true});
  await page.addStyleTag({content:`
   #photo-welcome{width:100%;max-width:896px;background:white;border:1px solid #dce0e8;border-radius:14px;padding:28px;margin:0 auto 28px;font-family:inherit;color:#283044;text-align:left}
   #photo-welcome .pw-location{margin:-12px 0 24px;font-size:13px;color:#647084}#photo-welcome b{font-weight:600;color:#283044}
   #photo-welcome *{box-sizing:border-box}#photo-welcome h2{font-size:22px;line-height:1.3;letter-spacing:-.4px;font-weight:650;margin:0 0 22px}#photo-welcome h3{font-size:16px;font-weight:600;margin:0 0 8px}#photo-welcome p{font-size:14px;line-height:1.55;color:#647084;margin:0 0 16px}
   #photo-welcome .pw-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:32px}#photo-welcome .pw-grid>div{display:flex;flex-direction:column}#photo-welcome .pw-example{margin-top:auto}#photo-welcome .pw-generate{border-left:1px solid #e8eaf0;padding-left:28px}
   #photo-welcome .pw-example{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#photo-welcome .pw-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;height:44px;border:1px solid #cbcfe0;background:#fafaff;border-radius:7px;padding:0 12px;font-size:13px;color:#283044;font-weight:500;line-height:1.4}
   #photo-welcome svg{width:16px;height:16px;stroke-width:2;flex:none}#photo-welcome .pw-primary{background:#5143df;border-color:#5143df;color:white;padding:0 22px;font-weight:600}#photo-welcome .pw-primary svg{width:18px;height:18px}
   #photo-welcome .pw-copy{display:flex;flex-direction:column;text-align:left}#photo-welcome small{font-size:12px;color:#647084;font-weight:400}#photo-welcome strong{font-weight:550;font-size:13px}#photo-welcome .pw-alt{margin:0 0 10px;font-size:13px;color:#647084}#photo-welcome .pw-button>.pw-copy+svg{margin-left:auto}
   @media(max-width:640px){#photo-welcome{padding:22px;margin-bottom:24px}#photo-welcome h2{font-size:22px}#photo-welcome .pw-grid{grid-template-columns:1fr;gap:24px}#photo-welcome .pw-generate{border-left:0;padding-left:0;border-top:1px solid #e8eaf0;padding-top:22px}#photo-welcome .pw-example{align-items:stretch;flex-direction:column}#photo-welcome .pw-button{justify-content:flex-start;width:100%}#photo-welcome .pw-primary{width:auto;align-self:flex-start}}
  `});
  for(const direction of (options.onlyDirection?[options.onlyDirection]:['A','B','C'])){
   await page.evaluate(({direction,icons})=>{
    document.querySelector('#photo-welcome')?.remove();
    const section=document.createElement('section');section.id='photo-welcome';
    const sources=direction!=='B'?`<span class="pw-button">${icons['image-plus']}<span class="pw-copy"><strong>Add photos</strong><small>Phone or computer</small></span>${icons['chevron-down']}</span>`:`<span class="pw-button">${icons.smartphone}Add from phone</span><span class="pw-button">${icons.monitor}Add from computer</span>`;
    section.innerHTML=`<h2>Your first listing</h2><p class="pw-location">On the Vinted listing page</p><div class="pw-grid"><div><h3>1. Add your item photos</h3><p>Click <b>Upload photos</b> in Vinted.</p><p class="pw-alt">Or use AutoLister’s photo tools:</p><div class="pw-example" role="img" aria-label="Example of AutoLister photo controls on Vinted">${sources}</div></div><div class="pw-generate"><h3>2. Create your listing</h3><p>Click <b>Generate</b> on Vinted, then review your title and description.</p><div class="pw-example" role="img" aria-label="Example of the Generate button on Vinted"><span class="pw-button pw-primary">${icons['wand-sparkles']}Generate</span></div></div></div>`;
    document.querySelector('.welcome-tips').before(section);
   },{direction,icons});
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1100});
    await page.locator('#photo-welcome').scrollIntoViewIfNeeded();
    await page.evaluate(()=>document.fonts.ready);
    const overflow=await page.locator('#photo-welcome').evaluate(e=>e.scrollWidth>e.clientWidth);
    if(overflow)throw new Error('Welcome section overflow');
    await page.screenshot({path:join(root,`welcome-${direction}-${width}-full.png`),fullPage:true});
    const clip=await page.locator('#photo-welcome').evaluate((e,w)=>{const r=e.getBoundingClientRect();return {x:w>640?r.left-24:0,y:r.top+scrollY-30,width:w>640?r.width+48:w,height:r.height+70};},width);
    await page.screenshot({path:join(root,`welcome-${direction}-${width}.png`),fullPage:true,clip});
   }
  }
 }finally{await page.close();}
 writeFileSync(join(root,'verification.json'),JSON.stringify({prototypeOnly:true,paidCalls:0,listingWrites:0,toolbarWidths:[1280,1440],welcomeWidths:[390,1440],directions:['A','B','C'],note:'Direction B proposes separate source entry points. Current product has one combined source button.'},null,2));
 return {photoActions:true,prototypeOnly:true,paidCalls:0};
}
