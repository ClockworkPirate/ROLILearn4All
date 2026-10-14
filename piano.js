// A lightweight piano-style voice: struck harmonics with independent decay.
export class Piano {
 constructor(context){this.context=context;this.master=context.createGain();this.master.gain.value=.65;const compressor=context.createDynamicsCompressor();this.master.connect(compressor).connect(context.destination);this.voices=new Map();}
 start(key,pitch,velocity=100){this.stop(key);const c=this.context,t=c.currentTime,f=440*2**((pitch-69)/12),gain=c.createGain(),oscillators=[];gain.gain.setValueAtTime(Math.max(.001,(velocity/127)**1.5*.18),t);gain.connect(this.master);
  [1,.38,.2,.09,.045,.025].forEach((level,i)=>{const osc=c.createOscillator(),partial=c.createGain();osc.type='sine';osc.frequency.value=f*(i+1)*(1+i*i*.00012);partial.gain.setValueAtTime(.0001,t);partial.gain.exponentialRampToValueAtTime(level,t+.004);partial.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.2,4.5/(1+i*.85)*2**((60-pitch)/48)));osc.connect(partial).connect(gain);osc.start(t);osc.stop(t+12);oscillators.push(osc);});
  const voice={gain,oscillators};this.voices.set(key,voice);oscillators[0].onended=()=>{gain.disconnect();if(this.voices.get(key)===voice)this.voices.delete(key);};
 }
 stop(key){const voice=this.voices.get(key);if(!voice)return;this.voices.delete(key);const t=this.context.currentTime;voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(.0001,t,.045);for(const osc of voice.oscillators)osc.stop(t+.25);}
 clear(prefix=''){for(const key of this.voices.keys())if(key.startsWith(prefix))this.stop(key);}
}
export function decodeNote(data){if(data.length<3)return null;const kind=data[0]&240;if(kind!==128&&kind!==144)return null;return {channel:data[0]&15,pitch:data[1],velocity:data[2],on:kind===144&&data[2]>0};}
