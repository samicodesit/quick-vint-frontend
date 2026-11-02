const { test, expect } = require("@playwright/test");
const { openBatchJourney, sendFromExtensionContent } = require("./batch-journey");
const path = require("node:path");
const user = { id: "00000000-0000-4000-8000-000000000001", email: "seller@example.invalid" };
const jwt = exp => [Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url"),
  Buffer.from(JSON.stringify({sub:user.id,exp})).toString("base64url"), "local-signature"].join(".");
const session = seconds => ({access_token:jwt(Math.floor(Date.now()/1000)+seconds),refresh_token:"local-refresh-0",
  expires_at:Math.floor(Date.now()/1000)+seconds,user});
for (const seconds of [3600,60,-60]) test("actual worker startup with token lifetime " + seconds, async () => {
  const flow = await openBatchJourney({session:session(3600)});
  const requests = [];
  const storagePage = await flow.context.newPage();
  await storagePage.goto(new URL("../tests/fixtures/auth-storage.html", flow.worker.url()).href);
  let rotations = 0;
  try {
    await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/**", async route => {
      const url=new URL(route.request().url());
      requests.push({path:url.pathname,refresh:route.request().postDataJSON()?.refresh_token,
        worker:route.request().headers()["x-test-worker"] || "restarted"});
      if(url.pathname.endsWith("/token")) {
        const renewed={...session(3600),refresh_token:"local-refresh-"+(++rotations),expires_in:3600,token_type:"bearer"};
        return route.fulfill({json:renewed});
      }
      if(url.pathname.endsWith("/user")) return route.fulfill({json:user});
      return route.fulfill({json:{email:user.email,subscription_status:"active",subscription_tier:"pro",api_calls_this_month:0}});
    });
    await flow.controller.locator('[data-testid="add-photos-input"]').setInputFiles(path.resolve(__dirname,"../../images/quickvint-upload-single.jpg"));
    await flow.worker.evaluate(()=>{
      const originalFetch=globalThis.fetch;
      globalThis.fetch=(url,options={})=>originalFetch(url,{...options,headers:{...options.headers,"x-test-worker":"before-stop"}});
    });
    await flow.restartWorker(()=>storagePage.evaluate(value=>chrome.storage.local.set({supabaseSession:value}),session(seconds)));
    const result=await sendFromExtensionContent(flow.context,flow.controller,{type:"GET_ACCESS_TOKEN"});
    await expect.poll(()=>flow.worker.evaluate(async()=>({id:(await getStoredSession())?.user?.id,busy:Boolean(tokenRefreshPromise)}))).toEqual({id:user.id,busy:false});
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    console.log(JSON.stringify({seconds,requests,hasAccess:Boolean(result?.access_token),rotations}));
    expect(result?.access_token).toBeTruthy();
    expect(requests.filter(request=>request.path.endsWith("/token") && request.worker==="restarted").length).toBe(seconds > 300 ? 0 : 1);
  } finally {await flow.close();}
});

test("delayed startup restoration cannot replace the account selected by the callback", async () => {
  const flow = await openBatchJourney({session:session(3600)});
  let release;
  const gate = new Promise(resolve => { release=resolve; });
  let entered=false;
  let held=true;
  const other={...session(3600),user:{id:"00000000-0000-4000-8000-000000000002",email:"other@example.invalid"}};
  try {
    await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/**", async route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith("/user")) {
        if(held){entered=true;await gate;}
        return route.fulfill({json:user});
      }
      return route.fulfill({json:{email:user.email,subscription_status:"active",subscription_tier:"pro"}});
    });
    await flow.worker.evaluate(value=>chrome.storage.local.set({supabaseSession:value}),session(3600));
    await flow.restartWorker();
    await expect.poll(()=>entered).toBe(true);
    // The callback writes product storage directly before AUTH_UPDATED.
    await flow.worker.evaluate(value=>chrome.storage.local.set({supabaseSession:value}),other);
    held=false;release();
    await flow.worker.evaluate(async()=>{await supabaseClient.auth.getSession();await getStoredSession();});
    await expect.poll(()=>flow.worker.evaluate(async()=>(await getStoredSession())?.user?.id)).toBe(other.user.id);
  } finally {release();await flow.close();}
});
test("an SDK renewal outside the coordinator cannot replace a newly selected account", async () => {
  const flow = await openBatchJourney({session:session(3600)});
  let release;const gate=new Promise(resolve=>{release=resolve;});
  let entered=false;
  const other={...session(3600),user:{id:"00000000-0000-4000-8000-000000000002",email:"other@example.invalid"}};
  try {
    await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/**", async route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith("/token")) {entered=true;await gate;return route.fulfill({json:{...session(3600),refresh_token:"local-rotated",expires_in:3600,token_type:"bearer"}});}
      if(url.pathname.endsWith("/user"))return route.fulfill({json:user});
      return route.fulfill({json:{email:user.email,subscription_status:"active",subscription_tier:"pro"}});
    });
    await flow.worker.evaluate(value=>supabaseClient.auth.setSession(value),session(3600));
    const pending=flow.worker.evaluate(()=>supabaseClient.auth.refreshSession());
    await expect.poll(()=>entered).toBe(true);
    await flow.worker.evaluate(value=>chrome.storage.local.set({supabaseSession:value}),other);
    release();await pending;
    await expect.poll(()=>flow.worker.evaluate(async()=>(await getStoredSession())?.user?.id)).toBe(other.user.id);
  }finally{release();await flow.close();}
});

test("a forced API retry joining cold startup receives a renewed token", async () => {
  const original=session(3600);
  const flow=await openBatchJourney({session:original});
  let release; const gate=new Promise(resolve=>{release=resolve;});
  let entered=false, held=true, rotations=0;
  try {
    await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/**",async route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith("/user")){
        if(held){entered=true;await gate;}
        return route.fulfill({json:user});
      }
      if(url.pathname.endsWith("/token")){
        rotations++;
        return route.fulfill({json:{...session(7200),refresh_token:"local-new",expires_in:7200,token_type:"bearer"}});
      }
      return route.fulfill({json:{subscription_status:"active",subscription_tier:"pro"}});
    });
    await flow.restartWorker();
    await expect.poll(()=>entered).toBe(true);
    const retry=sendFromExtensionContent(flow.context,flow.controller,{type:"GET_ACCESS_TOKEN",forceRefresh:true,expectedUserId:user.id,
      authContext:{operationId:"startup-force-retry",entryPoint:"generate"}});
    await expect.poll(async()=>{
      await flow.worker.evaluate(()=>AutoListerTelemetry.flush());
      return flow.events.some(event=>event.event==="auth_action_result" &&
        event.context.operationId==="startup-force-retry" && event.context.resultStatus==="refresh_joined");
    }).toBe(true);
    held=false;release();
    const response=await retry;
    expect(response.access_token).toBeTruthy();
    expect(response.access_token).not.toBe(original.access_token);
    expect(rotations).toBe(1);
  }finally{release();await flow.close();}
});
test("cold startup reconnects through normal messaging and retains the photo",async()=>{
  const flow=await openBatchJourney({session:session(3600)});
  let disconnected=true, failures=0;
  try{
    await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/**",async route=>{
      const url=new URL(route.request().url());
      if(disconnected&&url.pathname.startsWith("/auth/")){failures++;return route.abort("internetdisconnected");}
      if(url.pathname.endsWith("/token"))return route.fulfill({json:{...session(7200),refresh_token:"local-new",expires_in:7200,token_type:"bearer"}});
      if(url.pathname.endsWith("/user"))return route.fulfill({json:user});
      return route.fulfill({json:{subscription_status:"active",subscription_tier:"pro"}});
    });
    await flow.controller.locator('[data-testid="add-photos-input"]').setInputFiles(path.resolve(__dirname,"../../images/quickvint-upload-single.jpg"));
    await flow.worker.evaluate(value=>chrome.storage.local.set({supabaseSession:value}),session(60));
    await flow.restartWorker();
    await expect.poll(()=>failures).toBeGreaterThan(0);
    await expect.poll(()=>flow.worker.evaluate(()=>Boolean(tokenRefreshPromise))).toBe(false);
    expect(await flow.worker.evaluate(async()=>(await getStoredSession()).refresh_token)).toBe("local-refresh-0");
    disconnected=false;
    const response=await sendFromExtensionContent(flow.context,flow.controller,{type:"GET_ACCESS_TOKEN",forceRefresh:true,expectedUserId:user.id});
    expect(response.access_token).toBeTruthy();
    expect(await flow.worker.evaluate(async()=>(await getStoredSession()).refresh_token)).toBe("local-new");
    await expect(flow.controller.locator('[data-testid="media-upload-grid"] img')).toHaveCount(1);
    expect(flow.requests).toHaveLength(0);
  }finally{await flow.close();}
});
test("a temporary SDK session-read failure still gets the existing refresh retry",async()=>{
  test.setTimeout(90000);
  const flow=await openBatchJourney({session:session(3600)});
  let calls=0;
  try{
    await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/**",async route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith("/user"))return route.fulfill({json:user});
      if(url.pathname.endsWith("/token")){
        if(++calls<=8)return route.abort("internetdisconnected");
        return route.fulfill({json:{...session(7200),refresh_token:"local-new",expires_in:7200,token_type:"bearer"}});
      }
      return route.fulfill({json:{subscription_status:"active",subscription_tier:"pro"}});
    });
    await flow.worker.evaluate(value=>chrome.storage.local.set({supabaseSession:value}),session(60));
    const response=await sendFromExtensionContent(flow.context,flow.controller,{type:"GET_ACCESS_TOKEN",forceRefresh:true,expectedUserId:user.id});
    expect(response?.access_token).toBeTruthy();
    expect(await flow.worker.evaluate(async()=>(await getStoredSession()).refresh_token)).toBe("local-new");
  }finally{await flow.close();}
});
test("startup validation failure preserves the usable session refresh schedule",async()=>{
  const flow=await openBatchJourney({session:session(3600)});
  let failed=false;
  try{
    await flow.context.route("https://jqloiovdwjaornnfvmyu.supabase.co/**",async route=>{
      if(new URL(route.request().url()).pathname.startsWith("/auth/")){failed=true;return route.abort("internetdisconnected");}
      return route.abort();
    });
    await flow.restartWorker();
    await expect.poll(()=>failed).toBe(true);
    await expect.poll(()=>flow.worker.evaluate(()=>Boolean(tokenRefreshPromise))).toBe(false);
    expect(await flow.worker.evaluate(()=>Boolean(tokenRefreshTimeout))).toBe(true);
    expect(await flow.worker.evaluate(async()=>(await getStoredSession()).user.id)).toBe(user.id);
  }finally{await flow.close();}
});
