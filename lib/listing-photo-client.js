(function(root){
 "use strict";
 const slots=["primary","secondary"];
 const documentId=crypto.randomUUID();
 function hostImageKey(value){try{const u=new URL(value);return u.protocol==="https:"?u.origin+u.pathname:value;}catch{return value||"";}}
 const sourceSetKey=keys=>JSON.stringify([...new Set(keys)].sort());
 const missingSlots=(record,keys)=>record.completed?[]:slots.filter(slot=>!record.slots?.[slot]?.hostKey);
 function create(options){
  const storageKey="autolisterListingModelPhotosV1";
  let record=null,active=null,mutating=false,stopped=false,progress=null,inflight=null,preview=null,previewBusy=false,orderCheckPending=false;
  const known=new Set();
  const previews=new Map();
  let additionFocus=null;
  const fingerprints=new Map();let matching=false;
  async function pixels(blob){
   const bitmap=await createImageBitmap(blob);
   try{const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;const context=canvas.getContext('2d');context.drawImage(bitmap,0,0,16,16);return Array.from(context.getImageData(0,0,16,16).data);}finally{bitmap.close();}
  }
  function acceptInflight(candidate){
   const key=imageKey(candidate);known.add(key);candidate.dataset.autolisterModelPhoto='true';record.slots[inflight.slot]={hostKey:key};inflight=null;delete record.inflight;persist();
  }
  async function matchInflight(){
   if(matching||!inflight?.pixels||!record||location.pathname!==record.route)return false;
   const expected=inflight;matching=true;
   try{
    const fresh=images().filter(img=>!expected.before.includes(imageKey(img))&&img.complete&&img.naturalWidth>0&&/^https:\/\/[^/]*vinted\.(net|com)\//.test(img.currentSrc||img.src));
    const compared=await Promise.all(fresh.map(async img=>{
     const key=imageKey(img);
     if(!fingerprints.has(key))fingerprints.set(key,options.download(img.currentSrc||img.src).then(pixels).catch(()=>null));
     const sample=await fingerprints.get(key);if(!sample)return null;
     let difference=0;for(let i=0;i<sample.length;i++)if(i%4!==3)difference+=Math.abs(sample[i]-expected.pixels[i]);
     return difference/(16*16*3)<=4?img:null;
    }));
    const matches=compared.filter(Boolean);
    if(inflight===expected&&location.pathname===record.route&&matches.length===1&&matches[0].isConnected){acceptInflight(matches[0]);return true;}
    return false;
   }finally{matching=false;}
  }
  const images=()=>options.images();
  const imageKey=img=>hostImageKey(img.currentSrc||img.src);
  const isDerived=img=>known.has(imageKey(img))||img.dataset?.autolisterModelPhoto==="true";
  const currentSources=()=>images().filter(img=>!isDerived(img)).map(imageKey).filter(Boolean);
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function persist(){try{sessionStorage.setItem(storageKey,JSON.stringify({...record,known:[...known]}));}catch{/* local recovery unavailable */}}
  function show(status,canRetry=false){
   if(record&&record.status!==status&&['attached','attachment_failed','order_failed','capacity'].includes(status))void request(status).catch(()=>{});
   if(!record)return;record.status=status;record.canRetry=canRetry;persist();
   const grid=options.grid();if(!grid)return;
   if(!progress?.isConnected){progress=document.createElement("div");progress.dataset.autolisterPhotoProgress="true";grid.before(progress);}
   if(status==="skipped"){
    const controls=document.querySelector('.quickvint-primary-tools')?.parentElement;
    if(controls)controls.append(progress);
   }else if(progress.nextElementSibling!==grid)grid.before(progress);
   if(record.eligible&&!record.completed&&!['cancelled','skipped'].includes(status))renderPreview();
   else {clearPreviews();root.AutoListerPhotoUI?.render(progress,record,retry);}
  }
  async function valid(){
   const expected=record,owner=await options.owner();
   if(record!==expected||stopped||options.enabled?.()===false||!record||location.pathname!==record.route||owner!==record.owner)return false;
   return sourceSetKey(currentSources())===record.sourceKey;
  }
  function reconcileInflight(){
   if(!inflight||!record||location.pathname!==record.route)return false;
   if((options.sourceRevision?.()||0)!==inflight.revision)return false;
   const fresh=images().filter(img=>!inflight.before.includes(imageKey(img)));
   if(fresh.length!==1)return false;
   const candidate=fresh[0];candidate.dataset.autolisterModelPhoto='true';
   if(!candidate.complete||!candidate.naturalWidth||!/^https:\/\/[^/]*vinted\.(net|com)\//.test(candidate.currentSrc||candidate.src))return false;
   acceptInflight(candidate);return true;
  }
  async function request(action){
   const result=await chrome.runtime.sendMessage({type:"LISTING_PHOTO_REQUEST",expectedUserId:record.owner,id:record.jobId,method:action?"POST":"GET",...(action?{action}:{})});
   if(!result?.ok)throw Object.assign(new Error("photo_request_failed"),{status:result?.status});return result.data;
  }
  async function confirmNewPhoto(before,slot){
   const until=Date.now()+20000;
   while(Date.now()<until){
    if(location.pathname!==record.route)throw new Error('photo_context_changed');
    if(!inflight&&images().some(img=>imageKey(img)===record.slots[slot]?.hostKey))return;
    if(reconcileInflight())return;
    const fresh=images().filter(img=>!before.has(imageKey(img)));
    if(fresh.length>1||(options.sourceRevision?.()||0)!==inflight?.revision){if(await matchInflight())return;}
    await delay(200);
   }
   throw new Error("photo_upload_unconfirmed");
  }
  const canSort=()=>additionFocus?.isConnected&&(document.activeElement===additionFocus||document.activeElement===document.body);
  async function nativeMove(image,target){
   if(!canSort())return;
   const box=image.closest(options.boxSelector);const targetBox=target.closest(options.boxSelector);
   if(!box||!targetBox)return;
   const sortable=box.matches('[aria-roledescription="sortable"]')?box:box.querySelector('[aria-roledescription="sortable"]');
   if(sortable){
    const movingKey=imageKey(image),targetKey=imageKey(target);
    const from=sortable.getBoundingClientRect(),to=targetBox.getBoundingClientRect();
    const sx=from.left+from.width/2,sy=from.top+from.height/2,tx=to.left+to.width/2,ty=to.top+to.height/2;
    const send=(element,type,x,y,down=true)=>{
     const init={bubbles:true,cancelable:true,view:window,clientX:x,clientY:y,button:0,buttons:down?1:0};
     element.dispatchEvent(type.startsWith('pointer')?new PointerEvent(type,{...init,pointerId:1,pointerType:'mouse',isPrimary:true}):new MouseEvent(type,init));
    };
    send(sortable,'pointerdown',sx,sy);send(sortable,'mousedown',sx,sy);
    await delay(100);
    for(const fraction of [.15,.5,1]){
     if(!await valid()||!canSort()){
      send(document,'pointercancel',sx,sy,false);send(document,'mouseup',sx,sy,false);return;
     }
     send(document,'pointermove',sx+(tx-sx)*fraction,sy+(ty-sy)*fraction);
     send(document,'mousemove',sx+(tx-sx)*fraction,sy+(ty-sy)*fraction);
     await delay(100);
    }
    send(document,'pointerup',tx,ty,false);send(document,'mouseup',tx,ty,false);
    await delay(300);
    const reordered=images().map(imageKey);
    if(reordered.indexOf(movingKey)>=0&&reordered.indexOf(movingKey)<reordered.indexOf(targetKey))return;
    // Vinted's current grid exposes keyboard sorting, not HTML drag-and-drop.
    // Drive that public interaction and let the host commit its own photo order.
    if(!canSort())return;
    const previousFocus=document.activeElement;
    const destination=target.getBoundingClientRect();
    const goal={x:destination.left+scrollX,y:destination.top+scrollY};
    const press=code=>sortable.dispatchEvent(new KeyboardEvent('keydown',{key:code==='Space'?' ':code,code,bubbles:true,cancelable:true}));
    let dropped=false;
    try{
     sortable.focus({preventScroll:true});press('Space');await delay(100);
     for(let step=0;step<24;step++){
      if(!await valid()||!sortable.isConnected||document.activeElement!==sortable)break;
      const rect=image.getBoundingClientRect();
      const dx=goal.x-(rect.left+scrollX),dy=goal.y-(rect.top+scrollY);
      if(Math.abs(dx)<rect.width/3&&Math.abs(dy)<rect.height/3){press('Space');dropped=true;break;}
      press(Math.abs(dy)>=rect.height/3?(dy<0?'ArrowUp':'ArrowDown'):(dx<0?'ArrowLeft':'ArrowRight'));
      await delay(100);
      const next=image.getBoundingClientRect();
      if(Math.abs(next.left-rect.left)<1&&Math.abs(next.top-rect.top)<1)break;
     }
    }finally{
     if(!dropped)press('Escape');
     if(previousFocus?.isConnected&&(document.activeElement===sortable||document.activeElement===document.body))previousFocus.focus({preventScroll:true});
    }
    await delay(300);return;
   }
   const handle=box.closest('[draggable="true"]')||box.querySelector('[draggable="true"]')||box;
   const transfer=new DataTransfer();
   handle.dispatchEvent(new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:transfer}));
   targetBox.dispatchEvent(new DragEvent("dragenter",{bubbles:true,cancelable:true,dataTransfer:transfer}));
   targetBox.dispatchEvent(new DragEvent("dragover",{bubbles:true,cancelable:true,dataTransfer:transfer}));
   targetBox.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:transfer}));
   handle.dispatchEvent(new DragEvent("dragend",{bubbles:true,dataTransfer:transfer}));
   await delay(300);
  }
  async function reorder(){
   const present=slots.filter(slot=>images().some(img=>imageKey(img)===record.slots[slot]?.hostKey));
   for(let n=0;n<present.length;n++){
    const list=images();const image=list.find(img=>imageKey(img)===record.slots[present[n]]?.hostKey);
    if(image&&list[n]!==image)await nativeMove(image,list[n]);
   }
   // No DOM movement: only accept an order produced and retained by host handlers.
   for(let n=0;n<3;n++){await delay(250);if(!present.every((slot,i)=>imageKey(images()[i]||{})===record.slots[slot]?.hostKey))return false;}
   return true;
  }
  async function removePrevious(){
   for(const img of images().filter(img=>known.has(imageKey(img))&&!Object.values(record.slots).some(slot=>slot.hostKey===imageKey(img)))){
    const box=img.closest(options.boxSelector);
    const remove=box?.querySelector('[data-testid*="delete"], [data-testid*="remove"], button[aria-label*="Delete"], button[aria-label*="Remove"]');
    if(!remove)throw new Error("previous_photos_cannot_be_replaced");
    remove.click();await delay(250);
    if(images().some(other=>imageKey(other)===imageKey(img)))throw new Error("previous_photo_still_present");
   }
  }
  function trackOutcome(event){
   if(!record||record.reported?.[event])return;
   record.reported ||= {};
   record.reported[event]=true;
   persist();
   try{Promise.resolve(root.AutoListerTelemetry?.track(event,{operationId:record.jobId,imageCount:2,mode:/\/edit\/?$/.test(record.route)?"existing_listing":"new_listing"},"extension_content",false,record.owner)).catch(()=>{});}catch{}
  }
  async function attach(state){
   const available=validatedPhotos(state);
   if(!available.length)throw new Error("invalid_photo_pair");
   if(!await valid())return;
   if(inflight)await confirmNewPhoto(new Set(inflight.before),inflight.slot);
   if(!await valid())return;
   mutating=true;
   try{
    await removePrevious();
    const missing=missingSlots(record,images().map(imageKey)).filter(slot=>available.some(photo=>photo.slot===slot));
    if(images().length+missing.length>20){show(missing.length===1?"capacity_one":"capacity",true);return;}
    show("adding");
    // Fetch both files together. Keep host uploads sequential to identify each result safely.
    const downloads=new Map(missing.map(slot=>[slot,(async()=>{
     try{const photo=state.photos.find(p=>p.slot===slot);if(!photo)throw new Error("missing_photo");const blob=previews.get(slot)?.blob||await options.download(photo.url);return {blob,pixels:await pixels(blob).catch(()=>null)};}
     catch(error){return {error};}
    })()]));
    for(const slot of missing){
     if(!await valid())return;
     const downloaded=await downloads.get(slot);if(downloaded.error)throw downloaded.error;
     const blob=downloaded.blob;
     if(!await valid())return;
     if(!validatedPhotos(await request()).some(photo=>photo.slot===slot)){show('cancelled');return;}
     if(!await valid())return;
     if(blob.type!=="image/jpeg"||blob.size>4*1024*1024)throw new Error("invalid_photo");
     const before=new Set(images().map(imageKey));
     const file=new File([blob],`autolister-model-${record.jobId}-${slot}.jpg`,{type:"image/jpeg"});
     inflight={before:[...before],slot,revision:options.sourceRevision?.()||0,pixels:downloaded.pixels,documentId};record.inflight=inflight;persist();
     if(!options.inject(file)){inflight=null;delete record.inflight;persist();throw new Error("photo_input_unavailable");}
     await confirmNewPhoto(before,slot);
    }
    if(!await valid())return;
    // Native sorting is safe only while the seller is still using our Add control.
    // If they resumed editing, keep the host's append order and never take focus.
    const ordered=canSort()?await reorder():false;
    if(!await valid())return;
    record.completed=missingSlots(record,images().map(imageKey)).length===0;persist();
    if(record.completed){
     trackOutcome("model_photos_uploaded");
     trackOutcome(ordered?"model_photos_attached":"model_photos_order_failed");
     show("attached");
    }else show(state.status==="ready"?"preview_ready":state.status,state.canRetry);
   }finally{mutating=false;options.changed?.();}
  }
  function validatedPhotos(state){
   if(!['ready','generating','preparing','queued','failed'].includes(state.status))return [];
   const photos=state.photos||[];
   if(!Array.isArray(photos)||photos.length>2||(state.status==='ready'&&photos.length!==2)||new Set(photos.map(p=>p.slot)).size!==photos.length||photos.some(p=>!slots.includes(p.slot)||typeof p.url!=='string'))throw new Error('invalid_photo_pair');
   return photos;
  }
  function clearPreviews(){
   previews.forEach(value=>URL.revokeObjectURL(value.url));previews.clear();
   preview?.remove();preview=null;
  }
  function renderPreview(){
   const text=root.AutoListerPhotoUI.text;
   progress.className='mp-preview-panel';progress.hidden=false;
   if(!preview?.isConnected){
    progress.replaceChildren();
    preview=document.createElement('div');preview.className='mp-preview-images';
    for(const slot of slots){const card=document.createElement('div');card.className='mp-preview-image';card.dataset.slot=slot;preview.append(card);}
    const details=document.createElement('div');details.className='mp-preview-details';
    const heading=document.createElement('div');heading.className='mp-preview-heading';
    const title=document.createElement('strong');title.textContent=text('Model photos');
    const count=document.createElement('span');count.className='mp-preview-count';heading.append(title,count);
    const status=document.createElement('div');status.dataset.photoStatus='true';
    const actions=document.createElement('div');actions.className='mp-preview-actions';
    const add=document.createElement('button');add.type='button';add.className='um-primary';add.textContent=text('Add model photos');add.addEventListener('click',()=>void addAvailable());actions.append(add);
    details.append(heading,status,actions);progress.append(preview,details);
   }
   progress.querySelector('.mp-preview-count').textContent=previews.size+'/2';
   for(const slot of slots){
    const card=preview.querySelector('[data-slot="'+slot+'"]'),value=previews.get(slot);
    card.classList.toggle('mp-preview-waiting',!value&&['generating','preparing','queued','adding'].includes(record.status));
    if(value&&!card.querySelector('img')){const img=document.createElement('img');img.src=value.url;img.alt=text('Model photo')+' '+(slots.indexOf(slot)+1);card.replaceChildren(img);}
   }
   const status=progress.querySelector('[data-photo-status]');
   root.AutoListerPhotoUI.render(status,record,retry);status.classList.add('mp-inline-status');
   const add=progress.querySelector('.mp-preview-actions button');
   add.hidden=!slots.some(slot=>previews.has(slot)&&!record.slots[slot]?.hostKey);
   add.disabled=previewBusy||mutating;
  }
  async function loadPreviews(state){
   const expected=record;
   const results=await Promise.allSettled(validatedPhotos(state).filter(p=>!previews.has(p.slot)).map(async photo=>{
    const blob=await options.download(photo.url);
    if(blob.type!=='image/jpeg'||!blob.size||blob.size>4*1024*1024)throw new Error('invalid_photo');
    if(record!==expected||!await valid()||record.completed)return;
    previews.set(photo.slot,{url:URL.createObjectURL(blob),blob});
    if(record.eligible)renderPreview();
   }));
   if(results.some(result=>result.status==='rejected'))throw new Error('photo_download_failed');
  }
  async function addAvailable(){
   if(previewBusy||mutating)return;
   additionFocus=document.activeElement;
   previewBusy=true;renderPreview();
   try{
    if(!await valid())return show('cancelled');
    const fresh=await request();
    if(!await valid())return show('cancelled');
    await attach(fresh);
    if(!await valid())show('cancelled');
   }catch(error){if([401,403,404].includes(error.status))show('cancelled');else if(await valid())show('attachment_failed',true);}
   finally{previewBusy=false;if(preview?.isConnected)renderPreview();}
  }
  async function poll(){
   let failures=0;const started=Date.now();
   while(await valid()&&Date.now()-started<15*60*1000){
    try{
     if(mutating||previewBusy){await delay(200);continue;}
     const state=await request();
     if(!await valid())break;
     if(record.completed)return;
     if(mutating||previewBusy){await delay(200);continue;}
     record.eligible=state.eligible===true;
     if(state.status==='ready')record.eligible=true;
     show(state.status==='ready'?'preview_ready':state.status,state.canRetry);
     await loadPreviews(state);failures=0;
     if(['ready','skipped','failed','cancelled'].includes(state.status))return;
     await request("resume");
    }catch(error){if([401,403,404].includes(error.status)){show("cancelled");return;}if(++failures>=3){show("connection_failed",true);return;}}
    await delay(2000);
   }
   show(await valid()?"connection_failed":"cancelled",await valid());
  }
  function begin(){if(active||stopped)return active;active=poll().finally(()=>active=null);return active;}
  async function retry(){
   for(const [key,value] of fingerprints){if(!await value)fingerprints.delete(key);}
   if(inflight){
    show('adding');
    try{await confirmNewPhoto(new Set(inflight.before),inflight.slot);}catch{show('attachment_failed',true);return;}
   }
   if(['capacity','capacity_one'].includes(record?.status)){
    const original=JSON.parse(record.sourceKey);const current=currentSources();
    if(current.every(key=>original.includes(key)))record.sourceKey=sourceSetKey(current);
   }
   if(!await valid())return show("cancelled");
   if(record.status==="failed")await request("retry");
   show("queued");return begin();
  }
  async function start(meta,owner,sourceKey,explicit=false){
   if(!meta?.jobId||!owner)return;
   const same=record?.jobId===meta.jobId&&record.owner===owner;
   if(same&&record.completed&&!explicit)return;
   if(active){stopped=true;await active;} // Fence and drain the old operation before replacing its identity.
   if(inflight)return;
   stopped=false;
   if(same){if(explicit){record.completed=false;record.sourceKey=sourceKey||record.sourceKey;}return begin();}
   try{Promise.resolve(root.AutoListerTelemetry?.track("model_photos_requested",{operationId:meta.jobId,mode:/\/edit\/?$/.test(location.pathname)?"existing_listing":"new_listing"},"extension_content",false,owner)).catch(()=>{});}catch{}
   clearPreviews();
   record={owner,route:location.pathname,jobId:meta.jobId,sourceKey:sourceKey||sourceSetKey(currentSources()),slots:{},status:meta.status,eligible:false,completed:false};persist();return begin();
  }
  async function restore(){
   try{const saved=JSON.parse(sessionStorage.getItem(storageKey)||"null");if(!saved||saved.route!==location.pathname)return;
    saved.known?.forEach(key=>known.add(key));inflight=saved.inflight||null;record=saved;
    reconcileInflight();
    if(await options.owner()!==saved.owner)return;
    if(inflight){
     show('adding');
     try{await confirmNewPhoto(new Set(inflight.before),inflight.slot);}catch{show('attachment_failed',true);return;}
    }
    if(!await valid())return;
    if(record.completed){show(record.status);return;}
    if(record.status==="preview_ready")return begin();
    if(["failed","attachment_failed","connection_failed","capacity","capacity_one"].includes(record.status)){show(record.status,record.canRetry);return;}
    void begin();
   }catch{/* No saved operation. */}
  }
  function stop(owner){if(typeof owner==='string'&&record?.owner!==owner)return;stopped=true;clearPreviews();progress?.remove();}
  const accountChanged=(changes,area)=>{
   if(area!=="local"||!changes.supabaseSession||!record)return;
   const owner=changes.supabaseSession.newValue?.user?.id;
   if(owner!==record.owner)stop();
  };
  chrome.storage?.onChanged?.addListener(accountChanged);
  document.addEventListener("submit",stop,true);window.addEventListener("pagehide",()=>{stop();chrome.storage?.onChanged?.removeListener(accountChanged);},{once:true});
  document.addEventListener('click',event=>{if(event.target?.closest?.('button[type="submit"],input[type="submit"]'))stop();},true);
  // Once a native upload has been dispatched, attribution outlives cancellation.
  // A late single result can be reconciled without another upload or moving photos.
  async function checkLaterOrder(){
   if(orderCheckPending||!record?.completed||record.status!=="order_failed")return;
   orderCheckPending=true;
   try{
    await delay(400);
    if(!await valid())return;
    const first=()=>slots.every((slot,i)=>imageKey(images()[i]||{})===record.slots[slot]?.hostKey);
    if(!first())return;
    await delay(250);
    if(await valid()&&first()){trackOutcome("model_photos_attached");show("attached");}
   }finally{orderCheckPending=false;}
  }
  const reconcileLate=()=>{
   if(preview&&record&&location.pathname!==record.route){stopped=true;clearPreviews();progress?.remove();}
   if(!active&&!reconcileInflight())void matchInflight();
   void checkLaterOrder();
  };
  const observer=new MutationObserver(reconcileLate);
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  document.addEventListener('load',reconcileLate,true);
  window.addEventListener('pagehide',()=>{observer.disconnect();document.removeEventListener('load',reconcileLate,true);},{once:true});
  function newOriginalUpload(){
   if(inflight&&inflight.documentId!==documentId&&!inflight.before.some(key=>images().some(img=>imageKey(img)===key))){inflight=null;delete record.inflight;persist();}
  }
  const api={start,restore,isDerived,newOriginalUpload,sourceKey:()=>sourceSetKey(currentSources()),hasPairForSource:()=>record?.completed&&record.sourceKey===sourceSetKey(currentSources()),get uncertain(){return !!inflight;},get mutating(){return mutating;},get pending(){return !!active;},get settled(){return active;},get status(){return record?.status;},stop};return api;
 }
 const api={create,hostImageKey,sourceSetKey,missingSlots};root.AutoListerListingPhotos=api;if(typeof module!=="undefined")module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
