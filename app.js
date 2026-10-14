import {parseMidi,sounding,upcoming} from './midi.js';
import {Piano,decodeNote} from './piano.js';
const riskDialog=document.getElementById('riskNotice');
let noticeAccepted=false;
riskDialog.close();riskDialog.showModal();
riskDialog.addEventListener('cancel',event=>event.preventDefault());
riskDialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();}});
riskDialog.addEventListener('close',()=>{if(!noticeAccepted&&!riskDialog.open)riskDialog.showModal();});
document.getElementById('riskAccept').onchange=event=>{document.getElementById('riskContinue').disabled=!event.target.checked;};
document.getElementById('riskForm').onsubmit=event=>{event.preventDefault();if(!document.getElementById('riskAccept').checked)return;noticeAccepted=true;document.querySelector('main').inert=false;riskDialog.close();document.getElementById('connect').focus();};
document.getElementById('riskLeave').onclick=()=>location.replace('about:blank');
import {resetLights,readBrightness,setBrightness} from './lights.js';
const originalBrightness=new Map();
const $=id=>document.getElementById(id),colors=['#ffcf87','#8dbdff','#d6acff','#ffd18b','#ff9dab'];
let song,selected=new Set(),playing=false,position=0,origin=0,rate=1,midi=null,output=null,planned=new Set(),scheduledTo=0,audioContext=null,voices=new Map();
let piano=null,input=null;const held=new Map(),pedal=new Set();
async function enableAudio(){if(!noticeAccepted||!$('audio').checked)return;audioContext??=new AudioContext();piano??=new Piano(audioContext);await audioContext.resume();}
document.addEventListener('pointerdown',()=>{enableAudio().catch(e=>status(`Audio unavailable: ${e.message}`));});
function clearLive(){held.clear();pedal.clear();piano?.clear('live:');}
function receiveMidi(event){const data=event.data,ch=data[0]&15;
 if((data[0]&240)===176){if(data[1]===64){if(data[2]>=64)pedal.add(ch);else{pedal.delete(ch);for(const [key,n] of held)if(n.channel===ch&&!n.down){piano?.stop(key);held.delete(key);}}}else if(data[1]===120||data[1]===123)clearLive();return;}
 const n=decodeNote(data);if(!n)return;const key=`live:${n.channel}:${n.pitch}`;if(n.on){held.set(key,{...n,down:true});if($('audio').checked&&audioContext?.state==='running')piano.start(key,n.pitch,n.velocity);}else{const note=held.get(key);if(note&&pedal.has(n.channel))note.down=false;else{held.delete(key);piano?.stop(key);}}
}
function inputPorts(){const previous=input?.id;const available=[...midi.inputs.values()].filter(p=>p.state==='connected');$('input').replaceChildren();$('input').add(new Option(available.length?'Choose keyboard input':'No MIDI inputs detected',''));for(const port of available)$('input').add(new Option(port.name||port.id,port.id));$('input').disabled=!available.length;if(previous&&available.some(p=>p.id===previous))$('input').value=previous;else{if(input)input.onmidimessage=null;input=null;clearLive();const roli=available.find(p=>/ROLI|LUMI/i.test(p.name));if(roli){$('input').value=roli.id;chooseInput();}}}
async function chooseInput(){clearLive();if(input)input.onmidimessage=null;input=null;const candidate=midi?.inputs.get($('input').value);if(!candidate)return;try{await candidate.open();input=candidate;input.onmidimessage=receiveMidi;status(`Keyboard audio ready: ${input.name}. Play a key to hear it.`);}catch(e){status(`Could not open MIDI input: ${e.message}`);}}
$('input').onchange=chooseInput;$('audio').onchange=()=>{if(!$('audio').checked){piano?.clear();voices.clear();}else enableAudio().catch(e=>status(e.message));};
const now=()=>performance.now();
const current=()=>playing?Math.min(song.duration,position+(now()-origin)/1000*rate):position;
const status=text=>{$('status').textContent=text;};
const fmt=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function silence(){if(output){try{output.clear();for(let p=0;p<128;p++)output.send([0x80,p,0]);}catch(e){status(`MIDI connection lost: ${e.message}`);}}planned.clear();piano?.clear('song:');voices.clear();}
function pause(){position=current();playing=false;silence();$('play').textContent='▶ Play';}
function restartSchedule(){silence();scheduledTo=position-0.000001;}
function load(next,title){pause();song=next;position=0;selected=new Set(song.tracks.map((_,i)=>i));$('title').textContent=title;$('seek').max=song.duration;$('tracks').replaceChildren();song.tracks.forEach((track,i)=>{const label=document.createElement('label');label.className='check';const box=document.createElement('input');box.type='checkbox';box.checked=true;box.addEventListener('change',()=>{const resume=playing;pause();box.checked?selected.add(i):selected.delete(i);if(resume)play();});label.append(box,document.createTextNode(track.name||`Track ${i+1}`));label.style.color=colors[i%colors.length];$('tracks').append(label);});status(`${song.notes.length} notes · ${song.tracks.length} tracks · Files stay on your computer.`);}
function demo(){const notes=[];[60,64,67,72,71,67,64,62,65,69,74,72,69,65,64,60].forEach((pitch,i)=>notes.push({pitch,start:i*.5,end:i*.5+.42,track:0,velocity:100}));[48,53,55,48].forEach((pitch,i)=>notes.push({pitch,start:i*2,end:i*2+1.8,track:1,velocity:80}));load({notes,tracks:[{name:'Melody'},{name:'Left hand'}],duration:8.5},'A little warm-up');}
async function play(){if(playing){pause();return;}if(!song.notes.length){status('This file has no notes to play.');return;}if(position>=song.duration)position=0;if($('audio').checked){await enableAudio();}origin=now();playing=true;restartSchedule();$('play').textContent='Ⅱ Pause';}
function sendDiff(next,timestamp){if(output){for(const p of planned)if(!next.has(p))output.send([0x80,p,0],timestamp);for(const p of next)if(!planned.has(p))output.send([0x90,p,127],timestamp);}planned=next;}
function schedule(){if(!playing)return;const time=current(),until=Math.min(song.duration,time+.12*rate);try{if(scheduledTo<time){sendDiff(sounding(song.notes,time,selected),now());scheduledTo=time;}
 const boundaries=new Set();for(const n of song.notes)if(selected.has(n.track)){if(n.start>scheduledTo&&n.start<=until)boundaries.add(n.start);if(n.end>scheduledTo&&n.end<=until)boundaries.add(n.end);}for(const t of [...boundaries].sort((a,b)=>a-b))sendDiff(sounding(song.notes,t,selected),origin+(t-position)/rate*1000);scheduledTo=until;
 }catch(e){pause();status(`Could not send MIDI: ${e.message}`);}if(time>=song.duration){pause();position=song.duration;}}
setInterval(schedule,25);
function synth(keys){if(!$('audio').checked||!playing||!piano)keys=new Set();for(const p of voices.keys())if(!keys.has(p)){piano?.stop(`song:${p}`);voices.delete(p);}for(const p of keys)if(!voices.has(p)){piano.start(`song:${p}`,p,90);voices.set(p,true);}}
$('play').onclick=play;$('stop').onclick=()=>{pause();position=0;};$('demo').onclick=demo;
$('file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('Please use a MIDI file smaller than 20 MB.');load(parseMidi(await file.arrayBuffer()),file.name.replace(/\.midi?$/i,''));}catch(error){status(error.message);}e.target.value='';};
$('seek').oninput=()=>{const resume=playing;pause();position=Number($('seek').value);if(resume)play();};
$('speed').oninput=()=>{const resume=playing;pause();rate=Number($('speed').value)/100;$('speedLabel').textContent=`${Math.round(rate*100)}%`;if(resume)play();};
function ports(){const previous=output?.id;const available=[...midi.outputs.values()].filter(p=>p.state==='connected');$('output').replaceChildren();$('output').add(new Option(available.length?'Choose your ROLI Piano output':'No MIDI outputs detected',''));$('output').disabled=!available.length;for(const port of available)$('output').add(new Option(port.name||port.id,port.id));if(previous&&available.some(p=>p.id===previous))$('output').value=previous;else if(output){pause();output=null;$('disconnect').disabled=true;}if(!output)$('connection').textContent=available.length?`${available.length} MIDI output(s) found. Select your Piano.`:'MIDI permission granted, but the browser sees no outputs. Check the Piano in Windows Device Manager for a driver error, then reconnect USB and click Refresh MIDI devices.';}
async function chooseOutput(){pause();output=null;const candidate=midi?.outputs.get($('output').value);if(!candidate)return;try{await candidate.open();output=candidate;if(midi.sysexEnabled){await chooseInput();if(!originalBrightness.has(candidate.id)){const value=await readBrightness(candidate,input);originalBrightness.set(candidate.id,value>0?value:100);}await setBrightness(candidate,originalBrightness.get(candidate.id));}$('connection').textContent=`Connected: ${output.name}`;$('disconnect').disabled=false;status('Piano ready. Press Play to light the keys.');}catch(e){status(`Could not open MIDI output: ${e.message}`);}}
$('connect').onclick=async()=>{if(!navigator.requestMIDIAccess){$('connection').textContent='Web MIDI is unavailable in this browser. Use desktop Chrome at localhost or HTTPS.';status($('connection').textContent);return;}const button=$('connect');button.disabled=true;button.textContent='Checking MIDI devices…';$('connection').textContent='Waiting for browser MIDI permission…';try{midi=await navigator.requestMIDIAccess({sysex:true});ports();inputPorts();midi.onstatechange=()=>{ports();inputPorts();};const roli=[...midi.outputs.values()].find(p=>p.state==='connected'&&/ROLI Piano/i.test(p.name));if(roli){$('output').value=roli.id;await chooseOutput();}else status($('connection').textContent);}catch(e){$('connection').textContent=`MIDI access failed: ${e.message}. Check this site's MIDI permission in Chrome.`;status($('connection').textContent);}finally{button.disabled=false;button.textContent=midi?'Refresh MIDI devices':'Connect ROLI Piano';}};
$('output').onchange=chooseOutput;$('disconnect').onclick=async()=>{
 const button=$('disconnect');button.disabled=true;button.textContent='Clearing lights…';
 const oldOutput=output,oldInput=input;const stateHandler=midi?.onstatechange;
 if(midi)midi.onstatechange=null; // close events must not auto-open the input again
 if(oldInput)oldInput.onmidimessage=null;
 pause();clearLive();output=null;input=null;
 for(const id of ['connect','output','input','play'])$(id).disabled=true;
 try{await resetLights(oldOutput);if(oldOutput&&midi.sysexEnabled)await setBrightness(oldOutput,0);await oldInput?.close();await oldOutput?.close();$('output').value='';$('input').value='';$('connection').textContent='Disconnected';status('Lighting note releases sent. Connect again to resume.');}
 catch(e){output=oldOutput;input=oldInput;if(input)input.onmidimessage=receiveMidi;button.disabled=false;status(`Could not finish clearing lights: ${e.message}. Try Disconnect again.`);}
 finally{button.textContent='Disconnect & clear lights';for(const id of ['connect','output','input','play'])$(id).disabled=false;if(midi)midi.onstatechange=stateHandler;}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearLive();if(document.hidden&&playing){pause();status('Paused while the tab is hidden. Press Play to continue.');}});window.addEventListener('pagehide',()=>{pause();clearLive();});
const canvas=$('canvas'),ctx=canvas.getContext('2d');
function draw(){const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);const w=rect.width,h=rect.height,keyHeight=78,line=h-keyHeight,time=current(),ahead=Number($('ahead').value),keys=sounding(song.notes,time,selected);synth(keys);for(const n of held.values())keys.add(n.pitch);const hints=playing&&$('anticipate').checked?upcoming(song.notes,time,selected,.5,keys):new Set();ctx.clearRect(0,0,w,h);
 let min=48,max=83;for(const n of song.notes)if(selected.has(n.track)){min=Math.min(min,n.pitch);max=Math.max(max,n.pitch);}min=Math.max(0,min);max=Math.min(127,max);const black=p=>[1,3,6,8,10].includes(p%12);while(black(min))min--;while(black(max))max++;const whites=[];for(let p=min;p<=max;p++)if(!black(p))whites.push(p);const unit=w/whites.length,geometry=new Map();whites.forEach((p,i)=>geometry.set(p,{x:i*unit,width:unit}));for(let p=min;p<=max;p++)if(black(p)){let prev=p-1;geometry.set(p,{x:geometry.get(prev).x+unit*.68,width:unit*.64});}
 for(const p of whites){const g=geometry.get(p);ctx.fillStyle=p%12===0?'#1b292d':'#141f25';ctx.fillRect(g.x,0,g.width,line);ctx.strokeStyle='#253237';ctx.strokeRect(g.x,0,g.width,line);}for(let s=Math.ceil(time);s<time+ahead;s++){const y=line-(s-time)/ahead*line;ctx.strokeStyle='#2a393d';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 for(const n of song.notes){if(!selected.has(n.track)||n.end<time||n.start>time+ahead)continue;const g=geometry.get(n.pitch);if(!g)continue;const top=Math.max(0,line-(n.end-time)/ahead*line),bottom=Math.min(line,line-(n.start-time)/ahead*line);if(bottom<=top)continue;ctx.fillStyle=colors[n.track%colors.length];ctx.globalAlpha=n.start<=time?1:.8;ctx.beginPath();ctx.roundRect(g.x+2,top,Math.max(1,g.width-4),Math.max(2,bottom-top),4);ctx.fill();ctx.globalAlpha=1;}
 ctx.fillStyle='#8dbdff';ctx.fillRect(0,line-2,w,2);for(const p of whites){const g=geometry.get(p);ctx.fillStyle=keys.has(p)?'#ffffff':hints.has(p)?'#007a00':'#dfe6e0';ctx.fillRect(g.x+1,line,g.width-2,keyHeight);if(p%12===0){ctx.fillStyle='#4b6558';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText(`C${Math.floor(p/12)-1}`,g.x+g.width/2,h-10);}}for(let p=min;p<=max;p++)if(black(p)){const g=geometry.get(p);ctx.fillStyle=keys.has(p)?'#ffffff':hints.has(p)?'#007a00':'#111b20';ctx.fillRect(g.x,line,g.width,keyHeight*.62);}
 $('time').textContent=`${fmt(time)} / ${fmt(song.duration)}`;if(document.activeElement!==$('seek'))$('seek').value=time;requestAnimationFrame(draw);
}
demo();draw();






