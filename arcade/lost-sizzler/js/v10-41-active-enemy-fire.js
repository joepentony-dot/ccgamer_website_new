/* C64 Dungeon Carnage V10.41 — active enemy-fire and Hunter compatibility. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_ACTIVE_ENEMY_FIRE__)return;
  window.__CCG_LOST_SIZZLER_V141_ACTIVE_ENEMY_FIRE__=true;

  const HUNTER_BALANCE=Object.freeze({
    1:Object.freeze({hp:2,moveSpeedScale:1.55}),
    2:Object.freeze({hp:3,moveSpeedScale:1.30}),
    3:Object.freeze({hp:4,moveSpeedScale:1.10}),
    4:Object.freeze({hp:5,moveSpeedScale:.95}),
    5:Object.freeze({hp:6,moveSpeedScale:.82})
  });
  const state={timer:0,aiSource:null,huntersBalanced:0};

  function cardinalEnemyShot(hostState,players,shot){
    if(!shot||!shot.dx||!shot.dy)return shot;
    const enemy=(hostState?.enemies||[]).find(row=>String(row?.id||"")===String(shot.enemyId||""));
    const alive=(players||[]).filter(player=>player&&Number(player.health||0)>0);
    const target=alive.find(player=>String(player.id||"")===String(enemy?.targetId||""))||[...alive].sort((a,b)=>Math.hypot(a.x-(enemy?.x||shot.x),a.y-(enemy?.y||shot.y))-Math.hypot(b.x-(enemy?.x||shot.x),b.y-(enemy?.y||shot.y)))[0];
    if(!target)return Math.abs(Number(shot.dx))>=Math.abs(Number(shot.dy))?{...shot,dx:Math.sign(shot.dx)||1,dy:0}:{...shot,dx:0,dy:Math.sign(shot.dy)||1};
    const ex=Number(enemy?.x??shot.x),ey=Number(enemy?.y??shot.y),ax=Math.abs(Number(target.x)-ex),ay=Math.abs(Number(target.y)-ey);
    return ax>=ay?{...shot,dx:Math.sign(Number(target.x)-ex)||Math.sign(shot.dx)||1,dy:0}:{...shot,dx:0,dy:Math.sign(Number(target.y)-ey)||Math.sign(shot.dy)||1};
  }

  function installEnemyCardinalFire(){
    const ai=window.CCGAI,current=ai?.stepEnemies;if(typeof current!=="function")return false;
    if(current.__ccgV141ActiveEnemyCardinal){state.aiSource=current;return true}
    if(current===state.aiSource)return true;
    const wrapped=function stepEnemiesV141ActiveCardinal(hostState,map,players,dt,hooks={},worldState){
      if(typeof hooks.shoot!=="function")return current.apply(this,arguments);
      const originalShoot=hooks.shoot,patched={...hooks,shoot:(shot,...rest)=>originalShoot(cardinalEnemyShot(hostState,players,shot),...rest)};
      return current.call(this,hostState,map,players,dt,patched,worldState);
    };
    wrapped.__ccgV141ActiveEnemyCardinal=true;wrapped.__ccgOriginal=current;ai.stepEnemies=wrapped;state.aiSource=wrapped;return true;
  }

  function ordinaryHunter(enemy){return Boolean(enemy?.alive&&String(enemy.kind)==="hunter"&&!enemy.follower&&!enemy.horrorCreature&&!enemy.hordeEnemy&&!enemy.hordeWarden&&!enemy.ccgBoss&&!enemy.guardian&&!enemy.champion&&!enemy.passiveNpc)}
  function balanceJoystickHunters(){
    if(document.body?.dataset?.specialMode||!run||!host?.enemies)return 0;
    const floor=Math.max(1,Math.min(5,Number(run.floor)||1)),rule=HUNTER_BALANCE[floor];let changed=0;
    for(const enemy of host.enemies){if(!ordinaryHunter(enemy)||enemy._v141ActiveHunterFloor===floor)continue;const oldMax=Math.max(1,Number(enemy.maxHp||enemy.hp||5)),oldHp=Math.max(1,Number(enemy.hp||oldMax)),damage=Math.max(0,oldMax-oldHp);enemy.maxHp=rule.hp;enemy.hp=Math.max(1,Math.min(rule.hp,rule.hp-damage));enemy.moveSpeedScale=rule.moveSpeedScale;enemy._v141ActiveHunterFloor=floor;changed++}
    state.huntersBalanced+=changed;return changed;
  }
  function tick(){installEnemyCardinalFire();balanceJoystickHunters()}
  tick();state.timer=setInterval(tick,80);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141ActiveEnemyFire=Object.freeze({HUNTER_BALANCE,cardinalEnemyShot,installEnemyCardinalFire,balanceJoystickHunters,get state(){return state}});
})();
