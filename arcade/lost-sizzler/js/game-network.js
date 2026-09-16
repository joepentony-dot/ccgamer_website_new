/*
 * C64 Dungeon Carnage retained network compatibility boundary.
 *
 * Networked Dungeon Multiplayer is retired. RoomNetwork is still used as the
 * local session shell by Solo/Split Screen, so the callback/function names
 * below remain as inert compatibility owners until that local session shell is
 * replaced. No packet routing, remote-player simulation or world-sync state is
 * retained here.
 */
function onMembers(_members,_isHost,changed){if(changed&&mode==="playing")sync()}
function onPacket(_event,_payload){}
function onPlayer(_payload){}
function playerStateForNetwork(p){return p?{id:p.id,name:p.name,x:p.x,y:p.y,health:p.health,maxHealth:p.maxHealth}:null}
function sendPlayer(){}
function sendRemotePlayerState(_player){}
function processRemoteMovement(_player){}
function serialWorld(){return null}
function broadcastWorld(){}
function onWorld(_state){}
