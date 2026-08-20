from pathlib import Path

path = Path('arcade/quest/game/main-v2.js')
source = path.read_text(encoding='utf-8')

# Apply the bead-room-only gravity change if it has not already landed.
if 'function updatePlayer(dt,fire=true,gravity=2050){' not in source:
    old = 'function updatePlayer(dt,fire=true){'
    if old not in source:
        raise SystemExit('Unable to apply updatePlayer gravity parameter')
    source = source.replace(old, 'function updatePlayer(dt,fire=true,gravity=2050){', 1)

if 'P.vy+=gravity*dt;' not in source:
    old = 'P.vy+=2050*dt;'
    if old not in source:
        raise SystemExit('Unable to apply mode-specific player gravity')
    source = source.replace(old, 'P.vy+=gravity*dt;', 1)

if 'function updateBeads(dt){S.beadTime+=dt;updatePlayer(dt,true,2350);' not in source:
    old = 'function updateBeads(dt){S.beadTime+=dt;updatePlayer(dt,true);'
    if old not in source:
        raise SystemExit('Unable to apply faster Electric Bead gravity')
    source = source.replace(old, 'function updateBeads(dt){S.beadTime+=dt;updatePlayer(dt,true,2350);', 1)

# Alien Formation remains one-press-per-shot, but impose a real 0.34-second
# ship cooldown so rapid tapping cannot spam the formation.
if 'g.fire=.34;' not in source:
    old = 'g.fire=.18;'
    if old not in source:
        raise SystemExit('Unable to apply Alien Formation player fire cooldown')
    source = source.replace(old, 'g.fire=.34;', 1)

path.write_text(source, encoding='utf-8')
print('Applied final arcade jump/fire tuning.')
