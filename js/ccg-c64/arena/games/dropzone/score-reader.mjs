/**
 * Exact U.S. Gold Dropzone CRT: local, read-only HUD character decoder.
 *
 * Provenance: owner-hosted `dropzone.crt` SHA-256
 * 0bed973b322510b8a8b717fc7305ec54246dc3b00c0aa0f701702864c92253c7.
 * Real unmodified C64 PAL RAM captures from GitHub Actions run 44551661979:
 * at 350f game score = 0; at 800f score = 10, in two independent joystick
 * fire-edge trials. Screenshot and screen-character memory agree.
 *
 * NO run completion test, authenticity proof or server score authority.
 */
export const DROPZONE_SCORE_LAYOUT = Object.freeze({
  screenBase:0xB800,
  row:20,
  firstColumn:0,
  digits:7,
  firstAddress:0xBB20,
  lastAddress:0xBB26,
  blankCode:10
});

const HUD_SENTINEL = Object.freeze([21,22,23,24,25,26,27,28,29]);

export function readDropzoneHudScore(ram,{screenBase}={}) {
  if(!(ram instanceof Uint8Array) || ram.length!==65536 ||
     screenBase!==DROPZONE_SCORE_LAYOUT.screenBase) return null;
  for(let k=0;k<HUD_SENTINEL.length;k++) {
    if(ram[0xBB27+k]!==HUD_SENTINEL[k])return null;
  }
  let score=0, seenDigit=false, significant=false;
  for(let p=DROPZONE_SCORE_LAYOUT.firstAddress;
      p<=DROPZONE_SCORE_LAYOUT.lastAddress;p++){
    const code=ram[p];
    if(code===DROPZONE_SCORE_LAYOUT.blankCode&&!seenDigit)continue;
    if(code>9)return null;
    seenDigit=true;
    score=score*10+code;
    if(code!==0)significant=true;
  }
  if(!seenDigit)return null;
  return score;
}
