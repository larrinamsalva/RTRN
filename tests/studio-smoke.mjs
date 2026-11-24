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
  console.log('Desktop workspace navigation passed.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
