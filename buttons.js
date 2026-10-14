// BLOCKS event decoding follows the original blocks.py parser.
export function buttonEvents(data){
 if(data.length<9||![240,0,33,16,119].every((b,i)=>data[i]===b)||!(data[5]&64)||data.at(-1)!==247)return [];
 const payload=[...data.slice(6,-2)];let sum=payload.length;for(const b of payload)sum=(sum*3+b)&255;if((sum&127)!==data.at(-2))return [];
 let bits=0n;payload.forEach((b,i)=>bits|=BigInt(b)<<BigInt(i*7));let pos=32;const remaining=()=>payload.length*7-pos;const read=n=>{const v=Number((bits>>BigInt(pos))&((1n<<BigInt(n))-1n));pos+=n;return v;};const events=[];
 while(remaining()>=7){const type=read(7);if(type===32||type===33){if(remaining()<17)break;read(5);events.push({id:read(12),down:type===32});}
 else if(type===2){if(remaining()<10)break;read(10);}
 else if(type===24){if(remaining()<4)break;const cmd=read(4),n=cmd===4?104:cmd===0?40:0;if(!n||remaining()<n)break;pos+=n;}
 else if(type>=16&&type<=21){const n=42+(type>=19?24:0);if(remaining()<n)break;pos+=n;}
 else break;}
 return events;
}
export function apiCommand(command){const payload=[1,command&127,(command>>7)&3];let checksum=payload.length;for(const b of payload)checksum=(checksum*3+b)&255;return [240,0,33,16,119,0,...payload,checksum&127,247];}
