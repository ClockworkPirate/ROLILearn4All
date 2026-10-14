// Allow the device to process note releases before closing the transport.
// BLOCKS config packet encoding ported from the original blocks.py.
export function configPacket(item,value,request=false){
 const fields=request?[[16,7],[1,4],[0,32],[item,8]]:[[16,7],[0,4],[item,8],[value>>>0,32]];
 let bits=0n,count=0;for(const [v,width] of fields){bits|=BigInt(v)<<BigInt(count);count+=width;}
 const payload=[];while(count>0){payload.push(Number(bits&127n));bits>>=7n;count-=7;}
 let checksum=payload.length;for(const b of payload)checksum=(checksum*3+b)&255;
 return [240,0,33,16,119,0,...payload,checksum&127,247];
}
export async function readBrightness(port,input){
 if(!input)return null;
 return new Promise(resolve=>{let timer;const finish=value=>{clearTimeout(timer);input.removeEventListener('midimessage',handler);resolve(value);};
 const handler=event=>{const d=event.data;if(d.length<9||d[0]!==240||d[4]!==119)return;const payload=[...d.slice(6,-2)];let sum=payload.length;for(const b of payload)sum=(sum*3+b)&255;if((sum&127)!==d[d.length-2])return;
 let bits=0n;payload.forEach((b,i)=>bits|=BigInt(b)<<BigInt(i*7));let pos=32;const read=n=>{const v=Number((bits>>BigInt(pos))&((1n<<BigInt(n))-1n));pos+=n;return v;};while(pos+7<=payload.length*7){const type=read(7);if(type!==24)return;const cmd=read(4);if(cmd!==0&&cmd!==4)return;if(pos+40>payload.length*7)return;const item=read(8),value=read(32);if(item===36){finish(value);return;}if(cmd===4)pos+=64;}
 };input.addEventListener('midimessage',handler);timer=setTimeout(()=>finish(null),1000);try{port.send(configPacket(36,0,true));}catch{finish(null);}});
}
export async function setBrightness(port,value){port.send(configPacket(36,value));await new Promise(resolve=>setTimeout(resolve,150));}
export async function resetLights(port,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),clock=()=>performance.now()){
 if(!port)return;
 if(typeof port.clear==='function')port.clear();
 else await wait(200); // playback queues at most 120 ms ahead; let it drain first
 for(let pass=0;pass<2;pass++){
  const start=clock();
  port.send([0xb0,64,0],start); // release sustain on the lighting channel
  for(let pitch=0;pitch<128;pitch++)port.send([0x80,pitch,0],start+pitch*2);
  port.send([0xb0,123,0],start+260);
  await wait(350);
 }
}
