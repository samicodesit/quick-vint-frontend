const {test,expect}=require('@playwright/test');
const path=require('node:path');
const fs=require('node:fs');
const api=process.env.AUTOLISTER_API_PATH||path.resolve(__dirname,'../../../quick-vint-api');
test('batch report explains pause, duration, manual recovery and unknown legacy detail on desktop and mobile',async({page})=>{
  const script=path.join(api,'public/admin-issues.js');
  test.skip(!fs.existsSync(script),'Coordinated admin checkout unavailable');
  await page.setContent('<main id="modal" style="max-width:900px;margin:auto;font:16px system-ui"></main>');
  await page.evaluate(()=>{
    const pause={occurredAt:'2026-10-21T10:01:00Z',errorCode:'HOST_PHOTO_CONFIRMATION_TIMEOUT',phase:'host_photo_confirmation',durationMs:60000,itemDurationMs:68000,itemIndex:3,completedCount:2,total:4,expectedPhotoCount:10,confirmedPhotoCount:8,visiblePhotoCount:10,pendingCount:1,failedPhotoCount:1,previewPhotoCount:0,duplicatePhotoCount:0,unrecognizedPhotoCount:0,documentVisible:false,navigatorOnline:true};
    window.fetchAPI=async()=>({issue:{id:'a423926a-35a6-4bf5-8027-8ab335c71110',event:'batch_paused',status:'open',examples:[]},operations:[],batches:[{
      batchId:'same-batch',recoveryStatus:'recovered',evidenceAvailable:true,incomplete:false,pauses:[pause],completion:{occurredAt:'2026-10-21T10:05:00Z',completedCount:4,total:4,recoveryAgeMs:300000,activeDurationMs:180000,pauseDurationMs:120000,timingComplete:true,resumeTrigger:'user_resume',resumeCount:1}},
      {batchId:'legacy-batch',recoveryStatus:'unproven',evidenceAvailable:false,incomplete:true,pauses:[{message:'<img src=x onerror="window.__xss=true">'}],completion:null}]});
    window.openModal=(_title,html)=>document.getElementById('modal').innerHTML=html;
  });
  await page.addScriptTag({path:script});
  await page.evaluate(()=>AutoListerIssues.detail('a423926a-35a6-4bf5-8027-8ab335c71110'));
  const report=page.locator('[data-batch-report]').first();
  await expect(report).toContainText('4/4 drafts ready for review');
  await expect(report).toContainText('Photos confirmed: 8/10');
  await expect(report).toContainText('Photo confirmation timed out');
  await expect(report).toContainText('Total elapsed: 300.0 s');
  await expect(report).toContainText('User clicked Resume');
  await expect(page.locator('[data-batch-report]').last()).toContainText('Photo confirmation detail not recorded');
  expect(await page.evaluate(()=>window.__xss)).toBeUndefined();
  for(const width of [1200,390]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:test.info().outputPath(`batch-report-${width}.png`),fullPage:true});
  }
});
