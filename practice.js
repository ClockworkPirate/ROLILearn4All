export class Practice {
 constructor(notes,selected,time=0){this.groups=[];for(const n of [...notes].sort((a,b)=>a.start-b.start)){if(!selected.has(n.track)||n.start<time-1e-6)continue;let group=this.groups.at(-1);if(!group||Math.abs(group.time-n.start)>1e-6){group={time:n.start,pitches:new Set()};this.groups.push(group);}group.pitches.add(n.pitch);}this.index=0;this.waiting=false;this.missing=new Set();}
 get next(){return this.groups[this.index];}
 arrive(time){if(this.next&&time>=this.next.time&&!this.waiting){this.waiting=true;this.missing=new Set(this.next.pitches);}return this.waiting;}
 press(pitch){if(!this.waiting||!this.missing.has(pitch))return false;this.missing.delete(pitch);if(this.missing.size)return false;this.index++;this.waiting=false;return true;}
}
