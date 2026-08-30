import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const loader=fs.readFileSync(path.join(root,"js/v10-41-lake-item-safety.js"),"utf8");
const src=fs.readFileSync(path.join(root,"js/v10-41-r50-multiplayer-recovery-ux.js"),"utf8");

assert.match(loader,/v10-41-r50-multiplayer-recovery-ux\.js/,"late loader must publish r50");
assert.match(src,/CCGLostSizzlerV141R38ColyseusHorde/,"r50 must observe Horde server state");
assert.match(src,/CCGLostSizzlerV141R40ColyseusDungeon/,"r50 must observe Dungeon transport state");
assert.match(src,/CCGLostSizzlerV141R41ColyseusSpy/,"r50 must observe Spy transport state");
assert.match(src,/Gameplay is using the safe fallback transport while the dedicated server reconnects/,"fallback must be explained in player-facing language");
assert.match(src,/PLAYER DISCONNECTED/,"member loss must be surfaced");
assert.match(src,/PLAYER CONNECTED/,"member joins must be surfaced");
assert.match(src,/MULTIPLAYER RECOVERED/,"transport recovery must be surfaced");
assert.match(src,/Return to Online Menu/,"hard loss must offer a safe escape route");
assert.match(src,/state\.lastRoomCode/,"room code must be retained across return-to-menu flow");
assert.match(src,/document\.getElementById\("room-code"\)/,"rejoin flow must restore the room code into the canonical room input");
assert.match(src,/quitToMenu/,"r50 must delegate leaving gameplay to the canonical quit path");
for(const forbidden of [/net\.send\s*=/,/net\.send\(/,/room\.send\(/,/joinOrCreate\(/,/p1\.x\s*=/,/health\s*[-+]=/,/host\.enemies\s*=/,/Supabase/i])assert.doesNotMatch(src,forbidden,"r50 must remain a presentation/recovery UX layer");
console.log("Lost Sizzler V10.41 r50 multiplayer recovery UX ownership contract passed.");
