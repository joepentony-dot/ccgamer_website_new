/**
 * Dropzone CRT: local GAME OVER video detector and local-only run observer.
 * The two 384x272 PAL screen fingerprints are taken from untouched original-
 * ROM video in GitHub Actions run 44555004560. GAME OVER is visible from
 * captured relative frame 2750 to 3350, after a real displayed 280 score.
 * The variable third-row rank message is deliberately not part of the match.
 *
 * Not a trusted run, never a network submission or public leaderboard entry.
 */
import { readDropzoneHudScore } from "./score-reader.mjs";
const WIDTH=384,HEIGHT=272;
export const DROPZONE_TERMINAL_STABLE_FRAMES=25;
const BANDS=Object.freeze([
  Object.freeze({x0:135,x1:262,y0:77,y1:84,bits:448,hex:"f070b0f00f0b0f0e9050f080090b080a8050f080090b080ab0f0f0f00b0b0f0fb0d0b0c00b0b0c0fb0d0b0c00b060c0ff0d0b0f00f060f0f"}),
  Object.freeze({x0:151,x1:246,y0:93,y1:100,bits:336,hex:"bfbe0e7ba0ffb9ba0a5fa068b9ba0a5fa06ffbbf0ffbf0616bbf0fdbb06d6bbf0fdbb06d6fff0fdbb0ff"})
]);
const MASKS=BANDS.map(b=>Uint8Array.from({length:b.hex.length/2},
  (_,i)=>Number.parseInt(b.hex.slice(i*2,i*2+2),16)));

export function dropzoneGameOverVisible(frame) {
  if(!(frame instanceof Uint8Array || frame instanceof Uint8ClampedArray) ||
     frame.length!==WIDTH*HEIGHT*4) return false;
  for(let group=0;group<BANDS.length;group++){
    const band=BANDS[group],expected=MASKS[group];
    let sample=0,mismatches=0;
    const allowed=Math.floor(band.bits*0.025);
    for(let y=band.y0;y<band.y1;y++)for(let x=band.x0;x<band.x1;x+=2){
      const p=(y*WIDTH+x)*4;
      const bright=frame[p]>180&&frame[p+1]>180&&frame[p+2]>180;
      const target=(expected[sample>>3]&(128>>(sample&7)))!==0;
      if(bright!==target&&++mismatches>allowed)return false;
      sample++;
    }
    if(sample!==band.bits)return false;
  }
  return true;
}

export class DropzoneLocalRunObserver {
  constructor({terminalFrames=DROPZONE_TERMINAL_STABLE_FRAMES}={}){
    if(!Number.isSafeInteger(terminalFrames)||terminalFrames<2||terminalFrames>100)
      throw new RangeError("Invalid terminal frame count");
    this.terminalFrames=terminalFrames;
    this.reset();
  }
  reset(){
    this.sawZero=false;
    this.sawIncrease=false;
    this.lastScore=null;
    this.terminalCount=0;
    this.completed=null;
  }
  observe({ram,screenBase,frameBuffer}={}){
    const score=readDropzoneHudScore(ram,{screenBase});
    const gameOver=dropzoneGameOverVisible(frameBuffer);
    if(this.completed){
      if(score===0&&!gameOver)this.reset();
      else return Object.freeze({phase:"completed",score:this.completed.score,
        justCompleted:false,localOnly:true});
    }
    if(score===null){
      if(!gameOver)this.reset();
      return Object.freeze({phase:"inactive",score:null,justCompleted:false,localOnly:true});
    }
    if(this.lastScore!==null&&score<this.lastScore)this.reset();
    if(score===0)this.sawZero=true;
    if(this.sawZero&&this.lastScore!==null&&score>this.lastScore)this.sawIncrease=true;
    this.lastScore=score;
    this.terminalCount=gameOver?this.terminalCount+1:0;
    if(gameOver&&this.terminalCount>=this.terminalFrames&&
       this.sawZero&&this.sawIncrease&&score>0){
      this.completed=Object.freeze({score,trust:"local-display-only"});
      return Object.freeze({phase:"completed",score,justCompleted:true,localOnly:true});
    }
    return Object.freeze({phase:gameOver?"terminal":"active",score,
      justCompleted:false,localOnly:true});
  }
}
