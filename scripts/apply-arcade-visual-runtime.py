from pathlib import Path
import re

engine_path = Path('arcade/quest/game/main-v2.js')
validator_path = Path('scripts/validate-arcade-quest.js')
engine = engine_path.read_text(encoding='utf-8')
validator = validator_path.read_text(encoding='utf-8')

# Load layered scenery and sprite sheets through the existing AssetLoader.
needle = "jobs.push(assets.optionalImage('mascot_source','/resources/images/ccgamer-logo.png'));"
addition = needle + "for(const scene of ['bedroom','beads','budget','fighter','invaders','christmas','maze','amiga','guru'])for(const suffix of ['Back','Mid','Front'])jobs.push(assets.optionalImage('layer_'+scene+suffix,Q.customAsset?.('layers',scene+suffix)));for(const key of ['player','fighter','enemy','bossBedroom','bossBudget','bossChristmas','bossAmiga','bossGuru'])jobs.push(assets.optionalImage('sheet_'+key,Q.customAsset?.('spritesheets',key)));"
if "'sheet_'+key" not in engine:
    if needle not in engine:
        raise SystemExit('Unable to find asset-load insertion point')
    engine = engine.replace(needle, addition, 1)

# Replace background renderer with layered support.
layered_bg = """function drawLayer(id,suffix){const im=assets.get('layer_'+id+suffix);if(im)ctx.drawImage(im,0,0,Q.W,Q.H);}\nfunction foreground(id){drawLayer(id,'Front');}\nfunction bg(id){const im=assets.get('custom_bg_'+id)||assets.get('bg_'+id);if(im)ctx.drawImage(im,0,0,Q.W,Q.H);else{const pal={bedroom:['#19133a','#39284c'],budget:['#101b2d','#4c2d25'],christmas:['#162e32','#402044'],amiga:['#06192c','#192868'],guru:['#13020b','#460811'],beads:['#341d65','#111128'],fighter:['#8072b7','#302b5a'],invaders:['#02040f','#08102a'],maze:['#08010f','#15072c']}[id]||['#111','#222'],g=ctx.createLinearGradient(0,0,0,Q.H);g.addColorStop(0,pal[0]);g.addColorStop(1,pal[1]);ctx.fillStyle=g;ctx.fillRect(0,0,Q.W,Q.H);}drawLayer(id,'Back');drawLayer(id,'Mid');}\nfunction drawLine"""
if 'function drawLayer(id,suffix)' not in engine:
    engine, count = re.subn(r"function bg\(id\)\{.*?\}\nfunction drawLine", layered_bg, engine, count=1, flags=re.S)
    if count != 1:
        raise SystemExit('Unable to replace background renderer')

# Generic sprite-sheet helpers inside the engine, including member-avatar head overlay.
helper = """function playerSpriteState(){if(P.stun>0)return'hit';if(P.attack)return P.attack;if(P.duck&&P.ground)return P.fire>0?'duckFire':'duck';if(!P.ground)return P.vy<0?'jump':'fall';if(P.fire>0)return'fire';if(Math.abs(P.vx)>38)return'run';return'idle';}\nfunction drawPlayerSheet(){const im=assets.get('sheet_player'),meta=Q.customAssetMeta?.('spritesheets','player');if(!im||!meta||typeof Q.drawSpriteSheet!=='function')return false;const w=Number(meta.drawWidth)||150,h=Number(meta.drawHeight)||190,cx=P.x+P.w/2,x=cx-w/2,y=Q.GROUND-h,face=P.face||1;if(!Q.drawSpriteSheet(ctx,im,meta,playerSpriteState(),S.time,x,y,w,h,face))return false;if(meta.avatarHead!==false){const headSize=Number(meta.headSize)||Math.min(92,h*.42),headTop=y+(Number(meta.headOffsetY)||0);drawHead(cx,headTop,headSize,face);}bar(P.x-14,P.y-34,108,P.hp/P.max,'#62ed8e');if(now()<P.shield){const rem=clamp((P.shield-now())/7600,0,1);ctx.strokeStyle=rem<.25?'#ffd45d':'#70efff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(cx,P.y+62,78,-Math.PI/2,-Math.PI/2+Math.PI*2*rem);ctx.stroke();}return true;}\n"""
if 'function drawPlayerSheet()' not in engine:
    marker = 'function drawPlayer(){'
    if marker not in engine:
        raise SystemExit('Unable to find player renderer')
    engine = engine.replace(marker, helper + "function drawPlayer(){if(drawPlayerSheet())return;", 1)

# Tier-Tex sprite sheet takes priority over static individual sprites.
old = "function drawEnemyFighter(f){let im=assets.get('fighter_enemy');"
new = "function drawEnemyFighter(f){const sheet=assets.get('sheet_fighter'),sheetMeta=Q.customAssetMeta?.('spritesheets','fighter');if(sheet&&sheetMeta&&typeof Q.drawSpriteSheet==='function'){const state=f.stun>0?'hit':f.attack==='punch'?'punch':f.attack==='kick'?'kick':!f.ground?'jump':Math.abs(f.vx)>55?'walk':f.guard>0?'guard':'idle';if(Q.drawSpriteSheet(ctx,sheet,sheetMeta,state,S.time,f.x-62,f.y-4,124,158,f.face||-1))return;}let im=assets.get('fighter_enemy');"
if 'sheetMeta=Q.customAssetMeta' not in engine:
    if old not in engine:
        raise SystemExit('Unable to find Tier-Tex renderer')
    engine = engine.replace(old, new, 1)

# Generic 8-bit enemies can use one reusable animated sheet.
old = "else if(e.k==='enemy'){ctx.fillStyle=e.variant==='low'?'#10202a':'#19141e';"
new = "else if(e.k==='enemy'){const sheet=assets.get('sheet_enemy'),sheetMeta=Q.customAssetMeta?.('spritesheets','enemy');if(sheet&&sheetMeta&&typeof Q.drawSpriteSheet==='function'&&Q.drawSpriteSheet(ctx,sheet,sheetMeta,e.variant==='low'?'low':'run',S.time+e.t,e.x,e.y,e.w,e.h,e.vx>=0?1:-1)){}else{ctx.fillStyle=e.variant==='low'?'#10202a':'#19141e';"
if "assets.get('sheet_enemy')" not in engine:
    if old not in engine:
        raise SystemExit('Unable to find 8-bit enemy renderer')
    engine = engine.replace(old, new, 1)
    tail = "text(e.variant==='low'?'LOW 8BIT':'8BIT',e.x+e.w/2,e.y+(e.variant==='low'?30:42),e.variant==='low'?11:13,e.variant==='low'?'#ffe56e':'#7eeaff','center');}else if(e.k==='haz')"
    if tail not in engine:
        raise SystemExit('Unable to close animated 8-bit enemy fallback')
    engine = engine.replace(tail, "text(e.variant==='low'?'LOW 8BIT':'8BIT',e.x+e.w/2,e.y+(e.variant==='low'?30:42),e.variant==='low'?11:13,e.variant==='low'?'#ffe56e':'#7eeaff','center');}}else if(e.k==='haz')", 1)

# Boss sprite sheets take priority over static boss art.
old = "function drawBoss(){const b=S.boss;if(!b)return;const st=Q.STAGES[S.stage],im=assets.get('boss_'+st.id);if(im)ctx.drawImage(im,b.x-b.w/2,b.y-b.h/2,b.w,b.h);else{"
new = "function drawBoss(){const b=S.boss;if(!b)return;const st=Q.STAGES[S.stage],sheetKey='boss'+st.id.charAt(0).toUpperCase()+st.id.slice(1),sheet=assets.get('sheet_'+sheetKey),sheetMeta=Q.customAssetMeta?.('spritesheets',sheetKey),im=assets.get('boss_'+st.id);if(sheet&&sheetMeta&&typeof Q.drawSpriteSheet==='function'&&Q.drawSpriteSheet(ctx,sheet,sheetMeta,b.warn>0?'charge':'idle',S.time,b.x-b.w/2,b.y-b.h/2,b.w,b.h,b.dir||-1)){}else if(im)ctx.drawImage(im,b.x-b.w/2,b.y-b.h/2,b.w,b.h);else{"
if "sheetKey='boss'" not in engine:
    if old not in engine:
        raise SystemExit('Unable to find boss renderer')
    engine = engine.replace(old, new, 1)

# Foreground layer is rendered after actors/hazards but before the global HUD.
replacements = [
    ("function drawStage(){bg(Q.STAGES[S.stage]?.id||'bedroom');drawEntities();drawShots();drawPlayer();if(S.mode==='boss')drawBoss();drawHUD();}", "function drawStage(){const id=Q.STAGES[S.stage]?.id||'bedroom';bg(id);drawEntities();drawShots();drawPlayer();if(S.mode==='boss')drawBoss();foreground(id);drawHUD();}"),
    ("function drawBeads(){bg('beads');drawEntities();drawShots();drawPlayer();drawHUD();}", "function drawBeads(){bg('beads');drawEntities();drawShots();drawPlayer();foreground('beads');drawHUD();}"),
    ("function drawFighter(){bg('fighter');drawPlayer();drawEnemyFighter(S.fighter);", "function drawFighter(){bg('fighter');drawPlayer();drawEnemyFighter(S.fighter);foreground('fighter');"),
]
for old, new in replacements:
    if new not in engine:
        if old not in engine:
            raise SystemExit('Unable to add foreground layer to a scene renderer')
        engine = engine.replace(old, new, 1)

# For the two self-contained mini-games, place foreground immediately before returning to draw().
inv_tail = "text(`ALIENS ${g.aliens.filter(a=>a.alive).length}`,1540,850,16,'#fff','right');}"
if "foreground('invaders')" not in engine:
    if inv_tail not in engine:
        raise SystemExit('Unable to add Alien Formation foreground')
    engine = engine.replace(inv_tail, "text(`ALIENS ${g.aliens.filter(a=>a.alive).length}`,1540,850,16,'#fff','right');foreground('invaders');}", 1)
maze_tail = "if(m.powered>0)text(`BUG SLOW ${m.powered.toFixed(1)}s — CONTACT STILL HURTS`,1540,850,14,'#72eaff','right');}"
if "foreground('maze')" not in engine:
    if maze_tail not in engine:
        raise SystemExit('Unable to add Dot-Maze foreground')
    engine = engine.replace(maze_tail, "if(m.powered>0)text(`BUG SLOW ${m.powered.toFixed(1)}s — CONTACT STILL HURTS`,1540,850,14,'#72eaff','right');foreground('maze');}", 1)

# Extend validation for the visual runtime.
checks = [
    ("  'game/remote-assets.js',\n", "  'game/remote-assets.js',\n  'game/sprite-runtime.js',\n"),
]
for old, new in checks:
    if "'game/sprite-runtime.js'" not in validator:
        if old not in validator:
            raise SystemExit('Unable to add sprite runtime script validation')
        validator = validator.replace(old, new, 1)

anchor = "expectContains('arcade/quest/game/main-v2.js', main, 'player_avatar', 'member avatar head rendering');\n"
extra = "expectContains('arcade/quest/game/main-v2.js', main, \"assets.get('sheet_player')\", 'player sprite sheet renderer');\nexpectContains('arcade/quest/game/main-v2.js', main, \"assets.get('sheet_fighter')\", 'Tier-Tex sprite sheet renderer');\nexpectContains('arcade/quest/game/main-v2.js', main, \"assets.get('sheet_enemy')\", '8-bit enemy sprite sheet renderer');\nexpectContains('arcade/quest/game/main-v2.js', main, \"drawLayer(id,'Back')\", 'layered background renderer');\nexpectContains('arcade/quest/game/main-v2.js', main, \"foreground(id)\", 'foreground scenery renderer');\n"
if "'player sprite sheet renderer'" not in validator:
    if anchor not in validator:
        raise SystemExit('Unable to add visual runtime validation checks')
    validator = validator.replace(anchor, anchor + extra, 1)

engine_path.write_text(engine, encoding='utf-8')
validator_path.write_text(validator, encoding='utf-8')
print('Applied Commodore Quest visual runtime integration.')
