import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const audioRoot=path.join(repo,"games/ccg-games/cheeky-commodore-quest/assets/audio");
const sampleRate=22050;
const tau=Math.PI*2;

function buffer(seconds){return new Float64Array(Math.ceil(seconds*sampleRate))}
function midi(note){return 440*Math.pow(2,(note-69)/12)}
function envelope(t,duration,attack=.03,release=.18,sustain=.72){
  if(t<0||t>=duration)return 0;
  if(t<attack)return t/Math.max(.001,attack);
  if(t>duration-release)return Math.max(0,(duration-t)/Math.max(.001,release))*sustain;
  return sustain+(1-sustain)*Math.exp(-(t-attack)*5.2);
}
function addNote(out,start,duration,note,gain=.15,instrument="harp"){
  const from=Math.max(0,Math.floor(start*sampleRate)),to=Math.min(out.length,Math.ceil((start+duration)*sampleRate)),freq=midi(note);
  for(let i=from;i<to;i++){
    const t=i/sampleRate-start,e=envelope(t,duration,instrument==="pad"?.42:instrument==="bass"?.025:.012,instrument==="pad"?.7:instrument==="bass"?.2:.16,instrument==="pad"?.82:.68),phase=tau*freq*t;
    let v=0;
    if(instrument==="pad")v=Math.sin(phase)+.28*Math.sin(phase*2+.25)+.11*Math.sin(phase*3+.6);
    else if(instrument==="bass")v=Math.sin(phase)+.32*Math.sin(phase*.5)+.12*Math.sin(phase*2);
    else if(instrument==="bell")v=Math.sin(phase)+.42*Math.sin(phase*2.01)*Math.exp(-t*2.8)+.18*Math.sin(phase*3.99)*Math.exp(-t*4.5);
    else v=Math.sin(phase)+.34*Math.sin(phase*2)*Math.exp(-t*4)+.14*Math.sin(phase*3)*Math.exp(-t*7);
    out[i]+=v*e*gain;
  }
}
function addNoise(out,start,duration,gain=.02,seed=1){
  let state=(seed>>>0)||1;const from=Math.max(0,Math.floor(start*sampleRate)),to=Math.min(out.length,Math.ceil((start+duration)*sampleRate));
  for(let i=from;i<to;i++){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const t=i/sampleRate-start,e=envelope(t,duration,.002,.12,.3),white=(state/4294967295)*2-1;
    out[i]+=white*e*gain;
  }
}
function addChord(out,start,duration,notes,gain=.055,instrument="pad"){for(const note of notes)addNote(out,start,duration,note,gain,instrument)}
function finish(out,fade=.08){
  let peak=.001;for(const v of out)peak=Math.max(peak,Math.abs(v));const scale=.88/peak,edge=Math.floor(fade*sampleRate);
  for(let i=0;i<out.length;i++){let f=1;if(i<edge)f=i/edge;if(i>=out.length-edge)f=Math.min(f,(out.length-1-i)/edge);out[i]=Math.tanh(out[i]*scale*1.15)*.86*Math.max(0,f)}
  return out;
}
function wav(out){
  const bytes=out.length*2,b=Buffer.alloc(44+bytes);b.write("RIFF",0);b.writeUInt32LE(36+bytes,4);b.write("WAVE",8);b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(bytes,40);
  for(let i=0;i<out.length;i++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,out[i]))*32767),44+i*2);
  return b;
}
function write(relative,out){const target=path.join(audioRoot,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,wav(finish(out)));console.log(`${relative} ${out.length/sampleRate}s`)}

const themes={
  "exploration.wav":{chords:[[50,53,57,60],[46,50,53,58],[48,53,57,60],[48,52,55,60]],melody:[62,65,69,72,69,67,65,60,62,65,70,69,65,62,60,57],bass:[38,34,36,36]},
  "danger.wav":{chords:[[50,53,56,60],[49,53,56,58],[46,50,53,58],[48,51,55,58]],melody:[74,72,68,65,61,65,68,70,74,73,70,68,63,61,60,58],bass:[38,37,34,36]},
  "sanctuary.wav":{chords:[[48,52,55,60],[45,48,52,57],[53,57,60,64],[55,59,62,67]],melody:[67,69,72,76,74,72,69,67,69,72,77,76,72,71,69,67],bass:[36,33,41,43]},
  "named-enemy.wav":{chords:[[48,51,55,60],[46,50,53,58],[43,48,51,55],[45,48,52,57]],melody:[72,75,79,84,82,79,75,72,70,74,77,82,79,77,74,70],bass:[36,34,31,33]},
  "named-peter-cortens.wav":{chords:[[45,48,52,57],[50,53,57,62],[48,52,55,60],[43,47,50,55]],melody:[69,72,76,81,79,76,72,69,74,77,81,86,84,81,77,74],bass:[33,38,36,31]},
  "named-swanh8ter.wav":{chords:[[51,55,58,63],[46,51,55,58],[48,51,55,60],[43,48,51,55]],melody:[75,79,82,87,86,82,79,75,70,75,79,84,82,79,75,70],bass:[39,34,36,31]},
  "named-syragar.wav":{chords:[[50,54,57,62],[47,50,54,59],[45,50,54,57],[43,47,50,55]],melody:[74,78,81,86,83,81,78,74,71,74,78,83,81,78,74,71],bass:[38,35,33,31]},
  "named-parsnip-celery.wav":{chords:[[53,57,60,65],[48,53,57,60],[50,53,57,62],[46,50,53,58]],melody:[77,81,84,89,88,84,81,77,72,77,81,86,84,81,77,72],bass:[41,36,38,34]},
  "named-cpu.wav":{chords:[[47,50,54,59],[45,50,54,57],[43,47,50,55],[42,47,50,54]],melody:[71,74,78,83,81,78,74,71,69,74,78,81,78,74,71,66],bass:[35,33,31,30]},
  "named-yoshi-yoshi.wav":{chords:[[52,55,59,64],[48,52,55,60],[50,55,59,62],[47,50,55,59]],melody:[76,79,83,88,86,83,79,76,72,76,79,86,83,79,76,71],bass:[40,36,38,35]},
  "count-loadula.wav":{chords:[[38,41,45,50],[37,41,44,49],[34,38,41,46],[36,39,43,48]],melody:[62,0,61,65,56,0,58,53,62,61,0,56,53,51,49,48],bass:[26,25,22,24]}
};

for(const [name,theme] of Object.entries(themes)){
  const out=buffer(12),beat=.75;
  for(let bar=0;bar<4;bar++){
    addChord(out,bar*3,3.05,theme.chords[bar],name==="count-loadula.wav"?.035:.047,"pad");
    addNote(out,bar*3,2.75,theme.bass[bar],name==="count-loadula.wav"?.14:.1,"bass");
  }
  theme.melody.forEach((note,i)=>{if(note)addNote(out,i*beat,beat*.88,note,name==="count-loadula.wav"?.08:.105,i%4===0?"bell":"harp")});
  for(let i=0;i<32;i++){const chord=theme.chords[Math.floor(i/8)],note=chord[i%chord.length]+12;addNote(out,i*.375,.31,note,name==="count-loadula.wav"?.02:.035,"harp")}
  for(let i=0;i<16;i++){if(i%4===0)addNoise(out,i*.75,.13,name==="count-loadula.wav"?.025:.012,700+i);if(name.includes("danger")||name.includes("count"))addNote(out,i*.75,.11,theme.bass[Math.floor(i/4)],.045,"bass")}
  write(`music/${name}`,out);
}

const fanfares={
  "room-enter.wav":[[60,0,.32],[64,.18,.36],[67,.36,.55]],
  "run-win.wav":[[60,0,.6],[64,.2,.6],[67,.4,.6],[72,.65,.9],[76,.85,.9],[79,1.05,1.05]],
  "join.wav":[[55,0,.35],[62,.16,.4],[67,.34,.55]],
  "level-up.wav":[[60,0,.35],[64,.17,.38],[67,.34,.42],[72,.52,.75]],
  "warp.wav":[[48,0,.8],[55,.18,.75],[60,.36,.7],[67,.54,.65],[72,.72,.7]],
  "objective-open.wav":[[50,0,.55],[57,.16,.58],[62,.33,.6],[69,.52,.8]],
  "secret-found.wav":[[57,0,.45],[60,.14,.45],[64,.28,.5],[69,.46,.75]],
  "exit-sigil-found.wav":[[48,0,1.1],[55,.14,1.05],[60,.29,1],[64,.46,.95],[67,.64,.9],[72,.86,1.15]],
  "respawn.wav":[[48,0,.5],[52,.18,.52],[55,.36,.55],[60,.58,.8]]
};
for(const [name,notes] of Object.entries(fanfares)){
  const duration=Math.max(...notes.map(([,s,d])=>s+d))+.18,out=buffer(duration);
  notes.forEach(([note,start,d],i)=>{addNote(out,start,d,note,.16,i===notes.length-1?"bell":"harp");if(i===notes.length-1)addNote(out,start,d,note-12,.07,"pad")});
  write(`sfx/${name}`,out);
}
