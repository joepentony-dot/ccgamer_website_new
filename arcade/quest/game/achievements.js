(function(){
  "use strict";
  const Q=window.CCGQuest;
  const KEY='ccg.quest.engine.profile.v1';
  const DEF={best:0,xp:0,unlocked:{},totals:{runs:0,pickups:0,tapes:0,cleanJumps:0,bosses:0,kills:0,shieldBlocks:0,fighterWins:0,scoreLifetime:0}};
  const catalog=[
    ['first_run','Booted Up','Start your first run.',25,'bronze',p=>[p.totals.runs,1]],
    ['score10','Five Figures','Score 10,000 in one run.',50,'bronze',p=>[p.runScore,10000]],
    ['score25','Serious Business','Score 25,000 in one run.',75,'silver',p=>[p.runScore,25000]],
    ['score50','Joystick Warranty Void','Score 50,000 in one run.',125,'gold',p=>[p.runScore,50000]],
    ['tapes25','Tape Head','Collect 25 tapes across runs.',50,'bronze',p=>[p.totals.tapes,25]],
    ['pickups100','Shelf Clearer','Collect 100 pickups across runs.',80,'silver',p=>[p.totals.pickups,100]],
    ['boss1','Bossed It','Defeat your first boss.',50,'bronze',p=>[p.totals.bosses,1]],
    ['boss10','Boss Rush','Defeat 10 bosses across runs.',120,'gold',p=>[p.totals.bosses,10]],
    ['shield3','Action Replay Saved Me','Block 3 hits with the shield.',60,'bronze',p=>[p.totals.shieldBlocks,3]],
    ['shield10','Trainer Menu','Block 10 hits with the shield.',100,'silver',p=>[p.totals.shieldBlocks,10]],
    ['bead5','Electric Footwork','Clear 5 electric beads cleanly.',60,'bronze',p=>[p.totals.cleanJumps,5]],
    ['bead15','Bruce Would Approve','Clear 15 electric beads cleanly.',120,'gold',p=>[p.totals.cleanJumps,15]],
    ['beadperfect','No Burn Marks','Finish the Bead Run without damage.',150,'gold',p=>[p.flags.beadPerfect?1:0,1]],
    ['fighter','36% Survivor','Win the conversion parody bout.',100,'silver',p=>[p.totals.fighterWins,1]],
    ['fightercombo','Found the Hitbox','Land a 5-hit fighter combo.',125,'gold',p=>[p.flags.fighterCombo?1:0,1]],
    ['alien','Formation Breaker','Clear the Alien Formation.',110,'silver',p=>[p.flags.alienFormation?1:0,1]],
    ['maze','Dot Gobbler','Clear the Dot-Maze Run.',110,'silver',p=>[p.flags.mazeClear?1:0,1]],
    ['budget','Full Price Refund','Defeat the Full Price boss.',75,'silver',p=>[p.flags.budgetBoss?1:0,1]],
    ['christmas','Escaped Gran\'s','Defeat the Christmas boss.',75,'silver',p=>[p.flags.xmasBoss?1:0,1]],
    ['amiga','16-Bit Upgrade','Reach the Amiga stage.',80,'silver',p=>[p.flags.amiga?1:0,1]],
    ['guru','Meditate On This','Reach Guru Meditation.',100,'gold',p=>[p.flags.guru?1:0,1]],
    ['legend','Commodore Legend','Finish the full quest.',250,'gold',p=>[p.flags.won?1:0,1]],
    ['onecredit','One Credit Clear','Finish without losing a life.',300,'gold',p=>[p.flags.oneCredit?1:0,1]],
    ['nodamageboss','Untouchable','Defeat any boss without taking damage.',120,'gold',p=>[p.flags.noDamageBoss?1:0,1]],
    ['kills25','Pixel Pest Control','Destroy 25 enemies across runs.',75,'silver',p=>[p.totals.kills,25]],
    ['lifetime100k','Committed','Score 100,000 points across all runs.',100,'silver',p=>[p.totals.scoreLifetime,100000]]
  ].map(a=>({id:a[0],name:a[1],desc:a[2],xp:a[3],tier:a[4],progress:a[5]}));
  class Achievements{
    constructor(onUnlock){this.onUnlock=onUnlock;this.profile=this.load();this.runScore=0;this.flags={};}
    load(){try{return Object.assign({},structuredClone(DEF),JSON.parse(localStorage.getItem(KEY)||'{}'),{totals:Object.assign({},DEF.totals,(JSON.parse(localStorage.getItem(KEY)||'{}').totals||{})),unlocked:Object.assign({},JSON.parse(localStorage.getItem(KEY)||'{}').unlocked||{})});}catch(e){return structuredClone(DEF)}}
    save(){localStorage.setItem(KEY,JSON.stringify(this.profile));}
    startRun(){this.runScore=0;this.flags={};this.profile.totals.runs++;this.check();this.save();}
    add(field,n=1){this.profile.totals[field]=(this.profile.totals[field]||0)+n;this.check();this.save();}
    score(n){this.runScore=Math.max(this.runScore,n);this.check();}
    flag(k,v=true){this.flags[k]=v;this.check();}
    check(){const p={...this.profile,runScore:this.runScore,flags:this.flags};for(const a of catalog){if(this.profile.unlocked[a.id])continue;const [v,t]=a.progress(p);if(v>=t){this.profile.unlocked[a.id]=Date.now();this.profile.xp+=a.xp;this.save();this.onUnlock&&this.onUnlock(a);}}}
    rank(){const x=this.profile.xp;return x>=2600?'COMMODORE LEGEND':x>=1800?'GURU SURVIVOR':x>=1100?'PORT SURVIVOR':x>=650?'DISK SWAPPER':x>=300?'BUDGET HUNTER':x>=100?'TAPE LOADER':'NEW RECRUIT';}
    entries(){const p={...this.profile,runScore:this.runScore,flags:this.flags};return catalog.map(a=>{const [v,t]=a.progress(p);return {...a,value:v,target:t,done:!!this.profile.unlocked[a.id]};});}
  }
  Q.Achievements=Achievements;
})();
