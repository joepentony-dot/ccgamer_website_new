/* C64 Dungeon Carnage V10.42 — authoritative open-exit movement handoff. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142FloorExitHandoff)return;

  const source=window.movePlayer;
  const diagnostics={moves:0,openExitEntries:0,handoffs:0,alreadyCompleted:0,lastPlayer:"",lastFloor:0};

  function isOpenExitEntry(player,beforeX,beforeY){
    if(!player||typeof source!=="function")return false;
    if(String(mode||"")!=="playing")return false;
    if(!host?.exitOpen||!world?.exit)return false;
    if(!run||run.floorComplete)return false;
    const exitX=Number(world.exit.x),exitY=Number(world.exit.y);
    if(Number(player.x)!==exitX||Number(player.y)!==exitY)return false;
    return Number(beforeX)!==exitX||Number(beforeY)!==exitY;
  }

  function movePlayerV142FloorExitHandoff(player,dx,dy){
    const beforeX=player?.x,beforeY=player?.y;
    const result=source.apply(this,arguments);
    diagnostics.moves++;

    if(!isOpenExitEntry(player,beforeX,beforeY)){
      if(run?.floorComplete)diagnostics.alreadyCompleted++;
      return result;
    }

    diagnostics.openExitEntries++;
    diagnostics.lastPlayer=String(player?.name||"");
    diagnostics.lastFloor=Math.max(0,Number(run?.floor)||Number(run?.depth)||0);

    /*
     * The legacy movement wrapper chain can move the player onto the real open
     * exit without reaching game-play.js's canonical floorComplete callback.
     * Repair only that lost callback. floorComplete remains the sole owner of
     * completion state/overlay, and the existing Descend Deeper binding remains
     * the sole owner that invokes descendFloor().
     */
    if(typeof floorComplete==="function"){
      diagnostics.handoffs++;
      floorComplete(player?.name||"");
    }
    return result;
  }

  movePlayerV142FloorExitHandoff.__ccgV142FloorExitHandoff=true;
  movePlayerV142FloorExitHandoff.__ccgOriginal=source;
  window.movePlayer=movePlayerV142FloorExitHandoff;

  window.CCGLostSizzlerV142FloorExitHandoff=Object.freeze({
    version:"V10.42-floor-exit-handoff",
    diagnostics,
    ownsBoundary:()=>window.movePlayer===movePlayerV142FloorExitHandoff
  });
})();
