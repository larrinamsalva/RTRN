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
const vintageAssets=new Map();
for(const filename of ['vintage_tea_room.jpg','vintage_good_old_days.jpg','dance_purple_club.png','dance_retro_disco.png'])vintageAssets.set('/'+filename,await readFile(new URL('../'+filename,import.meta.url)));
const server = createServer((req,res) => {
  if(vintageAssets.has(req.url)){res.writeHead(200,{'Content-Type':req.url.endsWith('.png')?'image/png':'image/jpeg'});res.end(vintageAssets.get(req.url));return}
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
  const startCam=page.locator('#rtrnCameraQuick'),stopCam=page.locator('#rtrnCameraStopQuick');
  const mixerRect=await page.locator('.rtrn-audio-mix').boundingBox(),cameraRect=await page.locator('.rtrn-camera-top').boundingBox();
  assert(cameraRect.y>=mixerRect.y+mixerRect.height-1&&cameraRect.y-mixerRect.y-mixerRect.height<24,'Camera controls immediately below mobile volume sliders');
  assert(await startCam.isEnabled());assert(await stopCam.isDisabled());
  await startCam.tap();
  await page.waitForFunction(()=>{const video=document.getElementById('cameraVideo');return video.srcObject?.getVideoTracks().some(t=>t.readyState==='live')&&video.readyState>=2&&!document.getElementById('rtrnCameraStopQuick').disabled});
  assert(await startCam.isDisabled());
  await stopCam.tap();
  await page.waitForFunction(()=>!document.getElementById('cameraVideo').srcObject&&!document.getElementById('rtrnCameraQuick').disabled);
  assert(await stopCam.isDisabled());
  assert(await page.locator('#rtrnAudioSetup').evaluate(el=>!el.open),'Audio setup starts collapsed');
  await page.locator('#rtrnVoiceMinus').tap();
  assert.equal(await page.locator('#rtrnVoiceLevel').textContent(),'95%');
  await page.locator('#rtrnVoicePlus').tap();
  assert.equal(await page.locator('#rtrnVoiceLevel').textContent(),'100%');
  await page.locator('#rtrnMusicPlus').tap();
  assert.equal(await page.locator('#rtrnMusicLevel').textContent(),'55%');
  await page.locator('#rtrnMusicMinus').tap();
  assert.equal(await page.locator('#rtrnMusicLevel').textContent(),'50%');
  await page.locator('#rtrnAudioSetup summary').tap();
  assert(await page.locator('#rtrnAudioInput').isVisible());
  await page.locator('#rtrnAudioMicTest').tap();
  await page.waitForFunction(()=>document.getElementById('rtrnAudioMeter').value>0,null,{timeout:10000});
  await page.locator('#rtrnAudioMicStop').tap();
  assert.equal(await page.locator('#rtrnAudioMeter').evaluate(el=>el.value),0);
  await page.locator('#rtrnAudioSpeakerTest').tap();
  await page.waitForFunction(()=>document.getElementById('rtrnAudioStatus').textContent.includes('Test tone played'));
  await page.locator('#rtrnAudioSetup summary').tap();
  assert(await page.locator('#rtrnAudioSetup').evaluate(el=>!el.open));
  await startButton.tap();
  await stopButton.waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.getElementById('rtrnStopRecordQuick').disabled,{},{timeout:15000});
  assert(await startButton.isDisabled());
  const setVoice=async value=>page.locator('#rtrnVoiceVolume').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},String(value));
  await setVoice(100);
  await page.waitForFunction(()=>window.RTRNRecorder.voiceLevel()>.001,null,{timeout:10000});
  await setVoice(0);
  await page.waitForFunction(()=>window.RTRNRecorder.voiceLevel()<.00001,null,{timeout:5000});
  assert.equal(await page.locator('#rtrnVoiceLevel').textContent(),'0%');
  await setVoice(100);
  await page.waitForFunction(()=>window.RTRNRecorder.voiceLevel()>.001,null,{timeout:10000});
  assert.equal(await page.locator('#rtrnVoiceLevel').textContent(),'100%');
  assert.equal(await page.locator('#rtrnMusicVolume').inputValue(),'50','Voice slider must not change music');
  await page.waitForTimeout(1300);
  await stopButton.tap();
  await page.waitForFunction(()=>!document.getElementById('rtrnRecordQuick').disabled,{},{timeout:15000});
  assert(await stopButton.isDisabled());
  assert(await page.locator('#rtrnVideoDownload').getAttribute('download'),'Finished recording has a downloadable file');
  // Verify the actual downloadable file, not only the presence of its link.
  async function verifySeekable(p){
    return p.evaluate(async()=>{
      const source=document.getElementById('rtrnVideoDownload').href;
      const v=document.createElement('video');v.muted=true;v.playsInline=true;
      function wait(event){return new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Video '+event+' timed out')),10000);v.addEventListener(event,()=>{clearTimeout(t);resolve()},{once:true});v.addEventListener('error',()=>{clearTimeout(t);reject(Error('Video decode failed'))},{once:true})})}
      try{
        const loaded=wait('loadedmetadata');v.src=source;await loaded;
        if(!Number.isFinite(v.duration)||v.duration<=0)throw Error('Missing finite video duration');
        let seek=wait('seeked');v.currentTime=v.duration*.6;await seek;
        if(v.currentTime<=0)throw Error('Forward seek failed');
        seek=wait('seeked');v.currentTime=0;await seek;
        await v.play();await new Promise(r=>setTimeout(r,180));
        return v.currentTime>0&&!v.paused;
      }finally{v.pause();v.removeAttribute('src');v.load()}
    });
  }
  assert(await verifySeekable(page),'Downloaded mobile show supports rewind and replay');

  // The library must have a real persisted cover even when the phone cannot
  // automatically extract a thumbnail from a MediaRecorder download.
  await page.waitForFunction(()=>document.getElementById('rtrnReviewPlayer').poster.startsWith('data:image/jpeg'));
  const cover=await page.locator('#rtrnReviewPlayer').getAttribute('poster');
  const storedCover=await page.evaluate(async()=>{
    const db=await new Promise((ok,no)=>{const r=indexedDB.open('RTRN_Saved_Shows_V6',1);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
    try{const items=await new Promise((ok,no)=>{const r=db.transaction('shows').objectStore('shows').getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});return items[0]?.poster;}finally{db.close()}
  });
  assert.equal(storedCover,cover,'Saved show cover survives browser storage');
  const coverInfo=await page.evaluate(async url=>{
    const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=48;canvas.height=27;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,48,27);
    const data=ctx.getImageData(0,0,48,27).data;const colors=new Set();
    for(let i=0;i<data.length;i+=4)colors.add([data[i],data[i+1],data[i+2]].join(','));
    return {width:image.naturalWidth,colors:colors.size};
  },cover);
  assert.equal(coverInfo.width,480);assert(coverInfo.colors>30,'Cover contains a rendered scene, not a blank image');
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
  await dock.locator('[data-mobile-target="scenes"]').tap();
  // The single-chair fireside camera must clear both mobile overlays and the fixed recording banner.
  await page.locator('[data-scene="cozy-1"]').tap();
  await page.waitForFunction(()=>{
    const stage=document.getElementById('stage').getBoundingClientRect();
    const host=document.getElementById('cameraBox').getBoundingClientRect();
    const banner=document.getElementById('lowerThird').getBoundingClientRect();
    const ticker=document.getElementById('tickerBox').getBoundingClientRect();
    return stage.height>0&&host.height>=stage.height*.20&&host.bottom<=Math.min(banner.top,ticker.top,stage.top+stage.height*595/720)+1;
  });
  assert(await page.locator('#rtrnSecondBox').isHidden(),'Fireside must remain a one-chair scene');
  console.log('Mobile Cozy Fireside camera clears headline, ticker and recording banner.');
  // The original desk, news and window sets also keep their visible cameras above overlays.
  for(const [id,count] of [['original-podcast',1],['original-live',1],['news',2],['window-washers',2],['window-grandma',2],['window-robber',2],['window-sunset',2],['window-weather',2]]){
    await page.locator('[data-scene="'+id+'"]').tap();
    if(count===2)await page.locator('#rtrnDuoQuick').click();
    await page.waitForFunction(count=>{
      const stage=document.getElementById('stage').getBoundingClientRect();
      const banner=document.getElementById('lowerThird').getBoundingClientRect();
      const ticker=document.getElementById('tickerBox').getBoundingClientRect();
      const limit=Math.min(banner.top,ticker.top,stage.top+stage.height*595/720);
      return stage.height>0&&['cameraBox','rtrnSecondBox'].slice(0,count).every(id=>{
        const el=document.getElementById(id),box=el.getBoundingClientRect();
        return !el.hidden&&box.width>0&&box.height>=stage.height*.12&&box.bottom<=limit+1;
      });
    },count,{timeout:6000});
    if(count===1)assert(await page.locator('#rtrnSecondBox').isHidden(),'Original desk must retain one host');
    console.log('Mobile desk/window camera clearance passed:',id);
  }
  // All guest seats share the same mobile and recording banner clearance.
  for(const [id,count] of [['cozy-2',2],['cozy-3',3],['cozy-4',4]]){
    await page.locator('[data-scene="'+id+'"]').tap();
    await page.locator('#rtrnDuoQuick').click();
    await page.waitForFunction(count=>{
      const stage=document.getElementById('stage').getBoundingClientRect();
      const banner=document.getElementById('lowerThird').getBoundingClientRect();
      const ticker=document.getElementById('tickerBox').getBoundingClientRect();
      const limit=Math.min(banner.top,ticker.top,stage.top+stage.height*595/720);
      const ids=['cameraBox','rtrnSecondBox','rtrnSeatPlaceholder3','rtrnSeatPlaceholder4'].slice(0,count);
      return stage.height>0&&ids.every(id=>{
        const el=document.getElementById(id),box=el.getBoundingClientRect();
        return !el.hidden&&box.width>0&&box.height>=stage.height*.15&&box.bottom<=limit+1;
      });
    },count,{timeout:6000});
    console.log('Mobile Cozy seat clearance passed:',id);
  }
  // Outdoor and lounge backgrounds retain every guest seat above preview/recording overlays.
  for(const [id,count] of [['beach',2],['mountain',2],['porch',2],['gazebo',3],['gazebo-branded',3],['purple-haze',2],['midnight',4],['stars',4]]){
    await page.locator('[data-scene="'+id+'"]').tap();
    await page.locator('#rtrnDuoQuick').click();
    await page.waitForFunction(count=>{
      const stage=document.getElementById('stage').getBoundingClientRect();
      const banner=document.getElementById('lowerThird').getBoundingClientRect();
      const ticker=document.getElementById('tickerBox').getBoundingClientRect();
      const limit=Math.min(banner.top,ticker.top,stage.top+stage.height*595/720);
      return stage.height>0&&['cameraBox','rtrnSecondBox','rtrnSeatPlaceholder3','rtrnSeatPlaceholder4'].slice(0,count).every(id=>{
        const el=document.getElementById(id),box=el.getBoundingClientRect();
        return !el.hidden&&box.width>0&&box.height>=stage.height*.12&&box.bottom<=limit+1;
      });
    },count,{timeout:6000});
    console.log('Mobile outdoor seat clearance passed:',id);
  }
  for(const [id,filename,labels] of [['vintage-tea','vintage_tea_room.jpg',['Tea room — wall picture','Tea room — center table picture']],['vintage-man','vintage_good_old_days.jpg',['Wall picture 1','Wall picture 2','Wall picture 3','Wall picture 4']]]){
    await page.locator('[data-scene="'+id+'"]').tap();
    await page.waitForFunction(filename=>{const img=document.getElementById('stageBackgroundImage');return img?.src.endsWith(filename)&&img.complete&&img.naturalWidth>=1200&&img.naturalHeight>=675},filename);
    await page.locator('#rtrnSecondBox').waitFor({state:'visible'});
    const host=await page.locator('#cameraBox').boundingBox(),guest=await page.locator('#rtrnSecondBox').boundingBox();
    assert(host.x+host.width<guest.x,'Vintage camera boxes must not overlap');
    const expectedTop=id==='vintage-tea'?38:45;
    await page.waitForFunction(expected=>{
      const stage=document.getElementById('stage').getBoundingClientRect();
      const banner=document.getElementById('lowerThird').getBoundingClientRect();
      return ['cameraBox','rtrnSecondBox'].every(id=>{
        const box=document.getElementById(id).getBoundingClientRect(),top=(box.top-stage.top)/stage.height*100;
        return top>=3.5&&top<=expected+1&&box.height>=stage.height*.15&&box.bottom<=banner.top+1;
      });
    },expectedTop,{timeout:6000});
    await dock.locator('[data-mobile-target="photos"]').tap();
    const frameText=await page.locator('#wallFrameList').textContent();
    for(const label of labels)assert(frameText.includes(label),'Missing vintage photo slot: '+label);
    await dock.locator('[data-mobile-target="scenes"]').tap();
  }
  async function checkDance(p){
    for(const [id,filename] of [['dance-purple','dance_purple_club.png'],['dance-retro','dance_retro_disco.png']]){
      await p.locator('[data-scene="'+id+'"]').click();
      await p.waitForFunction(filename=>{const img=document.getElementById('stageBackgroundImage');return img?.src.endsWith(filename)&&img.complete&&img.naturalWidth>=1200},filename);
      await p.waitForFunction(()=>{const stage=document.getElementById('stage'),host=document.getElementById('cameraBox'),banner=document.getElementById('lowerThird');const s=stage.getBoundingClientRect(),h=host.getBoundingClientRect();return stage.classList.contains('rtrn-dance')&&h.height>=s.height*.48&&h.height>h.width&&h.bottom<=banner.getBoundingClientRect().top+1});
      assert(await p.locator('#rtrnSecondBox').isHidden());
      assert(await p.locator('#rtrnDuoQuick').isEnabled());
      await p.locator('#rtrnDuoQuick').click();
      await p.waitForFunction(()=>{
        const stage=document.getElementById('stage').getBoundingClientRect();
        const host=document.getElementById('cameraBox').getBoundingClientRect();
        const guest=document.getElementById('rtrnSecondBox').getBoundingClientRect();
        const banner=document.getElementById('lowerThird').getBoundingClientRect();
        return guest.width>0&&guest.height>guest.width&&host.height>host.width&&Math.abs(host.width-guest.width)<2&&Math.abs(host.height-guest.height)<2&&host.right+stage.width*.05<=guest.left&&guest.right<=stage.right&&Math.max(host.bottom,guest.bottom)<=banner.top+1;
      });
      assert.equal(await p.locator('#rtrnSecondVideo').evaluate(el=>getComputedStyle(el).objectFit),'contain');
      assert.equal(await p.locator('#cameraVideo').evaluate(el=>getComputedStyle(el).objectFit),'contain');
      await p.locator('#cameraMode').evaluate(el=>{el.value='cutout';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))});
      await p.waitForFunction(()=>document.getElementById('cameraBox').classList.contains('cutout'));
      assert.equal(await p.locator('#cameraBox').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
      assert.equal(await p.locator('#rtrnSecondBox').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
      await p.locator('#cameraMode').evaluate(el=>{el.value='frame';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))});
      await p.waitForFunction(()=>!document.getElementById('cameraBox').classList.contains('cutout'));
      await p.locator('#rtrnSoloQuick').click();
      await p.waitForFunction(()=>{const s=document.getElementById('stage').getBoundingClientRect(),h=document.getElementById('cameraBox').getBoundingClientRect();return document.getElementById('rtrnSecondBox').hidden&&Math.abs(h.left+h.width/2-s.left-s.width/2)<2});
    }
  }
  await dock.locator('[data-mobile-target="scenes"]').tap();
  await checkDance(page);
  assert.deepEqual(errors,[],'No uncaught browser errors');
  await mobile.close();
  const desktopContext = await browser.newContext({viewport:{width:1440,height:900}});
  const desktop = await desktopContext.newPage();
  await desktop.goto(url);
  // Force the WebM path even on browsers that prefer MP4 for studio recording.
  const webm=await desktop.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;
    const ctx=canvas.getContext('2d'),stream=canvas.captureStream(12);
    const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];
    rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    const done=new Promise(r=>rec.onstop=r);
    rec.start(200);
    for(let i=0;i<15;i++){ctx.fillStyle=i%2?'purple':'green';ctx.fillRect(0,0,160,90);await new Promise(r=>setTimeout(r,85))}
    rec.stop();await done;stream.getTracks().forEach(t=>t.stop());
    const raw=new Blob(chunks,{type:rec.mimeType}),fixed=await window.RTRNFinalizeShow(raw);
    const link=document.getElementById('rtrnVideoDownload');link.href=URL.createObjectURL(fixed);
    return {raw:raw.size,fixed:fixed.size};
  });
  assert(webm.fixed>0&&webm.raw>0,'Finalized WebM has video data');
  assert(await verifySeekable(desktop),'Finalized WebM supports finite duration, seek, and replay');
  await desktop.reload();
  const desktopMixer=await desktop.locator('.rtrn-audio-mix').boundingBox(),desktopCamera=await desktop.locator('.rtrn-camera-top').boundingBox();
  assert(desktopCamera.y>=desktopMixer.y+desktopMixer.height-1&&desktopCamera.y-desktopMixer.y-desktopMixer.height<24,'Camera controls immediately below desktop volume sliders');
  assert(await desktop.locator('#rtrnCameraQuick').isVisible());
  assert(await desktop.locator('#rtrnCameraStopQuick').isVisible());
  assert.equal(await desktop.locator('details[open]').count(),0,'All expandable sections start closed on desktop');
  await desktop.locator('#rtrnPhotoTab').click();
  assert(await desktop.locator('#rtrnPhotoArea').isVisible());
  await desktop.locator('#rtrnMusicTab').click();
  assert(await desktop.locator('#rtrnMusicArea').isVisible());
  // Real playable WAV fixtures: rapid track changes, Stop during loading, and
  // exclusive music across same-origin studio tabs.
  await desktop.evaluate(async()=>{
    const sampleRate=8000, samples=sampleRate*12, bytes=new Uint8Array(44+samples*2), v=new DataView(bytes.buffer);
    for(const [offset,text] of [[0,'RIFF'],[8,'WAVE'],[12,'fmt '],[36,'data']])for(let i=0;i<text.length;i++)bytes[offset+i]=text.charCodeAt(i);
    v.setUint32(4,36+samples*2,true);v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);v.setUint32(40,samples*2,true);
    for(const [name,hz] of [['Exclusive A.wav',220],['Exclusive B.wav',440]]){for(let i=0;i<samples;i++)v.setInt16(44+i*2,Math.round(5000*Math.sin(2*Math.PI*hz*i/sampleRate)),true);await window.RTRNMediaLibrary.addFile('music',new File([bytes],name,{type:'audio/wav'}));}
  });
  await desktop.reload();
  async function openSongs(p){
    await p.locator('#rtrnMusicTab').click();
    await p.locator('#mediaLibraryFold').evaluate(el=>{el.open=true});
    await p.locator('#musicPlaylistFold').evaluate(el=>{el.open=true});
    await p.locator('#musicList').waitFor({state:'visible'});
  }
  await openSongs(desktop);
  const playTrack=(p,name)=>p.locator('#musicList .media-card').filter({hasText:name}).getByRole('button',{name:'▶ Play',exact:true});
  await playTrack(desktop,'Exclusive A.wav').waitFor({state:'attached'});
  await playTrack(desktop,'Exclusive B.wav').waitFor({state:'visible'});
  await playTrack(desktop,'Exclusive A.wav').click();
  await desktop.waitForFunction(()=>!document.getElementById('musicPlayer').paused);
  // Exercise the actual Next and Previous buttons while music is playing.
  await desktop.locator('#rtrnAudioSetup').evaluate(el=>{el.open=true});
  await desktop.locator('#rtrnAudioSpeakerTest').click();
  await desktop.waitForFunction(()=>document.getElementById('rtrnAudioStatus').textContent.includes('Test tone played'));
  await desktop.locator('#rtrnAudioSetup').evaluate(el=>{el.open=false});
  await desktop.evaluate(()=>{window.oldMusicPlayer=document.getElementById('musicPlayer');window.RTRNRecorder.connectAudio(window.oldMusicPlayer)});
  await desktop.locator('#musicNext').click();
  await desktop.waitForFunction(()=>document.getElementById('nowPlaying').textContent.includes('Exclusive B.wav')&&!document.getElementById('musicPlayer').paused);
  assert(await desktop.evaluate(()=>{const old=window.oldMusicPlayer,p=document.getElementById('musicPlayer');return old!==p&&!old.isConnected&&old.paused&&old.muted&&!old.getAttribute('src')&&document.querySelectorAll('#musicPlayer').length===1}),'Next fully retires the prior audio pipeline');
  await desktop.evaluate(()=>{window.oldMusicPlayer=document.getElementById('musicPlayer')});
  await desktop.locator('#musicPrev').click();
  await desktop.waitForFunction(()=>document.getElementById('nowPlaying').textContent.includes('Exclusive A.wav')&&!document.getElementById('musicPlayer').paused);
  assert(await desktop.evaluate(()=>{const old=window.oldMusicPlayer;return !old.isConnected&&old.paused&&old.muted&&!old.getAttribute('src')}),'Previous fully retires the prior audio pipeline');
  // A second independent playback source must not survive Stop Music.
  await desktop.evaluate(async()=>{
    const url=document.getElementById('musicPlayer').src;
    const extra=document.createElement('audio');extra.src=url;extra.loop=true;document.body.append(extra);window.extraMusic=extra;
    await extra.play();
    const orphan=document.createElement('audio');orphan.src=url;orphan.loop=true;document.body.append(orphan);
    window.RTRNRecorder.connectAudio(orphan);await orphan.play();orphan.remove();window.orphanMusic=orphan;
  });
  await desktop.locator('#rtrnStopMusicQuick').click();
  assert(await desktop.evaluate(()=>document.getElementById('musicPlayer').paused&&window.extraMusic.paused&&window.orphanMusic.paused&&!window.orphanMusic.getAttribute('src')),'Stop Music silences independent and detached sources');
  await desktop.evaluate(()=>{window.extraMusic.remove();delete window.extraMusic;delete window.orphanMusic;});

  await desktop.evaluate(()=>{const cards=[...document.querySelectorAll('#musicList .media-card')];for(const name of ['Exclusive A.wav','Exclusive B.wav'])cards.find(c=>c.textContent.includes(name)).querySelector('button').click()});
  await desktop.waitForFunction(()=>document.getElementById('nowPlaying').textContent.includes('Exclusive B.wav')&&!document.getElementById('musicPlayer').paused);
  await desktop.evaluate(()=>{[...document.querySelectorAll('#musicList .media-card')].find(c=>c.textContent.includes('Exclusive A.wav')).querySelector('button').click();document.getElementById('rtrnStopMusicQuick').click()});
  await desktop.waitForTimeout(300);
  assert(await desktop.locator('#musicPlayer').evaluate(el=>el.paused&&el.currentTime===0),'Stop cancels pending track');
  await playTrack(desktop,'Exclusive A.wav').click();
  await desktop.waitForFunction(()=>!document.getElementById('musicPlayer').paused);
  const musicTab=await desktopContext.newPage();await musicTab.goto(url);
  await openSongs(musicTab);
  await playTrack(musicTab,'Exclusive B.wav').waitFor({state:'visible'});
  await playTrack(musicTab,'Exclusive B.wav').click();
  await musicTab.waitForFunction(()=>!document.getElementById('musicPlayer').paused);
  await desktop.waitForFunction(()=>document.getElementById('musicPlayer').paused);
  await desktop.locator('#rtrnStopMusicQuick').evaluate(el=>el.click());
  await musicTab.waitForFunction(()=>document.getElementById('musicPlayer').paused&&document.getElementById('musicPlayer').currentTime===0);
  await musicTab.close();
  await desktop.reload();
  assert.equal(await desktop.locator('details[open]').count(),0,'Remembered workspaces still start collapsed after reload');
  await desktop.locator('#mediaLibraryFold > summary').click();
  assert.equal(await desktop.locator('#mediaLibraryFold').evaluate(el=>el.open),true);
  await desktop.locator('#mediaLibraryFold > summary').click();
  assert.equal(await desktop.locator('#mediaLibraryFold').evaluate(el=>el.open),false);
  assert(await desktop.locator('#rtrnRecordQuick').isVisible());
  await desktop.locator('#sceneFold > summary').click();
  await checkDance(desktop);
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
  // Generate a local talking-guest fixture with both video and audio.
  const guestBytes=Buffer.from(await desktop.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=160;c.height=90;const ctx=c.getContext('2d');
    const ac=new AudioContext();await ac.resume();const dest=ac.createMediaStreamDestination(),tone=ac.createOscillator(),gain=ac.createGain();gain.gain.value=.04;tone.connect(gain);gain.connect(dest);tone.start();
    const video=c.captureStream(12),stream=new MediaStream([...video.getVideoTracks(),...dest.stream.getAudioTracks()]);
    const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus'}),chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};const done=new Promise(r=>rec.onstop=r);rec.start();
    for(let i=0;i<24;i++){ctx.fillStyle=i%2?'purple':'green';ctx.fillRect(0,0,160,90);await new Promise(r=>setTimeout(r,85))}
    rec.stop();await done;tone.stop();stream.getTracks().forEach(t=>t.stop());await ac.close();
    return Array.from(new Uint8Array(await new Blob(chunks,{type:rec.mimeType}).arrayBuffer()));
  }));
  const guestFile=name=>({name,mimeType:'video/webm',buffer:guestBytes});
  await desktop.locator('#rtrnInterviewFold > summary').click();
  await desktop.locator('#rtrnInterviewSeat').selectOption('2');
  await desktop.locator('#rtrnInterviewMode').selectOption('script');
  await desktop.locator('#rtrnInterviewUpload').setInputFiles([guestFile('01-intro.webm'),guestFile('02-joke.webm')]);
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSecondVideo');return v.src&&v.paused&&v.readyState>=2});
  await desktop.locator('#rtrnInterviewIdle').setInputFiles(guestFile('listening.webm'));
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSecondVideo');return v.loop&&v.muted&&!v.paused});
  await desktop.locator('#rtrnInterviewPlay').click();
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSecondVideo');return !v.loop&&!v.muted&&!v.paused&&v.currentTime>0});
  await desktop.locator('#rtrnInterviewPause').click();
  assert(await desktop.locator('#rtrnSecondVideo').evaluate(v=>v.paused),'Answer pauses');
  await desktop.locator('#rtrnInterviewPlay').click();
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSecondVideo');return v.loop&&v.muted&&!v.paused},{},{timeout:12000});
  assert.equal(await desktop.locator('#rtrnInterviewQueue').inputValue(),'0','No automatic advance after an answer');
  await desktop.locator('#rtrnInterviewNext').click();
  assert.equal(await desktop.locator('#rtrnInterviewQueue').inputValue(),'1');
  await desktop.locator('#rtrnInterviewPlay').click();
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSecondVideo');return !v.loop&&!v.muted&&!v.paused});
  await desktop.locator('#rtrnInterviewStop').click();
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSecondVideo');return v.loop&&v.muted&&!v.paused});
  await desktop.locator('#rtrnInterviewSeat').selectOption('5');
  await desktop.locator('#rtrnInterviewMode').selectOption('video');
  await desktop.locator('#rtrnInterviewUpload').setInputFiles(guestFile('guest-five.webm'));
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSeatVideo5');return v.src&&v.paused&&!v.hidden&&v.readyState>=2});
  await desktop.locator('#rtrnInterviewPlay').click();
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSeatVideo5');return !v.muted&&!v.paused});
  await desktop.locator('#rtrnInterviewProjectName').fill('Comedy interview');
  await desktop.locator('#rtrnInterviewSave').click();
  await desktop.waitForFunction(()=>document.getElementById('rtrnInterviewProjectStatus').textContent==='Saved interview: Comedy interview');
  assert.equal(await desktop.locator('#rtrnInterviewProjects').inputValue(),'Comedy interview');
  await desktop.locator('#rtrnSoloQuick').click();
  await desktop.waitForFunction(()=>document.getElementById('rtrnInterviewFold').hidden&&document.getElementById('rtrnSeatVideo5').paused&&document.getElementById('rtrnSecondVideo').paused);
  await desktop.locator('#rtrnDuoQuick').click();
  await desktop.locator('#rtrnInterviewSeat').selectOption('2');
  await desktop.locator('#rtrnInterviewMode').selectOption('live');
  assert(await desktop.locator('#rtrnInterviewLive').isVisible(),'Live guest mode remains available');
  await desktop.locator('#rtrnInterviewFold > summary').click();
  console.log('Scripted guest answers, idle clips, extra guest playback and solo cleanup passed.');

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
  // A fresh page must restore the original video bytes, queue order and selected answer.
  await desktop.reload();
  await desktop.locator('#sceneFold > summary').click();
  await desktop.locator('#sceneFold [data-scene="cozy-2"]').click();
  await desktop.locator('#rtrnDuoQuick').click();
  await desktop.locator('#rtrnInterviewFold > summary').click();
  await desktop.locator('#rtrnInterviewProjects option[value="Comedy interview"]').waitFor({state:'attached'});
  await desktop.locator('#rtrnInterviewProjects').selectOption('Comedy interview');
  await desktop.locator('#rtrnInterviewLoad').click();
  await desktop.waitForFunction(()=>document.getElementById('rtrnInterviewProjectStatus').textContent.startsWith('Loaded interview:'));
  await desktop.locator('#rtrnInterviewSeat').selectOption('2');
  assert.equal(await desktop.locator('#rtrnInterviewMode').inputValue(),'script');
  assert.deepEqual(await desktop.locator('#rtrnInterviewQueue option').allTextContents(),['1 · 01-intro.webm','2 · 02-joke.webm']);
  assert.equal(await desktop.locator('#rtrnInterviewQueue').inputValue(),'1');
  assert.equal(await desktop.locator('#rtrnInterviewIdleName').textContent(),'listening.webm');
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSecondVideo');return v.loop&&v.muted&&!v.paused});
  await desktop.locator('#rtrnInterviewPlay').click();
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSecondVideo');return !v.loop&&!v.muted&&!v.paused});
  await desktop.locator('#rtrnInterviewStop').click();
  const backupDownload=desktop.waitForEvent('download');
  await desktop.locator('#rtrnInterviewExport').click();
  const backup=await backupDownload;
  assert.equal(backup.suggestedFilename(),'Comedy-interview.rtrninterview');
  const backupBytes=await readFile(await backup.path());
  assert(backupBytes.length>4);
  desktop.once('dialog',d=>d.accept());
  await desktop.locator('#rtrnInterviewDelete').click();
  await desktop.waitForFunction(()=>document.getElementById('rtrnInterviewProjectStatus').textContent==='Deleted saved interview: Comedy interview');
  assert.equal(await desktop.locator('#rtrnInterviewProjects option').count(),1);
  assert.equal(await desktop.locator('#rtrnInterviewQueue option').count(),2,'Deleting saved copy must preserve current queue');
  console.log('Saved interview reload, original clips, playback and deletion passed.');
  await desktop.locator('#rtrnInterviewBackupFile').setInputFiles({name:'broken.rtrninterview',mimeType:'application/octet-stream',buffer:Buffer.from('bad')});
  await desktop.waitForFunction(()=>document.getElementById('rtrnInterviewProjectStatus').textContent.includes('Invalid or unsupported'));
  assert.equal(await desktop.locator('#rtrnInterviewProjects option').count(),1);
  await desktop.locator('#rtrnInterviewBackupFile').setInputFiles({name:backup.suggestedFilename(),mimeType:'application/octet-stream',buffer:backupBytes});
  await desktop.waitForFunction(()=>document.getElementById('rtrnInterviewProjectStatus').textContent.startsWith('Imported interview: Comedy interview'));
  assert.equal(await desktop.locator('#rtrnInterviewProjects').inputValue(),'Comedy interview');
  assert.equal(await desktop.locator('#rtrnInterviewQueue option').count(),2);
  desktop.once('dialog',d=>d.accept());
  await desktop.locator('#rtrnInterviewLoad').click();
  await desktop.waitForFunction(()=>document.getElementById('rtrnInterviewProjectStatus').textContent.startsWith('Loaded interview:'));
  assert.deepEqual(await desktop.locator('#rtrnInterviewQueue option').allTextContents(),['1 · 01-intro.webm','2 · 02-joke.webm']);
  assert.equal(await desktop.locator('#rtrnInterviewQueue').inputValue(),'1');
  await desktop.locator('#rtrnInterviewPlay').click();
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSecondVideo');return !v.muted&&!v.paused&&v.readyState>=2});
  await desktop.locator('#rtrnInterviewStop').click();
  console.log('Portable backup export, invalid backup rejection, import and playback passed.');
  // Rehearsal must cue the first answer, prevent recording, and reset after practice.
  await desktop.locator('#rtrnInterviewRehearse').click();
  assert.equal(await desktop.locator('#rtrnInterviewQueue').inputValue(),'0');
  assert(await desktop.locator('#rtrnInterviewEndRehearsal').isEnabled());
  await desktop.locator('#rtrnRecordQuick').click();
  assert(await desktop.locator('#rtrnRecordQuick').isEnabled(),'Rehearsal must not start a recording');
  await desktop.locator('#rtrnInterviewNext').click();
  await desktop.locator('#rtrnInterviewPlay').click();
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSecondVideo');return !v.muted&&!v.paused});
  await desktop.locator('#rtrnInterviewEndRehearsal').click();
  assert.equal(await desktop.locator('#rtrnInterviewQueue').inputValue(),'0');
  await desktop.waitForFunction(()=>{const v=document.getElementById('rtrnSecondVideo');return v.loop&&v.muted&&!v.paused});
  assert(await desktop.locator('#rtrnInterviewEndRehearsal').isDisabled());
  assert(await desktop.locator('#rtrnRecordQuick').isEnabled());
  console.log('Interview rehearsal, recording guard and first-answer reset passed.');

} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
