import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const patchPath=fileURLToPath(new URL('../js/v10-6-death-room-recovery.js',import.meta.url));
const patchSource=fs.readFileSync(patchPath,'utf8');

function makeContext({death=true,modeAfter='playing',sigilRoomId=null}={}){
  let broadcasts=0,toasts=0,doorSounds=0;
  const context={
    console,
    window:{},
    world:{},
    mode:'playing',
    run:{stats:{deaths:0}},
    host:{
      revision:4,
      sigilRoomId,
      doors:[
        {id:'room-7-a',type:'room',roomId:7,locked:true,open:false,opening:false,openingStart:0,openAt:0,openSoundDone:false},
        {id:'room-7-b',type:'room',roomId:7,locked:false,open:false,opening:false,openingStart:0,openAt:0,openSoundDone:false},
        {id:'room-8-a',type:'room',roomId:8,locked:true,open:false,opening:false,openingStart:0,openAt:0,openSoundDone:false},
        {id:'bronze',type:'bronze',roomId:7,locked:true,open:false}
      ]
    },
    W:{roomAt:()=>7},
    S:{sfx:name=>{if(name==='dooropen')doorSounds++;}},
    broadcastWorld:()=>{broadcasts++;},
    showToast:()=>{toasts++;}
  };
  context.hurtPlayer=player=>{
    if(!death)return;
    context.run.stats.deaths++;
    player.x=1;player.y=1;
    context.mode=modeAfter;
  };
  vm.createContext(context);
  vm.runInContext(patchSource,context,{filename:'v10-6-death-room-recovery.js'});
  return{context,counters:()=>({broadcasts,toasts,doorSounds})};
}

{
  const {context,counters}=makeContext();
  const player={x:30,y:40};
  context.hurtPlayer(player,99,false,'enemy');
  const room7=context.host.doors.filter(d=>d.type==='room'&&d.roomId===7);
  assert.equal(room7.every(d=>d.locked===false&&d.open===true),true,'all ordinary doors for the death room should reopen');
  assert.equal(context.host.doors.find(d=>d.id==='room-8-a').locked,true,'other rooms must remain untouched');
  assert.equal(context.host.doors.find(d=>d.id==='bronze').locked,true,'bronze/optional locks must remain untouched');
  assert.equal(context.host.revision,5,'door recovery should advance host revision once');
  assert.deepEqual(counters(),{broadcasts:1,toasts:1,doorSounds:1},'recovery should announce and synchronize once');
}

{
  const {context}=makeContext({death:false});
  context.hurtPlayer({x:30,y:40},1,false,'enemy');
  assert.equal(context.host.doors.find(d=>d.id==='room-7-a').locked,true,'non-lethal damage must not open challenge doors');
}

{
  const {context}=makeContext({modeAfter:'ended'});
  context.hurtPlayer({x:30,y:40},99,false,'enemy');
  assert.equal(context.host.doors.find(d=>d.id==='room-7-a').locked,true,'game-over/end-run deaths must not mutate the abandoned room');
}

{
  const {context}=makeContext({sigilRoomId:7});
  context.hurtPlayer({x:30,y:40},99,false,'enemy');
  assert.equal(context.host.doors.find(d=>d.id==='room-7-a').locked,true,'Sigil room recovery remains owned by the existing bespoke reset');
}

console.log('Lost Sizzler sealed-room death recovery regression checks passed.');
