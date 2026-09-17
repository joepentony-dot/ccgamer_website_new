/*
 * C64 Dungeon Carnage retained network compatibility boundary.
 *
 * Networked Dungeon Multiplayer is retired. RoomNetwork is still used as the
 * local session shell by Solo/Split Screen, so only the callbacks still passed
 * to that shell and the no-op broadcast hook still called by local gameplay are
 * retained here. No packet routing, remote-player simulation or world-sync
 * state is retained.
 */
function onMembers(_members,_isHost,changed){if(changed&&mode==="playing")sync()}
function onPacket(_event,_payload){}
function broadcastWorld(){}
