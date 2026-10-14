// Standard MIDI Files, formats 0 and 1. Timing is merged across tracks.
export function parseMidi(buffer){
 const data=new Uint8Array(buffer);let p=0;
 const need=n=>{if(p+n>data.length)throw Error('Truncated MIDI file.');};
 const u8=()=>{need(1);return data[p++];};
 const u16=()=>u8()*256+u8();const u32=()=>u16()*65536+u16();
 const str=n=>{need(n);return String.fromCharCode(...data.slice(p,p+=n));};
 const vlq=()=>{let v=0;for(let i=0;i<4;i++){let b=u8();v=v*128+(b&127);if(!(b&128))return v;}throw Error('Invalid MIDI variable length value.');};
 if(str(4)!=='MThd')throw Error('Choose a Standard MIDI (.mid) file.');
 const h=u32();if(h<6)throw Error('Invalid MIDI header.');const format=u16(),count=u16(),division=u16();need(h-6);p+=h-6;
 if(format>1)throw Error('Format 2 MIDI files are not supported.');if(division&32768||!division)throw Error('Use a MIDI file with beat-based timing (PPQ).');
 const events=[],tracks=[];
 for(let t=0;t<count;t++){
  if(str(4)!=='MTrk')throw Error('Missing MIDI track.');const length=u32();need(length);const end=p+length;let tick=0,running=0;tracks.push({name:`Track ${t+1}`});
  while(p<end){tick+=vlq();let status=u8();if(status<128){if(!running)throw Error('Invalid running status.');p--;status=running;}else if(status<240)running=status;
   if(status===255){const type=u8(),len=vlq();need(len);const payload=data.slice(p,p+=len);if(type===81&&len===3)events.push({tick,tempo:payload[0]*65536+payload[1]*256+payload[2]});if(type===3)tracks[t].name=new TextDecoder().decode(payload);}
   else if(status===240||status===247){running=0;const len=vlq();need(len);p+=len;}
   else if(status>=240)throw Error('Unsupported MIDI event.');
   else {const kind=status>>4,ch=status&15,a=u8(),b=(kind===12||kind===13)?0:u8();if(a>127||b>127)throw Error('Invalid MIDI data.');if(kind===8||kind===9)events.push({tick,track:t,ch,pitch:a,on:kind===9&&b>0,velocity:b});}
   if(p>end)throw Error('Invalid MIDI track length.');
  }
  events.push({tick,endTrack:t});
 }
 events.sort((a,b)=>a.tick-b.tick);let tick=0,time=0,tempo=500000;const active=new Map(),notes=[];
 for(const e of events){time+=(e.tick-tick)*tempo/division/1e6;tick=e.tick;if(e.tempo!==undefined){if(e.tempo<=0)throw Error('Invalid MIDI tempo.');tempo=e.tempo;continue;}
  if(e.endTrack!==undefined){for(const [key,queue] of active)if(key.startsWith(`${e.endTrack}:`)){for(const n of queue){n.end=time;notes.push(n);}active.delete(key);}continue;}
  const key=`${e.track}:${e.ch}:${e.pitch}`;if(e.on){if(!active.has(key))active.set(key,[]);active.get(key).push({track:e.track,pitch:e.pitch,start:time,velocity:e.velocity});}else{const n=active.get(key)?.shift();if(n){n.end=time;notes.push(n);}}
 }
 notes.sort((a,b)=>a.start-b.start);return {notes,tracks,duration:notes.reduce((end,n)=>Math.max(end,n.end),time)};
}
export function sounding(notes,time,selected){return new Set(notes.filter(n=>selected.has(n.track)&&n.start<=time&&time<n.end).map(n=>n.pitch));}
export function upcoming(notes,time,selected,lead=.5,active=new Set()){
 return new Set(notes.filter(n=>selected.has(n.track)&&n.start>time&&n.start<=time+lead&&!active.has(n.pitch)).map(n=>n.pitch));
}
