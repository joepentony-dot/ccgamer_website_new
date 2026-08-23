import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const tick=ms=>new Promise(resolve=>setTimeout(resolve,ms));

class RealtimeHub{
  constructor(){this.topics=new Map()}
  channels(topic){if(!this.topics.has(topic))this.topics.set(topic,new Set());return this.topics.get(topic)}
  notify(topic,event="sync"){for(const channel of this.channels(topic))for(const row of channel.events)if(row.type==="presence"&&(row.filter?.event===event||row.filter?.event==="sync"))row.callback()}
  makeClient(){
    return{
      channel:(topic,options={})=>{
        const channel={topic,key:options.config?.presence?.key,events:[],mine:null,closed:false};
        channel.on=(type,filter,callback)=>{channel.events.push({type,filter,callback});return channel};
        channel.subscribe=callback=>{this.channels(topic).add(channel);queueMicrotask(()=>callback("SUBSCRIBED"));return channel};
        channel.track=async payload=>{channel.mine={...payload};this.notify(topic,"join");return"ok"};
        channel.presenceState=()=>{const state={};for(const peer of this.channels(topic))if(peer.mine&&!peer.closed)state[peer.key]=[{...peer.mine}];return state};
        channel.send=async message=>{for(const peer of this.channels(topic)){if(peer===channel||peer.closed)continue;for(const row of peer.events)if(row.type==="broadcast"&&row.filter?.event===message.event)row.callback({payload:message.payload})}return"ok"};
        channel.untrack=async()=>{channel.mine=null;this.notify(topic,"leave");return"ok"};
        return channel;
      },
      removeChannel:async channel=>{channel.closed=true;this.channels(channel.topic).delete(channel);this.notify(channel.topic,"sync");return"ok"}
    };
  }
}

const hub=new RealtimeHub(),client=hub.makeClient();
const context={console,setTimeout,clearTimeout,setInterval,clearInterval,crypto:globalThis.crypto,location:{hostname:"example.test"},document:{querySelector:()=>null,createElement:()=>({}),head:{appendChild:()=>{}}},window:{}};
context.window.window=context.window;context.window.ccgSupabase={getClient:async()=>client};vm.createContext(context);
for(const file of ["js/config.js","js/network.js"])vm.runInContext(read(file),context,{filename:file});
const {RoomNetwork}=context.window.CCGNetwork;

const memberUpdates=[],packets=[];
const makeNetwork=name=>new RoomNetwork({onMembers:(members,isHost)=>memberUpdates.push({name,count:members.length,isHost}),onPacket:(event,payload)=>packets.push({name,event,payload})});
const host=makeNetwork("Host");await host.createOnlineRoom("V106A","Host");assert.equal(host.isHost,true);assert.equal(host.getMembers().length,1);

const guests=[];
for(let i=1;i<=3;i++){
  await tick(3);const guest=makeNetwork(`Guest ${i}`);await guest.joinExistingRoom("V106A",`Guest ${i}`);guests.push(guest);
}
assert.equal(host.getMembers().length,4,"a verified room admits four players");
assert.deepEqual(Array.from(host.getMembers(),member=>member.name),["Host","Guest 1","Guest 2","Guest 3"]);

await tick(3);const fifth=makeNetwork("Fifth");await assert.rejects(()=>fifth.joinExistingRoom("V106A","Fifth"),/room is full/i);assert.equal(fifth.connected,false,"the fifth player is disconnected after rejection");

await host.send("v106_lobby_start",{floor:1,build:"V10.6"});await tick(1);
assert.equal(packets.filter(packet=>packet.event==="v106_lobby_start").length,3,"the host start reaches every admitted guest");

await host.leave();await tick(1);assert.equal(guests[0].isHost,true,"the earliest remaining guest becomes host");assert.equal(guests[0].getMembers().length,3,"disconnecting players are removed from presence");
assert.ok(memberUpdates.some(update=>update.name==="Host"&&update.count===4),"presence published the four-player lobby state");

for(const guest of guests)await guest.leave();
console.log("V10.6 Realtime room, capacity, broadcast and host-migration checks passed");
