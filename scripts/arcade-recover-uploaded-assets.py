#!/usr/bin/env python3
from __future__ import annotations

from collections import deque
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
import hashlib
import json

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'arcade/quest/assets/production'
BASE = 'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/'

SOURCES = {
    'sheet_enemy': 'spritesheets/enemy/1787258574654-8bit-enemy-sheet.png',
    'sheet_fighter': 'spritesheets/fighter/1787258645257-tiertex-sheet.png',
    'sheet_player_fight': 'spritesheets/player/1787258799512-cheeky-player-sheet.png',
    'fighter_idle': 'fighter/enemy/1787258700065-tiertex-idle.png',
    'fighter_punch': 'fighter/enemyPunch/1787258720490-tiertex-punch.png',
    'fighter_kick': 'fighter/enemyKick/1787258739761-tiertex-kick.png',
    'fighter_hit': 'fighter/enemyHit/1787258762308-tiertex-hit.png',
    'collectible_tape': 'collectibles/tape/1787258419343-tape.png',
    'collectible_disk': 'collectibles/disk/1787258431972-disk.png',
    'collectible_zzap': 'collectibles/zzap/1787258444253-zzap.png',
    'collectible_joystick': 'collectibles/joystick/1787258455320-joystick.png',
    'power_shield': 'powers/shield/1787258495642-shield.png',
    'power_speed': 'powers/speed/1787258512423-speed.png',
    'power_double': 'powers/double/1787258530974-double.png',
    'hazard_bedroom': 'hazards/bedroom/1787259122445-bedroom.png',
    'hazard_budget': 'hazards/budget/1787259140321-budget.png',
    'hazard_christmas': 'hazards/christmas/1787259064420-christmas.png',
    'hazard_amiga': 'hazards/amiga/1787259168057-amiga.png',
    'hazard_guru': 'hazards/guru/1787259185501-guru.png',
    'boss_bedroom': 'bosses/bedroom/1787259006497-bedroom.png',
    'boss_budget': 'bosses/budget/1787259052191-budget.png',
    'boss_christmas': 'bosses/christmas/1787259156448-christmas.png',
    'boss_amiga': 'bosses/amiga/1787259082919-amiga.png',
    'boss_guru': 'bosses/guru/1787259094994-guru.png',
    'alien1': 'invaders/alien1/1787258877050-alien-row-1.png',
    'alien2': 'invaders/alien2/1787258887413-alien-row-2.png',
    'alien3': 'invaders/alien3/1787258899530-alien-row-3.png',
    'alien4': 'invaders/alien4/1787258911862-alien-row-4.png',
    'ship': 'invaders/ship/1787258937642-player-ship.png',
    'bunker': 'invaders/bunker/1787258951804-bunker.png',
    'enemy_shot': 'invaders/enemyShot/1787258962941-enemy-shot.png',
    'player_shot': 'invaders/playerShot/1787258977377-player-shot.png',
}

BACKGROUNDS = {
    'bedroom': BASE + 'backgrounds/bedroom/1787232895204-bedroom.webp',
    'beads': BASE + 'backgrounds/beads/1787233614399-electric-bead-run.webp',
    'budget': BASE + 'backgrounds/budget/1787235091047-budget-rack.webp',
    'fighter': BASE + 'backgrounds/fighter/1787235832987-36-percent-bout.webp',
    'invaders': BASE + 'backgrounds/invaders/1787235456157-alien_formation.webp',
    'christmas': BASE + 'backgrounds/christmas/1787238986811-christmasmorning.webp',
    'amiga': BASE + 'backgrounds/amiga/1787236613103-amiga-upgrade.webp',
    'guru': BASE + 'backgrounds/guru/1787236226252-guru-meditation.webp',
}

DIRECT = {
    'fighter_idle': 'fighter/tiertex-idle.png',
    'fighter_punch': 'fighter/tiertex-punch.png',
    'fighter_kick': 'fighter/tiertex-kick.png',
    'fighter_hit': 'fighter/tiertex-hit.png',
    'collectible_tape': 'collectibles/tape.png',
    'collectible_disk': 'collectibles/disk.png',
    'collectible_zzap': 'collectibles/zzap.png',
    'collectible_joystick': 'collectibles/joystick.png',
    'power_shield': 'powers/shield.png',
    'power_speed': 'powers/speed.png',
    'power_double': 'powers/double.png',
    'hazard_bedroom': 'hazards/bedroom.png',
    'hazard_budget': 'hazards/budget.png',
    'hazard_christmas': 'hazards/christmas.png',
    'hazard_amiga': 'hazards/amiga.png',
    'hazard_guru': 'hazards/guru.png',
    'boss_bedroom': 'bosses/bedroom.png',
    'boss_budget': 'bosses/budget.png',
    'boss_christmas': 'bosses/christmas.png',
    'boss_amiga': 'bosses/amiga.png',
    'boss_guru': 'bosses/guru.png',
    'alien1': 'invaders/alien-row-1.png',
    'alien2': 'invaders/alien-row-2.png',
    'alien3': 'invaders/alien-row-3.png',
    'alien4': 'invaders/alien-row-4.png',
    'ship': 'invaders/player-ship.png',
    'bunker': 'invaders/bunker.png',
    'enemy_shot': 'invaders/enemy-shot.png',
    'player_shot': 'invaders/player-shot.png',
}

CACHE: dict[str, bytes] = {}
MANIFEST: list[dict[str, str]] = []


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(key: str) -> bytes:
    if key in CACHE:
        return CACHE[key]
    url = BASE + SOURCES[key]
    req = Request(url, headers={'User-Agent': 'CCG-Commodore-Quest-Recovery/1.0'})
    with urlopen(req, timeout=60) as response:
        data = response.read()
    if not data:
        raise RuntimeError(f'Empty Arcade Asset Manager source: {SOURCES[key]}')
    CACHE[key] = data
    print(f'Recovered {key}: {len(data):,} bytes')
    return data


def write_bytes(key: str, rel: str, transform: str = 'exact-copy') -> None:
    data = fetch(key)
    dst = OUT / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(data)
    MANIFEST.append({
        'source': SOURCES[key],
        'destination': rel,
        'transform': transform,
        'sourceSha256': sha(data),
        'outputSha256': sha(data),
    })


def components(cell: Image.Image, threshold: int = 10):
    alpha = cell.getchannel('A')
    w, h = cell.size
    pix = alpha.load()
    seen = bytearray(w * h)
    found = []
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if seen[idx] or pix[x, y] <= threshold:
                continue
            q = deque([(x, y)])
            seen[idx] = 1
            pts = []
            minx = maxx = x
            miny = maxy = y
            sx = sy = 0
            while q:
                px, py = q.popleft()
                pts.append((px, py))
                sx += px
                sy += py
                minx = min(minx, px); maxx = max(maxx, px)
                miny = min(miny, py); maxy = max(maxy, py)
                for ny in range(max(0, py - 1), min(h, py + 2)):
                    row = ny * w
                    for nx in range(max(0, px - 1), min(w, px + 2)):
                        nidx = row + nx
                        if not seen[nidx] and pix[nx, ny] > threshold:
                            seen[nidx] = 1
                            q.append((nx, ny))
            area = len(pts)
            found.append({
                'pixels': pts,
                'area': area,
                'bbox': (minx, miny, maxx + 1, maxy + 1),
                'cx': sx / area,
                'cy': sy / area,
            })
    return found


def clean_cell(cell: Image.Image, mirror: bool = False) -> Image.Image:
    cell = cell.convert('RGBA')
    w, h = cell.size
    comps = components(cell)
    if not comps:
        return ImageOps.mirror(cell) if mirror else cell
    cx, cy = w / 2, h / 2
    diag = max(1.0, (w * w + h * h) ** 0.5)
    def score(comp):
        distance = (((comp['cx'] - cx) ** 2 + (comp['cy'] - cy) ** 2) ** 0.5) / diag
        minx, miny, maxx, maxy = comp['bbox']
        edge = minx <= 1 or miny <= 1 or maxx >= w - 1 or maxy >= h - 1
        return comp['area'] * (1.15 - min(0.75, distance)) * (0.72 if edge else 1.0)
    primary = max(comps, key=score)
    pa = primary['area']
    pminx, pminy, pmaxx, pmaxy = primary['bbox']
    expand = max(14, int(min(w, h) * 0.08))
    keep = []
    for comp in comps:
        if comp is primary:
            keep.append(comp); continue
        minx, miny, maxx, maxy = comp['bbox']
        near = not (maxx < pminx - expand or minx > pmaxx + expand or maxy < pminy - expand or miny > pmaxy + expand)
        edge = minx <= 1 or miny <= 1 or maxx >= w - 1 or maxy >= h - 1
        significant = comp['area'] >= max(18, int(pa * 0.025))
        if near and significant and not (edge and comp['area'] < pa * 0.22):
            keep.append(comp)
    mask = Image.new('L', (w, h), 0)
    mp = mask.load()
    for comp in keep:
        for x, y in comp['pixels']:
            mp[x, y] = 255
    original_alpha = cell.getchannel('A')
    mask = Image.composite(original_alpha, Image.new('L', (w, h), 0), mask)
    out = cell.copy()
    out.putalpha(mask)
    if mirror:
        out = ImageOps.mirror(out)
    return out


def rebuild_sheet(key: str, destination: str, cell_size: tuple[int, int], columns: int, rows: int, mirror_cells: bool = False) -> None:
    source_data = fetch(key)
    source = Image.open(BytesIO(source_data)).convert('RGBA')
    expected = (cell_size[0] * columns, cell_size[1] * rows)
    if source.size != expected:
        raise RuntimeError(f'{SOURCES[key]} has size {source.size}; expected {expected}')
    result = Image.new('RGBA', expected, (0, 0, 0, 0))
    for i in range(columns * rows):
        x = (i % columns) * cell_size[0]
        y = (i // columns) * cell_size[1]
        cell = source.crop((x, y, x + cell_size[0], y + cell_size[1]))
        cleaned = clean_cell(cell, mirror=mirror_cells)
        result.alpha_composite(cleaned, (x, y))
    dst = OUT / destination
    dst.parent.mkdir(parents=True, exist_ok=True)
    result.save(dst, 'PNG', optimize=True)
    output_data = dst.read_bytes()
    MANIFEST.append({
        'source': SOURCES[key],
        'destination': destination,
        'transform': 'cell-cleanup+horizontal-mirror' if mirror_cells else 'cell-cleanup',
        'sourceSha256': sha(source_data),
        'outputSha256': sha(output_data),
    })


def isolated_boss_sheet(key: str, destination: str) -> None:
    source_data = fetch(key)
    source = Image.open(BytesIO(source_data)).convert('RGBA')
    alpha = source.getchannel('A').point(lambda p: 255 if p > 10 else 0)
    bbox = alpha.getbbox()
    if not bbox:
        raise RuntimeError(f'{SOURCES[key]} has no visible pixels')
    subject = source.crop(bbox)
    fw, fh = 256, 224
    transforms = [
        (0.92, 0, 2, 0), (0.94, 0, -1, 0),
        (0.96, 0, 0, 0), (0.99, 0, -2, 0), (1.02, 0, -4, 0),
        (0.95, -5, 2, -3), (0.95, 5, 2, 3),
        (0.90, 0, 9, 10),
    ]
    sheet = Image.new('RGBA', (fw * 4, fh * 2), (0, 0, 0, 0))
    for i, (factor, xoff, yoff, angle) in enumerate(transforms):
        base_scale = min((fw - 18) / subject.width, (fh - 18) / subject.height)
        scale = base_scale * factor
        resized = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.LANCZOS)
        if angle:
            resized = resized.rotate(angle, Image.Resampling.BICUBIC, expand=True)
        cell = Image.new('RGBA', (fw, fh), (0, 0, 0, 0))
        px = (fw - resized.width) // 2 + xoff
        py = fh - resized.height - 8 + yoff
        cell.alpha_composite(resized, (px, py))
        sheet.alpha_composite(cell, ((i % 4) * fw, (i // 4) * fh))
    dst = OUT / destination
    dst.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dst, 'PNG', optimize=True)
    output_data = dst.read_bytes()
    MANIFEST.append({
        'source': SOURCES[key],
        'destination': destination,
        'transform': '8-frame-animation-from-isolated-upload',
        'sourceSha256': sha(source_data),
        'outputSha256': sha(output_data),
    })


def replace_exact(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'Cannot apply {label}; expected source text was not found in {path.relative_to(ROOT)}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def patch_runtime() -> None:
    main = ROOT / 'arcade/quest/game/main-v2.js'
    replace_exact(
        main,
        "function playerBox(){return P.duck&&P.ground?{x:P.x+11,y:P.y+70,w:58,h:57}:{x:P.x+10,y:P.y+13,w:60,h:114};}",
        "function playerBox(){return P.duck&&P.ground?{x:P.x+4,y:P.y-4,w:70,h:131}:{x:P.x+6,y:P.y-38,w:66,h:165};}",
        'standing/duck collision silhouettes',
    )
    replace_exact(
        main,
        "if(lane==='duck')return Q.GROUND-P.h-10;",
        "if(lane==='duck')return Q.GROUND-P.h-80;",
        'duck-hazard height',
    )
    replace_exact(
        main,
        "if(kind==='high')ty=Q.GROUND-P.h+50;",
        "if(kind==='high')ty=Q.GROUND-P.h-33;",
        'boss high-shot height',
    )
    replace_exact(
        main,
        "function drawBoss(){const b=S.boss;if(!b)return;const st=Q.STAGES[S.stage]",
        "function drawBoss(){const b=S.boss;if(!b)return;const bossFace=P.x>=b.x?1:-1,st=Q.STAGES[S.stage]",
        'boss facing source',
    )
    replace_exact(main, "b.dir||-1)){}else if(im)ctx.drawImage(im,b.x-b.w/2,b.y-b.h/2,b.w,b.h);", "bossFace)){}else if(im){ctx.save();if(bossFace<0){ctx.translate((b.x-b.w/2)*2+b.w,0);ctx.scale(-1,1);}ctx.drawImage(im,b.x-b.w/2,b.y-b.h/2,b.w,b.h);ctx.restore();}", 'boss sprite/image orientation')


def patch_config() -> None:
    config = ROOT / 'arcade/quest/game/assets-config.js'
    bg = "backgrounds:{" + ",".join([
        f"bedroom:'{BACKGROUNDS['bedroom']}'",
        f"beads:'{BACKGROUNDS['beads']}'",
        f"budget:'{BACKGROUNDS['budget']}'",
        f"fighter:'{BACKGROUNDS['fighter']}'",
        f"invaders:'{BACKGROUNDS['invaders']}'",
        f"christmas:'{BACKGROUNDS['christmas']}'",
        "maze:null",
        f"amiga:'{BACKGROUNDS['amiga']}'",
        f"guru:'{BACKGROUNDS['guru']}'",
    ]) + "},"
    replace_exact(config, "backgrounds:{bedroom:null,beads:null,budget:null,fighter:null,invaders:null,christmas:null,maze:null,amiga:null,guru:null},", bg, 'standalone Admin background baseline')
    replace_exact(config, "fighter:{enemy:null,enemyPunch:null,enemyKick:null,enemyHit:null},", "fighter:{enemy:`${A}/fighter/tiertex-idle.png`,enemyPunch:`${A}/fighter/tiertex-punch.png`,enemyKick:`${A}/fighter/tiertex-kick.png`,enemyHit:`${A}/fighter/tiertex-hit.png`},", 'fighter fallback artwork')
    replace_exact(config, "'spritesheets:playerFight':{frameWidth:248,frameHeight:316,columns:4,fps:8,drawWidth:238,drawHeight:302,avatarHead:false,animations:{idle:[0,1],walk:[2],run:[2],jump:[3],guard:[4],duck:[4],punch:[5],kick:[6],hit:[7]},loop:true},", "'spritesheets:playerFight':{frameWidth:248,frameHeight:316,columns:4,fps:8,drawWidth:238,drawHeight:302,avatarHead:false,animations:{idle:[0,1],walk:[2],run:[2],jump:[2],guard:[3],duck:[3],punch:[4],kick:[5],hit:[6],victory:[7]},loop:true},", 'Cheeky fight frame mapping')
    replace_exact(config, "'spritesheets:fighter':{frameWidth:248,frameHeight:316,columns:4,fps:8,drawWidth:230,drawHeight:300,animations:{idle:[0,1],walk:[2],jump:[3],guard:[4],punch:[5],kick:[6],hit:[7]},loop:true},", "'spritesheets:fighter':{frameWidth:248,frameHeight:316,columns:4,fps:8,drawWidth:230,drawHeight:300,animations:{idle:[0,1],walk:[2],jump:[7],guard:[3],punch:[4],kick:[5],hit:[6]},loop:true},", 'Retsu frame mapping')


def patch_validator() -> None:
    validator = ROOT / 'scripts/validate-arcade-quest.js'
    text = validator.read_text(encoding='utf-8')
    marker = "if(errors.length){console.error('Arcade Quest production validation failed:');"
    if marker not in text:
        raise RuntimeError('Validator insertion point not found')
    checks = (
        "has(config,\"animations:{idle:[0,1],walk:[2],run:[2],jump:[2],guard:[3],duck:[3],punch:[4],kick:[5],hit:[6],victory:[7]}\",'Cheeky recovered fight mapping');"
        "has(config,\"animations:{idle:[0,1],walk:[2],jump:[7],guard:[3],punch:[4],kick:[5],hit:[6]}\",'Retsu recovered frame mapping');"
        "has(config,\"backgrounds:{bedroom:'https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/backgrounds/bedroom/1787232895204-bedroom.webp'\",'recovered standalone background baseline');"
        "has(main,\"function playerBox(){return P.duck&&P.ground?{x:P.x+4,y:P.y-4,w:70,h:131}:{x:P.x+6,y:P.y-38,w:66,h:165};}\",'recovered standing/duck collision geometry');"
        "has(main,\"if(lane==='duck')return Q.GROUND-P.h-80;\",'raised duck-hazard lane');"
        "has(main,\"if(kind==='high')ty=Q.GROUND-P.h-33;\",'raised boss high-shot lane');"
        "has(main,\"const bossFace=P.x>=b.x?1:-1\",'boss faces Cheeky');"
        "if(!fs.existsSync(path.join(ROOT,'arcade/quest/assets/production/recovered-assets-manifest.json')))errors.push('Missing recovered asset provenance manifest');\n"
    )
    validator.write_text(text.replace(marker, checks + marker, 1), encoding='utf-8')


def main() -> None:
    for rel in DIRECT.values():
        (OUT / rel).parent.mkdir(parents=True, exist_ok=True)
    for key, rel in DIRECT.items():
        write_bytes(key, rel)

    # The game has five invader rows but the recovered source pack deliberately has four designs.
    # Reuse the fourth uploaded design for row five rather than keeping a synthetic fifth alien.
    alien4 = (OUT / 'invaders/alien-row-4.png').read_bytes()
    alien5_path = OUT / 'invaders/alien-row-5.png'
    alien5_path.write_bytes(alien4)
    MANIFEST.append({
        'source': SOURCES['alien4'],
        'destination': 'invaders/alien-row-5.png',
        'transform': 'exact-copy-reused-for-fifth-gameplay-row',
        'sourceSha256': sha(fetch('alien4')),
        'outputSha256': sha(alien4),
    })

    rebuild_sheet('sheet_enemy', 'enemies/8bit-enemy-sheet.png', (128, 128), 4, 2, mirror_cells=True)
    rebuild_sheet('sheet_player_fight', 'player/cheeky-fight-sheet.png', (248, 316), 4, 2)
    rebuild_sheet('sheet_fighter', 'fighter/retsu-sheet.png', (248, 316), 4, 2)

    for boss in ['bedroom', 'budget', 'christmas', 'amiga', 'guru']:
        isolated_boss_sheet('boss_' + boss, f'bosses/{boss}-sheet.png')

    patch_config()
    patch_runtime()
    patch_validator()

    manifest = {
        'version': 1,
        'source': 'Supabase Arcade Asset Manager uploads recovered 2026-08-21',
        'policy': {
            'backgrounds': 'Pinned current Admin URLs provide standalone fallback; live runtime may override them from enabled Admin rows.',
            'musicAndSfx': 'Remain Admin-managed runtime overrides.',
            'gameplayArt': 'Recovered upload snapshots are versioned with the game.',
        },
        'assets': MANIFEST,
    }
    manifest_path = OUT / 'recovered-assets-manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(f'Wrote {manifest_path.relative_to(ROOT)} with {len(MANIFEST)} recovered outputs')


if __name__ == '__main__':
    main()
