from pathlib import Path

path = Path('arcade/quest/game/main-v2.js')
source = path.read_text(encoding='utf-8')

changes = [
    (
        'function updatePlayer(dt,fire=true){',
        'function updatePlayer(dt,fire=true,gravity=2050){',
        'updatePlayer gravity parameter',
    ),
    (
        'P.vy+=2050*dt;',
        'P.vy+=gravity*dt;',
        'mode-specific player gravity',
    ),
    (
        'function updateBeads(dt){S.beadTime+=dt;updatePlayer(dt,true);',
        'function updateBeads(dt){S.beadTime+=dt;updatePlayer(dt,true,2350);',
        'faster Electric Bead gravity',
    ),
]

for old, new, label in changes:
    if old not in source:
        raise SystemExit(f'Unable to apply {label}: expected source text not found')
    source = source.replace(old, new, 1)

path.write_text(source, encoding='utf-8')
print('Applied Electric Bead gravity tune.')
