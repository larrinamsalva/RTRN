import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('../index.html', import.meta.url));
const beachAssetName='a_crisp_sunlit_photorealistic_beach_lounge_scene.png';
const beachAsset=await readFile(new URL('../'+beachAssetName,import.meta.url));
const mountainAssetName='golden_mountain_lake_lounge.png';
const mountainAsset=await readFile(new URL('../'+mountainAssetName,import.meta.url));
const porchAssetName='a_photorealistic_warmly_lit_countryside_front_por.png';
const porchAsset=await readFile(new URL('../'+porchAssetName,import.meta.url));
const gazeboAssetName='a_highly_detailed_photorealistic_cozy_garden_gaz.png';
const gazeboAsset=await readFile(new URL('../'+gazeboAssetName,import.meta.url));
const brandedGazeboAssetName='a_highly_detailed_photorealistic_richly_lit_gard.png';
const brandedGazeboAsset=await readFile(new URL('../'+brandedGazeboAssetName,import.meta.url));
const newAssets = new Map();
for(const filename of ['sunset_cannabis_field_lounge.png','midnight_lounge_cannabis_studio.png','moonlit_purple_gold_garden_lounge.png'])newAssets.set('/'+filename,await readFile(new URL('../'+filename,import.meta.url)));
const server = createServer((req,res) => {
  if(newAssets.has(req.url)){res.writeHead(200,{'Content-Type':'image/png'});res.end(newAssets.get(req.url));return}
  if(req.url==='/'+beachAssetName){res.writeHead(200,{'Content-Type':'image/png'});res.end(beachAsset);return}
  if(req.url==='/'+mountainAssetName){res.writeHead(200,{'Content-Type':'image/png'});res.end(mountainAsset);return}
  if(req.url==='/'+porchAssetName){res.writeHead(200,{'Content-Type':'image/png'});res.end(porchAsset);return}
  if(req.url==='/'+gazeboAssetName){res.writeHead(200,{'Content-Type':'image/png'});res.end(gazeboAsset);return}
  if(req.url==='/'+brandedGazeboAssetName){res.writeHead(200,{'Content-Type':'image/png'});res.end(brandedGazeboAsset);return}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)
});
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
  await page.waitForFunction(()=>{const img=document.getElementById('stageBackgroundImage');return img?.complete&&img.naturalWidth>0&&getComputedStyle(img).visibility==='visible'});
  assert(await page.locator('#stageBackgroundError').isHidden(),'Mobile scene background must load without error');
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
  for(const id of ['original-podcast','original-live','news','cozy-1','cozy-2','cozy-3','cozy-4','window-washers','window-grandma','window-robber','window-sunset','window-weather','beach','mountain','porch','gazebo','gazebo-branded','purple-haze','midnight','stars'])assert(ids.includes(id),'Missing '+id);
  await desktop.locator('[data-scene="window-weather"]').click();
  await desktop.locator('#rtrnBroadcastTab').click();
  const stageImage=desktop.locator('#stageBackgroundImage');
  await desktop.waitForFunction(()=>{const img=document.getElementById('stageBackgroundImage');return img?.complete&&img.naturalWidth>0&&getComputedStyle(img).visibility==='visible'});
  const before=await stageImage.getAttribute('src');
  assert(before,'Weather scene must have a source image');
  await desktop.locator('#weatherSelect').selectOption('rain');
  await desktop.waitForFunction(previous=>{const img=document.getElementById('stageBackgroundImage');return img?.getAttribute('src')!==previous&&img?.complete&&img.naturalWidth>0&&getComputedStyle(img).visibility==='visible'},before);
  assert.notEqual(await stageImage.getAttribute('src'),before);
  assert(await desktop.locator('#stageBackgroundError').isHidden(),'Weather scene image must load without error');
  for(const id of ['window-washers','window-grandma','window-robber','window-sunset','window-weather']){
    await desktop.locator('[data-scene="'+id+'"]').click();
    await desktop.locator('#rtrnSecondBox').waitFor({state:'visible'});
    assert(await desktop.locator('#cameraBox').isVisible(),'Host seat missing: '+id);
    const host=await desktop.locator('#cameraBox').boundingBox(),guest=await desktop.locator('#rtrnSecondBox').boundingBox();
    assert(host.x+host.width<guest.x,'Host and guest overlap: '+id);
    await desktop.locator('#rtrnSoloQuick').click();
    assert(!(await desktop.locator('#rtrnSecondBox').isVisible()),'Solo must hide guest: '+id);
    await desktop.locator('#rtrnDuoQuick').click();
    assert(await desktop.locator('#rtrnSecondBox').isVisible(),'Duo must restore guest: '+id);
  }
  await desktop.locator('#weatherSelect').selectOption('snow');
  assert(await desktop.locator('#rtrnSecondBox').isVisible(),'Snow keeps guest seat');
  await desktop.locator('#weatherSelect').selectOption('rain');
  assert(await desktop.locator('#rtrnSecondBox').isVisible(),'Rain keeps guest seat');
  const beachThumb=desktop.locator('[data-scene="beach"] img');
  await desktop.waitForFunction(()=>{const img=document.querySelector('[data-scene="beach"] img');return img?.complete&&img.naturalWidth>=1200&&img.naturalHeight>=650});
  assert((await beachThumb.getAttribute('src')).endsWith(beachAssetName));
  const mountainThumb=desktop.locator('[data-scene="mountain"] img');
  await desktop.waitForFunction(()=>{const img=document.querySelector('[data-scene="mountain"] img');return img?.complete&&img.naturalWidth>=1200&&img.naturalHeight>=650});
  assert((await mountainThumb.getAttribute('src')).endsWith(mountainAssetName));
  const porchThumb=desktop.locator('[data-scene="porch"] img');
  await desktop.waitForFunction(()=>{const img=document.querySelector('[data-scene="porch"] img');return img?.complete&&img.naturalWidth>=1200&&img.naturalHeight>=650});
  assert((await porchThumb.getAttribute('src')).endsWith(porchAssetName));
  await desktop.waitForFunction(()=>{const img=document.querySelector('[data-scene="gazebo"] img');return img?.complete&&img.naturalWidth>=1200&&img.naturalHeight>=650});
  await desktop.waitForFunction(()=>{const img=document.querySelector('[data-scene="gazebo-branded"] img');return img?.complete&&img.naturalWidth>=1200&&img.naturalHeight>=650});
  for(const id of ['gazebo','gazebo-branded']){
  await desktop.locator('[data-scene="'+id+'"]').click();
  await desktop.locator('#rtrnSeatPlaceholder3').waitFor({state:'visible'});
  assert(await desktop.locator('#cameraBox').isVisible());
  assert(await desktop.locator('#rtrnSecondBox').isVisible());
  assert(await desktop.locator('#rtrnSeatPlaceholder4').isHidden());
  assert(await desktop.locator('#rtrnSeatPlaceholder5').isHidden());
  await desktop.locator('#rtrnSoloQuick').click();
  assert(await desktop.locator('#rtrnSeatPlaceholder3').isHidden());
  await desktop.locator('#rtrnDuoQuick').click();
  assert(await desktop.locator('#rtrnSeatPlaceholder3').isVisible());
  }
  for(const [id,count,frames] of [['purple-haze',2,2],['midnight',4,3],['stars',4,4]]){
    await desktop.waitForFunction(id=>{const img=document.querySelector('[data-scene="'+id+'"] img');return img?.complete&&img.naturalWidth>=1200&&img.naturalHeight>=650},id);
    await desktop.locator('[data-scene="'+id+'"]').click();
    const seatIds=['cameraBox','rtrnSecondBox','rtrnSeatPlaceholder3','rtrnSeatPlaceholder4','rtrnSeatPlaceholder5'];
    await desktop.waitForFunction(({seatIds,count})=>seatIds.filter(id=>{const el=document.getElementById(id);return !el.hidden&&getComputedStyle(el).display!=='none'}).length===count,{seatIds,count});
    await desktop.waitForFunction(n=>document.querySelectorAll('#tablePortraits .table-photo').length===n,frames);
    const boxes=await Promise.all(seatIds.slice(0,count).map(id=>desktop.locator('#'+id).boundingBox()));
    for(let i=1;i<boxes.length;i++)assert(boxes[i-1].x+boxes[i-1].width<boxes[i].x,'Overlapping seats: '+id);
    await desktop.locator('#rtrnSoloQuick').click();
    for(const seat of seatIds.slice(1))assert(await desktop.locator('#'+seat).isHidden(),'Solo must hide '+seat);
    await desktop.locator('#rtrnDuoQuick').click();
    await desktop.waitForFunction(({seatIds,count})=>seatIds.filter(id=>{const el=document.getElementById(id);return !el.hidden&&getComputedStyle(el).display!=='none'}).length===count,{seatIds,count});
  }
  for(const id of ['beach','mountain','porch']){
    await desktop.locator('[data-scene="'+id+'"]').click();
    await desktop.locator('#rtrnDuoQuick').click();
    assert(await desktop.locator('#rtrnSecondBox').isVisible());
    await desktop.locator('#rtrnSoloQuick').click();
    assert(!(await desktop.locator('#rtrnSecondBox').isVisible()));
  }
  for(const [id,count] of [['cozy-1',1],['cozy-2',2],['cozy-3',3],['cozy-4',4],['beach',2],['mountain',2],['porch',2],['gazebo',3],['gazebo-branded',3],['original-podcast',1],['original-live',1],['news',2]]){
    await desktop.locator('[data-scene="'+id+'"]').click();
    await desktop.waitForFunction(()=>document.querySelectorAll('#tablePortraits .table-photo').length===2);
    if(count){await desktop.waitForFunction(n=>['cameraBox','rtrnSecondBox','rtrnSeatPlaceholder3','rtrnSeatPlaceholder4'].filter(id=>{const e=document.getElementById(id);return !e.hidden&&getComputedStyle(e).display!=='none'}).length===n,count);}
  }
  for(const [scene,left,right] of [['cozy-1',8.5,88.5],['cozy-2',2,94.5]]){
    await desktop.locator('[data-scene="'+scene+'"]').click();
    await desktop.waitForFunction(()=>document.querySelectorAll('#tablePortraits .table-photo').length===2);
    const frames=await desktop.locator('#tablePortraits .table-photo').evaluateAll(nodes=>nodes.map(n=>({left:parseFloat(n.style.left),border:getComputedStyle(n,'::after').borderTopStyle})));
    assert.deepEqual(frames.map(f=>f.left),[left,right],'Photos should sit on the outer tables');
    assert(frames.every(f=>f.border==='ridge'),'Both end-table photos should have raised gold borders');
  }
  await desktop.locator('[data-scene="cozy-3"]').click();
  assert(await desktop.locator('#rtrnSeatPlaceholder3').isVisible(),'Three-seat sofa must show its middle guest');
  assert(await desktop.locator('#rtrnSeatPlaceholder4').isHidden(),'Three-seat sofa must not show a fourth guest');
  assert(await desktop.locator('#stage').evaluate(el=>el.classList.contains('rtrn-portrait-seats')),'Cozy 3 portrait frames must be enabled');
  await desktop.locator('#rtrnSoloQuick').click();
  assert(await desktop.locator('#rtrnSeatPlaceholder3').isHidden(),'Solo must hide the middle guest');
  await desktop.locator('#rtrnDuoQuick').click();
  assert(await desktop.locator('#rtrnSeatPlaceholder3').isVisible(),'Guest mode must restore the middle guest');
  await desktop.locator('[data-scene="cozy-4"]').click();
  assert(await desktop.locator('#stage').evaluate(el=>el.classList.contains('rtrn-portrait-seats')),'Cozy 4 portrait frames must be enabled');
  // Check actual stage-relative positions, not viewport pixels.
  for(const [scene,count,width] of [['cozy-3',3,21],['cozy-4',4,16]]){
    await desktop.locator('[data-scene="'+scene+'"]').click();
    await desktop.waitForFunction(({count,width})=>['cameraBox','rtrnSecondBox','rtrnSeatPlaceholder3','rtrnSeatPlaceholder4'].slice(0,count).every(id=>{const e=document.getElementById(id);return !e.hidden&&parseFloat(e.style.width)===width;}),{count,width});
    const frames=await desktop.locator('#tablePortraits .table-photo').evaluateAll(nodes=>nodes.map(n=>({left:parseFloat(n.style.left),right:parseFloat(n.style.left)+parseFloat(n.style.width),border:getComputedStyle(n,'::after').borderTopStyle})));
    assert.equal(frames.length,2);assert(frames[0].right<10&&frames[1].left>90,'Small photos belong on outer end tables');assert(frames.every(f=>f.border==='ridge'),'Small photos need visible gold frame molding');
  }

  await desktop.locator('#rtrnSoloQuick').click();
  assert(!(await desktop.locator('#rtrnSecondBox').isVisible()));
  assert(!(await desktop.locator('#rtrnSeatPlaceholder3').isVisible()));
  await desktop.locator('#rtrnDuoQuick').click();
  assert(await desktop.locator('#rtrnSeatPlaceholder4').isVisible());
  for(const n of [3,4]){
    assert.equal(await desktop.locator('#rtrnSeatPlaceholder'+n+' video').count(),1,'Every seat has a video element');
    assert.match(await desktop.locator('#rtrnSeatPlaceholder'+n).innerText(),/GUEST.*VIDEO/);
  }
  await desktop.context().grantPermissions(['camera']);
  await desktop.locator('#rtrnBroadcastTab').click();
  for(const n of [3,4]){
    await desktop.locator('#rtrnSeatRefresh'+n).click();
    await desktop.waitForFunction(n=>document.getElementById('rtrnSeatCamera'+n).options.length>1,n);
    await desktop.locator('#rtrnSeatCamera'+n).selectOption({index:1});
    await desktop.locator('#rtrnSeatStart'+n).click();
    await desktop.waitForFunction(n=>{const v=document.getElementById('rtrnSeatVideo'+n);return !v.hidden&&v.readyState>=2},n,{timeout:15000});
    await desktop.locator('#rtrnSeatStop'+n).click();
    assert(await desktop.locator('#rtrnSeatVideo'+n).isHidden());
  }
  await desktop.locator('#rtrnSoloQuick').click();
  assert(await desktop.locator('#rtrnSeatPlaceholder3').isHidden());
  assert(await desktop.locator('#rtrnSeatPlaceholder4').isHidden());
  await desktop.locator('#rtrnDuoQuick').click();
  assert(await desktop.locator('#rtrnSeatPlaceholder3').isVisible());
  assert(await desktop.locator('#rtrnSeatPlaceholder4').isVisible());
  await desktop.locator('#rtrnPhotoTab').click();
  const upload=desktop.getByLabel('Upload Left desk / table photo',{exact:true});
  await upload.setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR2sAAAAASUVORK5CYII=','base64')});
  await desktop.waitForFunction(()=>{const img=document.querySelector('#tablePortraits [data-frame-id="cozy4-table-left"] img');return img?.complete&&img.naturalWidth>0});
  await desktop.reload();
  await desktop.waitForFunction(()=>{const img=document.querySelector('#tablePortraits [data-frame-id="cozy4-table-left"] img');return img?.complete&&img.naturalWidth>0});
  await desktop.locator('#sceneFold > summary').click();
  await desktop.locator('#newSceneFiles').setInputFiles({name:'five-seat-test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR2sAAAAASUVORK5CYII=','base64')});
  await desktop.locator('#addCustomScenes').click();
  const custom=desktop.locator('[data-scene^="custom-scene-"]').first();
  await custom.click();
  await desktop.locator('#rtrnBroadcastTab').click();
  const seatIds=['cameraBox','rtrnSecondBox','rtrnSeatPlaceholder3','rtrnSeatPlaceholder4','rtrnSeatPlaceholder5'];
  for(const n of [1,2,3,4,5]){
    await desktop.locator('#rtrnCustomSeatCount').selectOption(String(n));
    await desktop.waitForFunction(({seatIds,n})=>seatIds.filter(id=>{const el=document.getElementById(id);return !el.hidden&&getComputedStyle(el).display!=='none'}).length===n,{seatIds,n});
  }
  await desktop.locator('#rtrnSeatRefresh5').click();
  await desktop.waitForFunction(()=>document.getElementById('rtrnSeatCamera5').options.length>1);
  await desktop.locator('#rtrnSeatCamera5').selectOption({index:1});
  await desktop.locator('#rtrnSeatStart5').click();
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSeatVideo5');return !v.hidden&&v.readyState>=2},{},{timeout:15000});
  await desktop.locator('#rtrnSoloQuick').click();
  assert(await desktop.locator('#rtrnSeatPlaceholder5').isHidden());
  assert(await desktop.locator('#rtrnSeatVideo5').evaluate(v=>!v.srcObject));
  await desktop.locator('#rtrnDuoQuick').click();
  assert(await desktop.locator('#rtrnSeatPlaceholder5').isVisible());
  await desktop.reload();
  await desktop.waitForFunction(()=>document.getElementById('rtrnCustomSeatCount').value==='5'&&!document.getElementById('rtrnSeatPlaceholder5').hidden);
  console.log('Custom scene seating from one to five, fifth camera, solo and saved count passed.');
  // Reload intentionally collapses the scene selector; open it as a user would.
  assert.equal(await desktop.locator('#sceneFold').evaluate(el=>el.open),false);
  await desktop.locator('#sceneFold > summary').click();
  await desktop.locator('#sceneFold [data-scene="cozy-1"]').waitFor({state:'visible'});
  for(const scene of ['cozy-1','cozy-2','original-podcast','original-live']){
    await desktop.locator('[data-scene="'+scene+'"]').click();
    await desktop.waitForFunction(()=>document.querySelectorAll('#tablePortraits .table-photo').length===2&&document.getElementById('stage').classList.contains('rtrn-gold-table-frames'));
    const frames=await desktop.locator('#tablePortraits .table-photo').evaluateAll(nodes=>nodes.map(n=>({x:parseFloat(n.style.left),border:getComputedStyle(n,'::after').borderTopStyle})));
    assert(frames.every(f=>f.border==='ridge'),'Gold picture frame molding must be visible');
    assert(frames[0].x<30&&frames[1].x>75,'Frames belong on outer desk or side tables');
    if(scene.startsWith('original-'))await desktop.waitForFunction(()=>parseFloat(document.getElementById('cameraBox').style.width)===22);
  }
  console.log('Desktop workspace, scenic sets, tabletop photo and seat checks passed.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
