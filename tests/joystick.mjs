import assert from 'node:assert/strict';

// Wait for actual travel while holding real input. A fixed wall-clock pulse can
// contain too few rendered frames on a cold software GPU; never move the actor
// through test hooks or accept a smaller displacement to hide that failure.
export async function checkJoystickMovement(page,engine,label){
 const snapshot=()=>page.evaluate(()=>window.spaceBar.getSnapshot());
 const before=await snapshot(),r=await page.locator('#joystick').boundingBox();
 const point={x:r.x+r.width/2+30,y:r.y+r.height/2};
 assert.ok(await page.evaluate(p=>!!document.elementFromPoint(p.x,p.y)?.closest('#joystick'),point),label+' joystick touch target');
 const cdp=engine==='chromium'?await page.context().newCDPSession(page):null;
 const start=Date.now();let sample,error;
 try{
  if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});
  else{await page.mouse.move(point.x,point.y);await page.mouse.down()}
  await page.waitForTimeout(350);sample=await snapshot();
  await page.waitForFunction(({x,z})=>{
   const s=window.spaceBar.getSnapshot();return !s.paused&&Math.hypot(s.player.x-x,s.player.z-z)>.15;
  },before.player,{timeout:5000,polling:'raf'});
 }catch(cause){error=cause}
 finally{
  if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()}
  else await page.mouse.up();
 }
 const after=await snapshot(),distance=s=>Math.hypot(s.player.x-before.player.x,s.player.z-before.player.z);
 const report={location:label,wallMs:Date.now()-start,gameSeconds:after.state.worldTime-before.state.worldTime,
  firstSampleDistance:sample?distance(sample):null,distance:distance(after),paused:after.paused,lastInput:after.flow.flow.lastInput};
 console.log('joystick '+engine+' '+JSON.stringify(report));
 assert.ok(!error&&report.distance>.15,label+' controls: '+JSON.stringify(report)+(error?' '+error.message:''));
 return report;
}
