export const INSTRUMENTS={acoustic_grand_piano:'Grand Piano',electric_piano_1:'Electric Piano',drawbar_organ:'Organ'};
export function noteNumber(name){const match=/^([A-G])([#b]?)(-?\d+)$/.exec(name);if(!match)throw Error('Invalid sample pitch');return (Number(match[3])+1)*12+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[match[1]]+(match[2]==='#'?1:match[2]==='b'?-1:0);}
export class Piano {
 constructor(context){this.context=context;this.master=context.createGain();this.master.gain.value=.7;const compressor=context.createDynamicsCompressor();this.master.connect(compressor).connect(context.destination);this.voices=new Map();this.cache=new Map();this.instrument=null;this.samples=null;this.loading=null;}
 async load(name='acoustic_grand_piano'){
  if(!INSTRUMENTS[name])throw Error('Unknown instrument');
  if(this.instrument===name&&this.samples)return;
  if(this.loading?.name===name)return this.loading.promise;
  const promise=(async()=>{let samples=this.cache.get(name);if(!samples){const response=await fetch(`/samples/${name}.json`);if(!response.ok)throw Error('Instrument download failed. Please try again.');const entries=Object.entries(await response.json());samples=new Map();for(let i=0;i<entries.length;i+=6)await Promise.all(entries.slice(i,i+6).map(async([note,url])=>{const bytes=Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0));samples.set(noteNumber(note),await this.context.decodeAudioData(bytes.buffer));}));this.cache.set(name,samples);}this.clear();this.instrument=name;this.samples=samples;})();
  this.loading={name,promise};try{await promise;}finally{if(this.loading?.promise===promise)this.loading=null;}
 }
 start(key,pitch,velocity=100){if(!this.samples)return;this.stop(key);const c=this.context,t=c.currentTime;const nearest=[...this.samples.keys()].reduce((a,b)=>Math.abs(b-pitch)<Math.abs(a-pitch)?b:a);const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.samples.get(nearest);source.playbackRate.value=2**((pitch-nearest)/12);if(this.instrument==='drawbar_organ'){source.loop=true;source.loopStart=source.buffer.duration*.35;source.loopEnd=source.buffer.duration*.8;}gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(Math.max(.001,(velocity/127)**1.4),t+.005);source.connect(gain).connect(this.master);const voice={source,gain};this.voices.set(key,voice);source.onended=()=>{gain.disconnect();if(this.voices.get(key)===voice)this.voices.delete(key);};source.start(t);}
 stop(key){const voice=this.voices.get(key);if(!voice)return;this.voices.delete(key);const t=this.context.currentTime;voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(.0001,t,this.instrument==='drawbar_organ'?.025:.08);voice.source.stop(t+.4);}
 clear(prefix=''){for(const key of this.voices.keys())if(key.startsWith(prefix))this.stop(key);}
}
export function decodeNote(data){if(data.length<3)return null;const kind=data[0]&240;if(kind!==128&&kind!==144)return null;return {channel:data[0]&15,pitch:data[1],velocity:data[2],on:kind===144&&data[2]>0};}
