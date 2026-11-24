import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('../index.html', import.meta.url));
const server = createServer((req,res) => {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser = await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const url = 'http://127.0.0.1:'+server.address().port;
try {
  const mobile = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce',acceptDownloads:true});
  const page = await mobile.newPage();
  const errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.locator('#rtrnRecordQuick').waitFor({state:'visible'});
  assert.equal(await page.locator('details[open]').count(),0,'All expandable sections start closed on mobile');
  const sceneSummary = page.locator('#sceneFold > summary');
  await sceneSummary.tap();
  assert.equal(await page.locator('#sceneFold').evaluate(el=>el.open),true,'Tapping the scene arrow opens the section');
  await sceneSummary.tap();
  assert.equal(await page.locator('#sceneFold').evaluate(el=>el.open),false,'Tapping again closes the section');
  const startButton=page.locator('#rtrnRecordQuick'), stopButton=page.locator('#rtrnStopRecordQuick');
  assert(await startButton.isEnabled());
  assert(await stopButton.isVisible());
  assert(await stopButton.isDisabled());
  const stageRect=await page.locator('.stage-shell').boundingBox(), recordRect=await page.locator('.rtrn-record-top').boundingBox();
  assert(recordRect.y>=stageRect.y+stageRect.height-2 && recordRect.y-stageRect.y-stageRect.height<30,'Record controls immediately below preview');
  await startButton.tap();
  await stopButton.waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.getElementById('rtrnStopRecordQuick').disabled,{},{timeout:15000});
  assert(await startButton.isDisabled());
  await page.waitForTimeout(1300);
  await stopButton.tap();
  await page.waitForFunction(()=>!document.getElementById('rtrnRecordQuick').disabled,{},{timeout:15000});
  assert(await stopButton.isDisabled());
  assert(await page.locator('#rtrnVideoDownload').getAttribute('download'),'Finished recording has a downloadable file');
  const dock = page.locator('#mobileDock');
  const targets = [['photos','#rtrnPhotoArea'],['library','#rtrnMusicArea'],['reactions','#audienceFold'],['scenes','#sceneFold'],['settings','#rtrnBroadcastArea'],['stage','.stage-panel']];
  for(const [target,selector] of targets){
    const button = dock.locator('[data-mobile-target="'+target+'"]');
    await button.tap();
    await page.waitForFunction(({selector,target})=>{
      const el=document.querySelector(selector),b=document.querySelector('[data-mobile-target="'+target+'"]');
      if(!el || !b || b.getAttribute('aria-pressed')!=='true' || el.hidden || el.inert || (el.tagName==='DETAILS'&&!el.open))return false;
      const r=el.getBoundingClientRect();return r.bottom>0 && r.top<innerHeight;
    },{selector,target},{timeout:6000});
    if(target==='photos'){
      await page.locator('#photoSavedFold summary').tap();
      assert(await page.locator('#photoUpload').isVisible(),'photo upload is accessible');
    }
    if(target==='library')assert(await page.locator('#musicUpload').isVisible(),'music upload is accessible');
    if(target==='reactions')assert(await page.locator('#birdsEffectButton').isVisible(),'bird effect is accessible');
    if(target==='stage')assert(await page.locator('#rtrnRecordQuick').isVisible(),'record shortcut is accessible');
    console.log('Mobile navigation passed:',target);
  }
  assert.deepEqual(errors,[],'No uncaught browser errors');
  await mobile.close();
  const desktop = await browser.newPage({viewport:{width:1440,height:900}});
  await desktop.goto(url);
  assert.equal(await desktop.locator('details[open]').count(),0,'All expandable sections start closed on desktop');
  await desktop.locator('#rtrnPhotoTab').click();
  assert(await desktop.locator('#rtrnPhotoArea').isVisible());
  await desktop.locator('#rtrnMusicTab').click();
  assert(await desktop.locator('#rtrnMusicArea').isVisible());
  await desktop.reload();
  assert.equal(await desktop.locator('details[open]').count(),0,'Remembered workspaces still start collapsed after reload');
  await desktop.locator('#mediaLibraryFold > summary').click();
  assert.equal(await desktop.locator('#mediaLibraryFold').evaluate(el=>el.open),true);
  await desktop.locator('#mediaLibraryFold > summary').click();
  assert.equal(await desktop.locator('#mediaLibraryFold').evaluate(el=>el.open),false);
  assert(await desktop.locator('#rtrnRecordQuick').isVisible());
  await desktop.locator('#sceneFold > summary').click();
  const ids=await desktop.locator('#sceneList [data-scene]').evaluateAll(nodes=>nodes.map(n=>n.dataset.scene));
  assert.equal(ids.filter(id=>id.startsWith('holiday-')).length,0);
  for(const id of ['original-podcast','original-live','news','cozy-1','cozy-2','cozy-3','cozy-4','window-washers','window-grandma','window-robber','window-sunset','window-weather','beach','mountain'])assert(ids.includes(id),'Missing '+id);
  await desktop.locator('[data-scene="window-weather"]').click();
  await desktop.locator('#rtrnBroadcastTab').click();
  const before=await desktop.locator('#background').evaluate(el=>el.style.backgroundImage);
  await desktop.locator('#weatherSelect').selectOption('rain');
  assert.notEqual(await desktop.locator('#background').evaluate(el=>el.style.backgroundImage),before);
  for(const id of ['beach','mountain']){
    await desktop.locator('[data-scene="'+id+'"]').click();
    await desktop.locator('#rtrnDuoQuick').click();
    assert(await desktop.locator('#rtrnSecondBox').isVisible());
    await desktop.locator('#rtrnSoloQuick').click();
    assert(!(await desktop.locator('#rtrnSecondBox').isVisible()));
  }
  for(const [id,count] of [['cozy-1',1],['cozy-2',2],['cozy-3',2],['cozy-4',4],['beach',2],['mountain',2],['original-podcast',1],['original-live',1],['news',0]]){
    await desktop.locator('[data-scene="'+id+'"]').click();
    await desktop.waitForFunction(()=>document.querySelectorAll('#tablePortraits .table-photo').length===2);
    if(count){await desktop.waitForFunction(n=>['cameraBox','rtrnSecondBox','rtrnSeatPlaceholder3','rtrnSeatPlaceholder4'].filter(id=>{const e=document.getElementById(id);return !e.hidden&&getComputedStyle(e).display!=='none'}).length===n,count);}
  }
  await desktop.locator('[data-scene="cozy-4"]').click();
  await desktop.locator('#rtrnSoloQuick').click();
  assert(!(await desktop.locator('#rtrnSecondBox').isVisible()));
  assert(!(await desktop.locator('#rtrnSeatPlaceholder3').isVisible()));
  await desktop.locator('#rtrnDuoQuick').click();
  assert(await desktop.locator('#rtrnSeatPlaceholder4').isVisible());
  await desktop.locator('#rtrnPhotoTab').click();
  const upload=desktop.getByLabel('Upload Left desk / table photo',{exact:true});
  await upload.setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR2sAAAAASUVORK5CYII=','base64')});
  await desktop.waitForFunction(()=>!!document.querySelector('#tablePortraits [data-frame-id="cozy4-table-left"] img'));
  await desktop.reload();
  await desktop.waitForFunction(()=>!!document.querySelector('#tablePortraits [data-frame-id="cozy4-table-left"] img'));
  console.log('Desktop workspace, scenic sets, tabletop photo and seat checks passed.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
