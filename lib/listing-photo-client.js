(function(root){
 "use strict";
 const slots=["primary","secondary"];
 const documentId=crypto.randomUUID();
 function hostImageKey(value){try{const u=new URL(value);return u.protocol==="https:"?u.origin+u.pathname:value;}catch{return value||"";}}
 const sourceSetKey=keys=>JSON.stringify([...new Set(keys)].sort());
 const missingSlots=(record,keys)=>record.completed?[]:slots.filter(slot=>!record.slots?.[slot]?.hostKey||!keys.includes(record.slots[slot].hostKey));
 function create(options){
  const storageKey="autolisterListingModelPhotosV1";
  let record=null,active=null,mutating=false,stopped=false,progress=null,inflight=null,preview=null,previewClose=null,previewBusy=false,orderCheckPending=false;
  const known=new Set();
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
   if(status==="preview_ready"){
    progress.className="mp-progress";
    progress.hidden=false;
    progress.replaceChildren();
    const view=document.createElement("button");
    view.type="button";view.className="mp-preview-reopen";
    view.textContent=root.AutoListerPhotoUI.text("Model photos");
    view.addEventListener("click",()=>void openPreview());
    progress.append(view);
   }else root.AutoListerPhotoUI?.render(progress,record,retry);
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
  async function nativeMove(image,target){
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
     if(!await valid()){
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
    const previousFocus=document.activeElement;
    const destination=target.getBoundingClientRect();
    const goal={x:destination.left+scrollX,y:destination.top+scrollY};
    const press=code=>sortable.dispatchEvent(new KeyboardEvent('keydown',{key:code==='Space'?' ':code,code,bubbles:true,cancelable:true}));
    let dropped=false;
    try{
     sortable.focus({preventScroll:true});press('Space');await delay(100);
     for(let step=0;step<24;step++){
      if(!await valid()||!sortable.isConnected)break;
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
   for(let n=0;n<2;n++){
    const list=images();const image=list.find(img=>imageKey(img)===record.slots[slots[n]]?.hostKey);
    if(image&&list[n]!==image)await nativeMove(image,list[n]);
   }
   // No DOM movement: only accept an order produced and retained by host handlers.
   for(let n=0;n<3;n++){await delay(250);if(!slots.every((slot,i)=>imageKey(images()[i]||{})===record.slots[slot]?.hostKey))return false;}
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
   if(!Array.isArray(state.photos)||state.photos.length!==2)throw new Error("invalid_photo_pair");
   if(!await valid())return;
   if(inflight)await confirmNewPhoto(new Set(inflight.before),inflight.slot);
   if(!await valid())return;
   mutating=true;
   try{
    await removePrevious();
    const missing=missingSlots(record,images().map(imageKey));
    if(images().length+missing.length>20){show(missing.length===1?"capacity_one":"capacity",true);return;}
    show("adding");
    // Fetch both files together. Keep host uploads sequential to identify each result safely.
    const downloads=new Map(missing.map(slot=>[slot,(async()=>{
     try{const photo=state.photos.find(p=>p.slot===slot);if(!photo)throw new Error("missing_photo");const blob=await options.download(photo.url);return {blob,pixels:await pixels(blob).catch(()=>null)};}
     catch(error){return {error};}
    })()]));
    for(const slot of missing){
     if(!await valid())return;
     const downloaded=await downloads.get(slot);if(downloaded.error)throw downloaded.error;
     const blob=downloaded.blob;
     if(!await valid())return;
     if((await request()).status!=="ready"){show('cancelled');return;}
     if(!await valid())return;
     if(blob.type!=="image/jpeg"||blob.size>4*1024*1024)throw new Error("invalid_photo");
     const before=new Set(images().map(imageKey));
     const file=new File([blob],`autolister-model-${record.jobId}-${slot}.jpg`,{type:"image/jpeg"});
     inflight={before:[...before],slot,revision:options.sourceRevision?.()||0,pixels:downloaded.pixels,documentId};record.inflight=inflight;persist();
     if(!options.inject(file)){inflight=null;delete record.inflight;persist();throw new Error("photo_input_unavailable");}
     await confirmNewPhoto(before,slot);
    }
    if(!await valid())return;
    trackOutcome("model_photos_uploaded");
    const ordered=await reorder();
    if(!await valid())return;
    record.completed=true;persist();
    trackOutcome(ordered?"model_photos_attached":"model_photos_order_failed");
    show(ordered?"attached":"order_failed");
   }finally{mutating=false;options.changed?.();}
  }
  async function openPreview(state){
   if(preview||previewBusy)return;
   previewBusy=true;
   let urls=[];
   try{
    if(!await valid())return;
    state ||= await request();
    if(state.status!=="ready"||!Array.isArray(state.photos)||state.photos.length!==2)throw new Error("preview_unavailable");
    const blobs=await Promise.all(slots.map(async slot=>{
     const photo=state.photos.find(p=>p.slot===slot);
     if(!photo)throw new Error("missing_photo");
     return options.download(photo.url);
    }));
    if(!await valid())return;
    urls=blobs.map(blob=>URL.createObjectURL(blob));
    const dialog=document.createElement("dialog");
    dialog.className="um-modal mp-preview-dialog";
    dialog.setAttribute("aria-label",root.AutoListerPhotoUI.text("Model photos"));
    const view=document.createElement("div");view.className="um-view mp-preview-view";
    const title=document.createElement("h2");title.textContent=root.AutoListerPhotoUI.text("Model photos");
    const images=document.createElement("div");images.className="mp-preview-images";
    let adding=false;
    const close=()=>{if(preview!==dialog)return;preview=null;previewClose=null;dialog.close();dialog.remove();urls.forEach(url=>URL.revokeObjectURL(url));urls=[];if(record&&!record.completed&&!stopped)show("preview_ready");};
    const add=async()=>{
     if(adding)return;
     adding=true;
     if(!await valid()){adding=false;return;}
     close();show("adding");
     try{
      const fresh=await request();
      if(!await valid())return;
      await attach(fresh);
      if(!await valid())show("cancelled");
     }catch(error){if([401,403,404].includes(error.status))show("cancelled");else if(await valid())show("attachment_failed",true);}
    };
    urls.forEach((url,i)=>{
     const button=document.createElement("button");button.type="button";button.className="mp-preview-image";
     button.setAttribute("aria-label",root.AutoListerPhotoUI.text("Add model photos"));
     const img=document.createElement("img");img.src=url;img.alt=root.AutoListerPhotoUI.text("Model photo")+" "+(i+1);
     button.append(img);button.addEventListener("click",()=>void add());images.append(button);
    });
    const actions=document.createElement("div");actions.className="mp-preview-actions";
    const cancel=document.createElement("button");cancel.type="button";cancel.className="um-secondary";cancel.textContent=root.AutoListerModelCopy.text("Not now");cancel.addEventListener("click",close);
    const accept=document.createElement("button");accept.type="button";accept.className="um-primary";accept.textContent=root.AutoListerPhotoUI.text("Add model photos");accept.addEventListener("click",()=>void add());
    actions.append(cancel,accept);view.append(title,images,actions);dialog.append(view);
    dialog.addEventListener("cancel",e=>{e.preventDefault();close();});
    document.body.append(dialog);preview=dialog;previewClose=close;dialog.showModal();accept.focus({preventScroll:true});
    show("preview_ready");
   }catch(error){urls.forEach(url=>URL.revokeObjectURL(url));if(await valid())show("attachment_failed",true);}
   finally{previewBusy=false;}
  }
  async function poll(){
   let failures=0;const started=Date.now();
   while(await valid()&&Date.now()-started<15*60*1000){
    try{
     const state=await request();failures=0;
     if(!await valid())break;
     record.eligible=state.eligible===true;
     if(state.status==="ready"){
      record.eligible=true;
      show("preview_ready");
      await openPreview(state);
      return;
     }
     show(state.status,state.canRetry);
     if(["skipped","failed","cancelled"].includes(state.status))return;
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
    if(record.status==="preview_ready"){show("preview_ready");return;}
    if(["failed","attachment_failed","connection_failed","capacity","capacity_one"].includes(record.status)){show(record.status,record.canRetry);return;}
    void begin();
   }catch{/* No saved operation. */}
  }
  function stop(owner){if(typeof owner==='string'&&record?.owner!==owner)return;stopped=true;previewClose?.();progress?.remove();}
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
   if(preview&&record&&location.pathname!==record.route){stopped=true;previewClose?.();progress?.remove();}
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
