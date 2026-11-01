// Disposable design exploration. Does not invoke generation or submit host forms.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

export async function previewDirections({context,folder,extensionId,options}) {
 const page=context.pages()[options.page??9];
 if(!page?.url().endsWith('/items/new'))throw new Error('Use an existing create-form test tab.');
 const iconRoot=options.iconRoot;
 const icons=Object.fromEntries(['image-plus','settings-2','wand-sparkles','list','align-left','hash','smile','sticky-note','smartphone','monitor','chevron-down','ellipsis','chevron-right','message-square','x'].map(n=>[n,readFileSync(join(iconRoot,n+'.svg'),'utf8')]));
 await page.setViewportSize({width:1440,height:1100});
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:join(folder,'directions-before.png'),fullPage:true});
 await page.evaluate(({icons,extensionId,photoDirection})=>{
  document.querySelector('#al-exploration')?.remove();document.querySelector('#al-exploration-css')?.remove();
  const tools=document.querySelector('.quickvint-tools');if(!tools)throw new Error('Toolbar missing');
  tools.dataset.explorationPreviousStyle=tools.getAttribute('style')||'';tools.style.setProperty('display','none','important');
  const root=document.createElement('section');root.id='al-exploration';root.className='al-proto';tools.after(root);
  const css=document.createElement('style');css.id='al-exploration-css';css.textContent=`
   .al-proto,.al-proto *{box-sizing:border-box;font-family:"AutoLister Geist",Arial,sans-serif}
   .al-proto{--accent:#5143df;--ink:#283044;--muted:#647084;color:var(--ink);font-size:13px;line-height:1.4;margin:16px 0 28px;position:relative;z-index:4}
   .al-proto button{appearance:none;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;border-radius:7px;min-width:0;box-shadow:none}
   .al-proto button:focus-visible,.al-proto select:focus-visible,.al-proto textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
   .al-proto svg{height:16px;width:16px;stroke-width:2;flex:none}
   .al-proto .al-main svg{height:18px;width:18px}
   .al-proto .al-label{display:inline-flex;align-items:center;gap:7px}
   .al-proto .al-choice-icon{display:flex;align-items:center;gap:7px}
   .al-proto .al-row{display:flex;align-items:center;gap:10px}
   .al-proto .al-main{height:40px;padding:0 23px;background:var(--accent);color:#fff;font-weight:600;font-size:14px}
   .al-proto .al-quiet{height:36px;padding:0 10px;color:#505b6d}
   .al-proto .al-source{display:flex;gap:0;align-items:center;margin-left:auto}
   .al-proto .al-source button{height:36px;padding:0 11px}
   .al-proto .al-add .al-upload{height:40px;border:1px solid #cbcfe0;background:#fafaff;padding:0 12px;gap:10px}
   .al-proto .al-upload-copy{display:flex;flex-direction:column;text-align:left;gap:0;line-height:16px}
   .al-proto .al-upload-copy strong{font-size:13px;font-weight:550}
   .al-proto .al-upload-copy small{font-size:12px;color:#647084}
   .al-proto .al-explicit{gap:8px}
   .al-proto .al-explicit button{height:40px;padding:0 10px;border:1px solid #cbcfe0;background:#fafaff;font-size:13px}

   .al-proto .al-divider{height:16px;width:1px;background:#dde1e8}
   .al-proto .al-secondary{margin-top:10px;gap:12px}
   .al-proto.al-context .al-row{gap:8px}
   .al-proto.al-context .al-model,.al-proto.al-context .al-style{height:40px}
   .al-proto.al-context .al-model-open{height:38px}
   .al-proto.al-context .al-main{padding:0 16px}
   .al-proto.al-context .al-quiet{margin-left:auto;height:40px}
   .al-proto.al-context .al-new{font-size:11px}
   .al-proto.al-context .al-pop{top:48px;left:auto;right:0;max-width:100%}
   .al-proto.al-context .al-model-pop{left:0;right:auto}
   .al-proto .al-pop-title [data-close]{width:32px;height:32px;margin:-6px -6px -6px 0}
   .al-proto.al-context .al-switch{position:relative;width:36px;height:36px;padding:0;background:transparent;flex:none}
   .al-proto.al-context .al-switch:before{content:'';position:absolute;left:3px;top:9px;width:30px;height:18px;background:var(--accent);border-radius:12px}
   .al-proto.al-context .al-switch:after{position:absolute;left:17px;top:11px;width:14px;height:14px}
   .al-proto.al-context .al-switch[aria-checked=false]:before{background:#b8c0cd}
   .al-proto.al-context .al-switch[aria-checked=false]:after{left:5px}
   .al-proto button:hover{background-color:#f2f1fb}
   .al-proto .al-main:hover{background:#4435cb}
   .al-proto.al-context .al-switch:hover{background:transparent}
   @media(max-width:600px){
    .al-proto.al-context .al-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px}
    .al-proto.al-context .al-main{grid-column:1;grid-row:1;height:44px;padding:0 12px}
    .al-proto.al-context .al-style{grid-column:2;grid-row:1;justify-self:end;height:44px;padding:0 10px}
    .al-proto.al-context .al-quiet{grid-column:3;grid-row:1;height:44px;width:44px;padding:0}
    .al-proto.al-context .al-model{grid-column:1/-1;grid-row:2;height:48px;padding:0 6px 0 10px;gap:8px}
    .al-proto.al-context .al-model-open{height:44px;margin-right:auto}
    .al-proto.al-context .al-switch{width:44px;height:44px}
    .al-proto.al-context .al-switch:before{left:7px;top:13px}
    .al-proto.al-context .al-switch:after{left:21px;top:15px}
    .al-proto.al-context .al-switch[aria-checked=false]:after{left:9px}
    .al-proto.al-context .al-pop,.al-proto.al-context .al-model-pop{position:fixed;top:auto;left:16px;right:16px;bottom:16px;width:auto;max-width:none;max-height:calc(100dvh - 32px);overflow:auto}
    .al-proto.al-context dialog.al-pop{margin:0;color:var(--ink)}
    .al-proto.al-context dialog.al-pop::backdrop{background:rgba(28,34,49,.28)}
    .al-proto.al-context .al-pop-title [data-close]{width:44px;height:44px;margin:-12px -10px -12px 0}
    .al-proto.al-context .al-segment button{height:44px}
    .al-proto.al-context .al-checks label,.al-proto.al-context .al-setting label{min-height:44px}
    .al-proto.al-photo-source .al-upload{height:44px}
   }
   .al-proto.al-photo-source{position:absolute;margin:0;width:auto;z-index:4}
   .al-proto.al-photo-source .al-source{margin:0;justify-content:flex-end}
   .al-proto .al-model{display:flex;align-items:center;gap:9px;height:38px;padding:0 10px;border:1px solid #dce0e8;border-radius:8px;background:white}
   .al-proto .al-model-open{height:36px;font-weight:500}
   .al-proto .al-model-open img{width:24px;height:30px;object-fit:cover;object-position:center 30%;border-radius:4px;flex:none}
   .al-proto .al-model-open svg{width:12px;height:12px;color:#8991a0}
   .al-proto .al-new{background:#eeeafd;color:#5b48bf;font-size:10px;font-weight:600;padding:2px 5px;border-radius:4px;line-height:15px}
   .al-proto .al-switch{width:30px;height:18px;background:var(--accent);border-radius:12px;padding:2px;justify-content:flex-end}
   .al-proto .al-switch:after{content:'';width:14px;height:14px;border-radius:50%;background:white;box-shadow:0 1px 2px #0002}
   .al-proto .al-switch[aria-checked=false]{background:#b8c0cd;justify-content:flex-start}
   .al-proto .al-style{border:1px solid #dce0e8;height:38px;padding:0 12px;border-radius:8px;background:white}
   .al-proto .al-muted{color:var(--muted);font-size:12px}
   .al-proto .al-pop{position:absolute;top:100px;left:0;width:360px;border:1px solid #dce0e8;border-radius:10px;background:white;padding:18px;box-shadow:0 10px 30px #18213c16;z-index:100}
   .al-proto [hidden]{display:none!important}
   .al-proto .al-pop-title{font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
   .al-proto .al-setting{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0}
   .al-proto .al-segment{display:flex;padding:3px;background:#f2f3f6;border-radius:6px}
   .al-proto .al-segment button{height:28px;padding:0 12px;font-size:12px}
   .al-proto .al-segment button[aria-pressed=true]{background:white;box-shadow:0 1px 3px #15213d19;color:var(--accent);font-weight:500}
   .al-proto .al-checks{display:flex;align-items:center;gap:18px;padding-top:10px;margin-top:14px;border-top:1px solid #eceef2}
   .al-proto label{display:flex;align-items:center;gap:6px;font:inherit;color:inherit;cursor:pointer}
   .al-proto input[type=checkbox]{accent-color:var(--accent);width:14px;height:14px;margin:0}
   .al-proto textarea{width:100%;resize:vertical;min-height:66px;border:1px solid #dce0e8;border-radius:6px;padding:9px;margin-top:8px;font:inherit}
   .al-proto .al-model-pop img{width:104px;height:156px;object-fit:cover;border-radius:6px;display:block;margin:0 auto}
   .al-proto.al-side{position:absolute;width:240px;margin:0;padding:18px;background:#fff;border:1px solid #e0e3eb;border-radius:10px;box-shadow:0 4px 16px #18213c08}
   .al-side .al-brand{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:650;margin-bottom:16px}
   .al-side .al-main{width:100%;height:40px}
   .al-side .al-source{margin:6px 0 14px;justify-content:space-between}
   .al-side .al-source button{padding:0 7px;font-size:12px}
   .al-side .al-section{padding-top:15px;border-top:1px solid #e8eaf0;margin-top:14px}
   .al-side .al-section-title{font-size:12px;font-weight:600;color:#647084;margin-bottom:12px}
   .al-side .al-setting{margin:11px 0;font-size:12px}
   .al-side .al-segment button{padding:0 9px;height:27px}
   .al-side .al-compact-select{height:30px;border:1px solid #dde1e8;background:white;border-radius:6px;padding:0 7px;font:inherit;color:inherit;width:112px}
   .al-side .al-model{border:0;padding:0;gap:6px;height:30px;justify-content:space-between}
   .al-side .al-model-open{font-size:13px}
   .al-side .al-new{margin-left:auto}
   .al-side .al-model-pop{left:-375px;top:0}
   .al-proto .al-foot{padding-top:13px;border-top:1px solid #e8eaf0;margin-top:16px;display:flex;justify-content:space-between}
   .al-proto .al-foot button{font-size:12px;color:#647084}
  `;document.head.append(css);
  window.__alDirection={root,tools,icons,extensionId,photoDirection};
 },{icons,extensionId,photoDirection:options.photoDirection});
 const render=async direction=>page.evaluate(direction=>{
  const {root,icons,extensionId,photoDirection}=window.__alDirection;
  const icon=n=>icons[n];
  const sw=(label,on=true)=>`<button type="button" class="al-switch" role="switch" aria-label="${label}" aria-checked="${on}"></button>`;
  const model=`<div class="al-model"><button type="button" class="al-model-open" data-open="model" aria-expanded="false"><img src="chrome-extension://${extensionId}/images/user-model-female.webp" alt="">Your model${icon('chevron-right')}</button><span class="al-new">New</span>${sw('Use your model')}</div>`;
  const source=(photoDirection==='A'||photoDirection==='C')?`<div class="al-source al-add"><button type="button" class="al-upload">${icon('image-plus')}<span class="al-upload-copy"><strong>Add photos</strong><small>Phone or computer</small></span>${icon('chevron-down')}</button></div>`:photoDirection==='B'?`<div class="al-source al-explicit"><button type="button">${icon('smartphone')}Add from phone</button><button type="button">${icon('monitor')}Add from computer</button></div>`:`<div class="al-source"><button type="button">${icon('smartphone')}Phone</button><span class="al-divider"></span><button type="button">${icon('monitor')}Computer</button></div>`;
  const generate=`<button type="button" class="al-main">${icon('wand-sparkles')}Generate</button>`;
  const segment=`<div class="al-segment"><button type="button" aria-pressed="false">Short</button><button type="button" aria-pressed="true">Long</button></div>`;
  const preview=`<div class="al-pop al-model-pop" data-panel="model" hidden><div class="al-pop-title">Your model<button type="button" data-close aria-label="Close">${icon('x')}</button></div><img alt="Saved model preview" src="chrome-extension://${extensionId}/images/user-model-female.webp"><div class="al-setting"><span>Use for model photos</span>${sw('Use model photos')}</div></div>`;
  root.className='al-proto'+(direction==='B'?' al-side':'');root.removeAttribute('style');
  if(direction==='A')root.innerHTML=`<div class="al-row">${generate}${source}<button type="button" class="al-quiet" aria-label="More">${icon('ellipsis')}</button></div><div class="al-row al-secondary">${model}<button type="button" class="al-style" data-open="style" aria-expanded="false">${icon('settings-2')}Writing style${icon('chevron-down')}</button></div><div class="al-pop" data-panel="style" hidden><div class="al-pop-title">Writing style<button type="button" data-close aria-label="Close">${icon('x')}</button></div><div class="al-setting"><span>Length</span>${segment}</div><div class="al-setting"><span>Format</span><div class="al-segment"><button type="button" aria-pressed="true">${icon('list')}Bullets</button><button type="button" aria-pressed="false">${icon('align-left')}Paragraphs</button></div></div><div class="al-checks"><label><input type="checkbox" checked>${icon('hash')}Hashtags</label><label><input type="checkbox" checked>${icon('smile')}Emojis</label></div><div class="al-setting"><label><input type="checkbox" data-note>${icon('sticky-note')}Seller note</label></div><textarea aria-label="Seller note" placeholder="Add your seller note" hidden></textarea></div>${preview}`;
  else root.innerHTML=`<div class="al-brand"><span>AutoLister</span><button type="button" aria-label="More">${icon('ellipsis')}</button></div>${generate}${source}<div class="al-section">${model}</div><div class="al-section"><div class="al-section-title">Writing style</div><div class="al-setting"><span>Length</span>${segment}</div><div class="al-setting"><span>Format</span><div class="al-choice-icon">${icon('list')}<select class="al-compact-select" aria-label="Text format"><option>Bullet points</option><option>Paragraphs</option></select></div></div><div class="al-setting"><span class="al-label">${icon('hash')}Hashtags</span>${sw('Hashtags')}</div><div class="al-setting"><span class="al-label">${icon('smile')}Emojis</span>${sw('Emojis')}</div><div class="al-setting"><button type="button" data-note-open>${icon('sticky-note')}Seller note ${icon('chevron-right')}</button>${sw('Seller note',false)}</div><textarea aria-label="Seller note" placeholder="Add your seller note" hidden></textarea></div><div class="al-foot"><button type="button">${icon('message-square')}Feedback</button><button type="button">Hide</button></div>${preview}`;
  if(photoDirection==='C'){
   const main=root.querySelector('.al-row');
   main.querySelector('.al-source').remove();
   const secondary=root.querySelector('.al-secondary');
   const more=main.querySelector('.al-quiet');
   [...secondary.children].forEach(e=>main.insertBefore(e,more));secondary.remove();root.classList.add('al-context');
   document.querySelector('#al-photo-context')?.remove();
   const label=[...document.querySelectorAll('label,h2,h3,span')].find(e=>e.textContent.trim()==='Photos'&&e.children.length===0);
   const grid=document.querySelector('[data-testid="media-upload-grid"], [data-testid="media-select-grid"]');
   if(!label||!grid)throw new Error('Photos placement unavailable');
   const p=document.createElement('div');p.id='al-photo-context';p.className='al-proto al-photo-source';p.innerHTML=source;document.body.append(p);
   const lr=label.getBoundingClientRect(),gr=document.querySelector('[data-testid="title"]').getBoundingClientRect();p.style.left=gr.left+'px';p.style.width=gr.width+'px';p.style.top=lr.top+scrollY+(lr.height-40)/2+'px';
  }
  if(photoDirection==='C'&&innerWidth<=600){
   root.querySelectorAll('[data-panel]').forEach(p=>{
    const d=document.createElement('dialog');d.className=p.className;d.dataset.panel=p.dataset.panel;d.innerHTML=p.innerHTML;d.hidden=true;d.setAttribute('aria-label',p.dataset.panel==='style'?'Writing style':'Your model');p.replaceWith(d);
    const dismiss=()=>{d.close();d.hidden=true;const trigger=root.querySelector('[data-open='+d.dataset.panel+']');trigger?.setAttribute('aria-expanded','false');trigger?.focus();};
    d.addEventListener('cancel',e=>{e.preventDefault();dismiss();});
    d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dismiss();});
   });
  }
  root.onclick=e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.matches('[role=switch]'))b.setAttribute('aria-checked',b.getAttribute('aria-checked')!=='true');
   if(b.matches('[aria-pressed]')){b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));}
   if(b.dataset.open){const p=root.querySelector(`[data-panel=${b.dataset.open}]`);const show=p.hidden;root.querySelectorAll('[data-panel]').forEach(x=>{if(x.open)x.close();x.hidden=true;});p.hidden=!show;if(show&&p.tagName==='DIALOG')p.showModal();root.querySelectorAll('[data-open]').forEach(x=>x.setAttribute('aria-expanded',String(x===b&&show)));}
   if(b.hasAttribute('data-close')){const p=b.closest('[data-panel]');if(p.open)p.close();p.hidden=true;const trigger=root.querySelector('[data-open='+p.dataset.panel+']');trigger?.setAttribute('aria-expanded','false');trigger?.focus();}
   if(b.hasAttribute('data-note-open')){const t=root.querySelector('textarea');t.hidden=!t.hidden;}
  };
  root.onchange=e=>{if(e.target.matches('[data-note]'))root.querySelector('textarea').hidden=!e.target.checked;};
  root.onkeydown=e=>{if(e.key==='Escape'){const panel=root.querySelector('[data-panel]:not([hidden])');if(panel){if(panel.open)panel.close();panel.hidden=true;const trigger=root.querySelector('[data-open='+panel.dataset.panel+']');trigger?.setAttribute('aria-expanded','false');trigger?.focus();}}};
  if(direction==='B'){
   const title=document.querySelector('[data-testid="title"]');const rect=title.getBoundingClientRect();root.style.left=rect.right+24+'px';root.style.top=rect.top+scrollY-48+'px';document.body.append(root);
  }else window.__alDirection.tools.after(root);
 },direction);
 const evidence=[];
 for(const direction of (options.photoDirection?['A']:['A','B'])){
  for(const width of (options.photoDirection==='C'?[1920,1440,1280,1152,1024,768,430,390,375]:[1440,1280])){
   await page.setViewportSize({width,height:width===375?667:width<=600?844:1100});await render(direction);await page.evaluate(()=>{scrollTo(0,0);return document.fonts.ready;});
   const bounds=await page.locator('#al-exploration').boundingBox();if(bounds.x+bounds.width>width)throw new Error('Prototype overflows laptop viewport');
   if(options.photoDirection==='C'&&width===1920){
    const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
    const {root:doc}=await cdp.send('DOM.getDocument');const fonts=[];
    for(const selector of ['#al-photo-context strong','#al-photo-context small','#al-exploration .al-main']){const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:doc.nodeId,selector});fonts.push({selector,...await cdp.send('CSS.getPlatformFontsForNode',{nodeId})});}
    writeFileSync(join(folder,'rendered-fonts.json'),JSON.stringify(fonts,null,2));await cdp.detach();
   }
   await page.screenshot({path:join(folder,`direction-${direction}-${width}.png`)});
   const clip=await page.locator('[data-testid="title"]').evaluate((e,d)=>{const r=e.getBoundingClientRect();return {x:Math.max(0,r.left-24),y:Math.max(0,r.top-90),width:Math.min(innerWidth,d==='B'?850:608),height:610};},direction);
   await page.screenshot({path:join(folder,`direction-${direction}-${width}-detail.png`),fullPage:true,clip});
   if(options.photoDirection==='C'){
    const photoClip=await page.locator('#al-photo-context').evaluate(e=>{const r=e.getBoundingClientRect(),g=document.querySelector('[data-testid="title"]').getBoundingClientRect();return {x:Math.max(0,g.left-24),y:r.top+scrollY-24,width:Math.min(innerWidth,g.width+48),height:g.top-r.top-70};});
    await page.screenshot({path:join(folder,`photo-placement-${width}.png`),fullPage:true,clip:photoClip});
    const fullClip=await page.locator('#al-photo-context').evaluate(e=>{const r=e.getBoundingClientRect(),t=document.querySelector('[data-testid="title"]').getBoundingClientRect(),d=document.querySelector('[data-testid="description"]').getBoundingClientRect();return {x:Math.max(0,t.left-24),y:r.top+scrollY-24,width:Math.min(innerWidth,t.width+48),height:d.bottom-r.top+48};});
    await page.screenshot({path:join(folder,`context-placement-${width}.png`),fullPage:true,clip:fullClip});
   }
   const alignment=await page.locator('#al-exploration').evaluate(e=>Array.from(e.querySelectorAll('.al-row:first-child > button,.al-row:first-child > .al-source button,.al-row:first-child > .al-model')).map(b=>{const r=b.getBoundingClientRect();const s=getComputedStyle(b);return {label:b.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height,font:s.fontFamily,fontSize:s.fontSize};}));
   if(options.photoDirection&&width>600){const actions=alignment.filter(x=>x.label!=='');if(actions.some(x=>Math.abs(x.height-40)>.5||Math.abs(x.y-actions[0].y)>.5))throw new Error('Primary row alignment mismatch');}
   let photoAlignment;
   if(options.photoDirection==='C'){
    photoAlignment=await page.locator('#al-photo-context').evaluate(e=>{const p=e.querySelector('button').getBoundingClientRect(),t=document.querySelector('[data-testid="title"]').getBoundingClientRect();return {rightDifference:p.right-t.right,buttonHeight:p.height,viewport:innerWidth,fonts:[...e.querySelectorAll('button,strong,small')].map(x=>({tag:x.tagName,font:getComputedStyle(x).fontFamily,size:getComputedStyle(x).fontSize})),loadedFonts:[...document.fonts].filter(x=>x.family.includes('AutoLister')).map(x=>({family:x.family,status:x.status}))};});
    if(Math.abs(photoAlignment.rightDifference)>.5)throw new Error('Photo button right edge differs: '+JSON.stringify(photoAlignment));
   }
   const overflow=await page.locator('#al-exploration').evaluate(e=>e.scrollWidth>e.clientWidth);
   if(overflow)throw new Error('Toolbar internal overflow');
   evidence.push({direction,width,bounds,alignment,photoAlignment,overflow});
  }
  if(direction==='A'){
   await page.locator('[data-open=style]').click();
   if(options.photoDirection==='C'){
    const panelBounds=await page.locator('[data-panel=style]').boundingBox();const viewport=page.viewportSize();
    if(panelBounds.y<0||panelBounds.y+panelBounds.height>viewport.height)throw new Error('Small-screen style panel outside viewport');
    await page.screenshot({path:join(folder,'mobile-style-viewport.png')});
   }
   const clip=await page.locator('[data-testid="title"]').evaluate(e=>{const r=e.getBoundingClientRect();return {x:Math.max(0,r.left-24),y:r.top+scrollY-90,width:Math.min(innerWidth,608),height:660};});
   await page.screenshot({path:join(folder,'direction-A-style-open.png'),fullPage:true,clip});
   await page.locator('[data-panel=style] [data-close]').click();
  }
  const toggle=page.locator('#al-exploration .al-model [role=switch]');await toggle.click();if(await toggle.getAttribute('aria-checked')!=='false')throw new Error('Prototype switch failed');await toggle.click();
  await page.locator('#al-exploration [data-open=model]').click();if(!await page.locator('[data-panel=model]').isVisible())throw new Error('Preview failed');await page.locator('[data-panel=model] [data-close]').click();
 }
 await page.evaluate(()=>{document.querySelector('#al-photo-context')?.remove();const {root,tools}=window.__alDirection;root.remove();tools.setAttribute('style',tools.dataset.explorationPreviousStyle);document.querySelector('#al-exploration-css').remove();delete window.__alDirection;});
 writeFileSync(join(folder,'directions-verification.json'),JSON.stringify({prototypeOnly:true,paidCalls:0,evidence},null,2));
 return {designExploration:true,prototypeOnly:true,paidCalls:0,evidence};
}
