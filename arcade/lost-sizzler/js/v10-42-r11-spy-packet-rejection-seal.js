/* The Lost Sizzler V10.42 r11 — transactional Spy packet rejection seal.
 * Rejected dedicated Spy position packets must be observationally inert. If a
 * retained wrapper mutates the addressed rival before returning false, restore
 * that actor's exact pre-packet remote presentation entry. No movement, timing,
 * networking, persistence or render-loop ownership is introduced here.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_R11_SPY_PACKET_REJECTION_SEAL__)return;
  window.__CCG_LOST_SIZZLER_V142_R11_SPY_PACKET_REJECTION_SEAL__=true;

  const network=window.CCGLostSizzlerV141R29SpyNetwork;
  if(!network||typeof network.applyPosition!=="function")return;

  const state={installed:false,rejections:0,rollbacks:0};
  const original=network.applyPosition.bind(network);

  function actorFrom(payload){return String(payload?.actorId||payload?.player?.id||"")}
  function remoteMap(){try{return typeof remote!=="undefined"&&remote?.get&&remote?.set&&remote?.delete?remote:null}catch(_){return null}}

  function applyPositionTransactional(payload){
    const id=actorFrom(payload),map=remoteMap();
    const had=Boolean(id&&map?.has?.(id));
    const before=had?map.get(id):undefined;
    const result=original(payload);
    if(result!==false)return result;
    state.rejections++;
    if(!id||!map)return false;
    const hasNow=Boolean(map.has(id));
    const now=hasNow?map.get(id):undefined;
    if(had){
      if(!hasNow||now!==before){map.set(id,before);state.rollbacks++}
    }else if(hasNow){
      map.delete(id);state.rollbacks++
    }
    return false;
  }
  applyPositionTransactional.__ccgV142R11SpyPacketRejectionSeal=true;
  applyPositionTransactional.__ccgOriginal=network.applyPosition;

  network.applyPosition=applyPositionTransactional;
  state.installed=true;
  window.CCGLostSizzlerV142R11SpyPacketRejectionSeal={state,applyPosition:applyPositionTransactional};
})();
