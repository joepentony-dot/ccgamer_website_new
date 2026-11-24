import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';

// Exercise the production page-alignment implementation without depending
// on a browser's automatic scroll restoration or a live website session.
const source=readFileSync(
  new URL('../js/ccg-choose-your-own-adventure.js',import.meta.url),'utf8');
const start=source.indexOf('let readingPositionGeneration=');
const end=source.indexOf("\nfunction render(mode='story')",start);
assert.ok(start>=0&&end>start,'Expected production alignment routine');
const routine=source.slice(start,end);

function harness({mobile=true,pinned=false}={}){
  const callbacks=[],scrolls=[],root={style:{scrollBehavior:'smooth'}};
  const header={
    getBoundingClientRect:()=>({top:0,height:56})
  };
  const targets={
    '.story-page':{isConnected:true,absoluteTop:900},
    '#gamebook':{isConnected:true,absoluteTop:860},
    '.cover':{isConnected:true,absoluteTop:100}
  };
  const win={
    scrollY:1500,
    matchMedia:()=>({matches:mobile}),
    scrollTo(_x,top){scrolls.push(top);this.scrollY=top;}
  };
  const doc={
    documentElement:root,
    querySelector(selector){
      return selector==='[data-ccg-header]'?header:targets[selector]||null;
    }
  };
  for(const t of Object.values(targets)){
    t.getBoundingClientRect=()=>({top:t.absoluteTop-win.scrollY});
  }
  const context={window:win,document:doc,
    getComputedStyle:()=>({position:pinned?'sticky':'static'}),
    requestAnimationFrame:callback=>{callbacks.push(callback);}
  };
  runInNewContext(routine,context);
  const pump=()=>{
    const length=callbacks.length;
    for(let n=0;n<length;n++)callbacks.shift()();
  };
  return {context,root,targets,win,scrolls,pump,callbacks};
}

test('mobile choice places the story opening below a pinned header',()=>{
  const h=harness({mobile:true,pinned:true});
  runInNewContext("positionPageForReading('story')",h.context);
  assert.equal(h.win.scrollY,832); // 900 - (56 + 12)
  assert.equal(h.root.style.scrollBehavior,'auto');
  h.pump();
  h.targets['.story-page'].absoluteTop=920; // viewport/layout adjustment
  h.pump();
  assert.equal(h.win.scrollY,852);
  assert.equal(h.root.style.scrollBehavior,'smooth');
});

test('rapid page turns restore the original scroll setting once',()=>{
  const h=harness();
  runInNewContext("positionPageForReading('story')",h.context);
  h.targets['.story-page'].isConnected=false;
  const next={isConnected:true,absoluteTop:1120};
  next.getBoundingClientRect=()=>({top:next.absoluteTop-h.win.scrollY});
  h.targets['.story-page']=next;
  runInNewContext("positionPageForReading('story')",h.context);
  assert.equal(h.root.style.scrollBehavior,'auto');
  h.pump(); // stale page callback is ignored, latest schedules final alignment
  h.pump(); // latest restores initial value
  assert.equal(h.root.style.scrollBehavior,'smooth');
  assert.equal(h.win.scrollY,1108); // 1120 - 12, no header overlap
});

test('desktop story opens at spread top; cover opens at its own top',()=>{
  const h=harness({mobile:false});
  runInNewContext("positionPageForReading('story')",h.context);
  assert.equal(h.win.scrollY,848);
  h.pump();h.pump();
  runInNewContext("positionPageForReading('cover')",h.context);
  assert.equal(h.win.scrollY,88);
  h.pump();h.pump();
  assert.equal(h.root.style.scrollBehavior,'smooth');
});
