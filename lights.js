// Allow the device to process note releases before closing the transport.
export async function resetLights(port,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),clock=()=>performance.now()){
 if(!port)return;
 port.clear();
 for(let pass=0;pass<2;pass++){
  const start=clock();
  port.send([0xb0,64,0],start); // release sustain on the lighting channel
  for(let pitch=0;pitch<128;pitch++)port.send([0x80,pitch,0],start+pitch*2);
  port.send([0xb0,123,0],start+260);
  await wait(350);
 }
}
