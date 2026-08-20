(function(){
  "use strict";
  const CCG = window.CCGQuest = window.CCGQuest || {};
  CCG.W = 1600; CCG.H = 900;
  CCG.GROUND = 735;
  CCG.clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  CCG.lerp = (a,b,t)=>a+(b-a)*t;
  CCG.rand = (a,b)=>a+Math.random()*(b-a);
  CCG.pick = arr=>arr[(Math.random()*arr.length)|0];
  CCG.now = ()=>performance.now();
  CCG.rectHit = (a,b)=>a.x < b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
  CCG.easeOut = t=>1-Math.pow(1-t,3);
  CCG.fmt = n=>Math.max(0,Math.floor(n)).toLocaleString("en-GB");
  CCG.Input = class {
    constructor(canvas){
      this.keys = Object.create(null); this.pressed = Object.create(null); this.canvas=canvas;
      addEventListener('keydown',e=>{ const k=e.code; if(!this.keys[k]) this.pressed[k]=true; this.keys[k]=true; if(['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(k)) e.preventDefault(); });
      addEventListener('keyup',e=>{ this.keys[e.code]=false; });
    }
    down(...codes){ return codes.some(c=>!!this.keys[c]); }
    tap(...codes){ for(const c of codes){ if(this.pressed[c]){ delete this.pressed[c]; return true; } } return false; }
    clear(){ this.pressed=Object.create(null); }
    setVirtual(name,on){ const map={left:'ArrowLeft',right:'ArrowRight',jump:'Space',duck:'ArrowDown',fire:'KeyZ',kick:'KeyC'}; const c=map[name]; if(!c)return; if(on&&!this.keys[c])this.pressed[c]=true; this.keys[c]=on; }
  };
  CCG.AssetLoader = class {
    constructor(){ this.images={}; }
    image(key,src){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>{this.images[key]=im;res(im)}; im.onerror=()=>rej(new Error('Unable to load '+src)); im.src=src; }); }
    optionalImage(key,src){ if(!src)return Promise.resolve(null); return new Promise((res)=>{ const im=new Image(); im.onload=()=>{this.images[key]=im;res(im)}; im.onerror=()=>{console.warn('[CCG QUEST] Optional image unavailable:',src);res(null)}; im.src=src; }); }
    get(k){return this.images[k];}
  };
})();
