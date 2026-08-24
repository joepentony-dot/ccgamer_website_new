(()=>{
  // Keep one uninterrupted Exploration music state across all ordinary rooms
  // and corridors. Only genuine special-room flags are allowed to replace it.
  if(window.__CCG_LOST_SIZZLER_CONTINUOUS_EXPLORATION__)return;
  window.__CCG_LOST_SIZZLER_CONTINUOUS_EXPLORATION__=true;

  if(typeof roomMoodFor!=="function")return;

  const continuousRoomMoodFor=roomId=>{
    const room=world?.rooms?.[roomId];
    if(!room)return "normal";
    if(room.sanctuary)return "sanctuary";
    if(room.dangerous)return "danger";
    return "normal";
  };

  // game-play.js calls this global function whenever the player crosses a room
  // boundary. Replacing the legacy area-theme map means ordinary room ->
  // corridor -> ordinary room remains the same "normal" soundtrack state, so
  // the current Exploration track is not restarted or changed.
  roomMoodFor=continuousRoomMoodFor;
})();
