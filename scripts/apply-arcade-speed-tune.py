from pathlib import Path

engine_path = Path('arcade/quest/game/main-v2.js')
validator_path = Path('scripts/validate-arcade-quest.js')
engine = engine_path.read_text(encoding='utf-8')
validator = validator_path.read_text(encoding='utf-8')

changes = [
    ('speed=rand(400,505)', 'speed=rand(360,455)', 'Electric Bead speed range'),
    ('dir:1,speed:84,aliens', 'dir:1,speed:72,aliens', 'Alien Formation base movement speed'),
    ('spd=g.speed+ratio*170', 'spd=g.speed+ratio*145', 'Alien Formation late-wave movement scaling'),
    ("const shooter=i===0&&Math.random()<.58?front[0]:pick(alive),sx=shooter.x+shooter.w/2,aim=Math.random()<(.34+ratio*.42),dx=g.shipX-sx,vy=305+ratio*155,vx=aim?clamp(dx*.32,-150,150):0;g.shots.push({x:sx,y:shooter.y+shooter.h,vx,vy,owner:'e'});", "const shooter=i===0&&Math.random()<.58?front[0]:pick(alive),sx=shooter.x+shooter.w/2,vy=270+ratio*125,vx=0;g.shots.push({x:sx,y:shooter.y+shooter.h,vx,vy,owner:'e'});", 'straight slower Alien Formation bullets'),
]

for old, new, label in changes:
    if old not in engine:
        raise SystemExit(f'Unable to apply {label}: expected source text not found')
    engine = engine.replace(old, new, 1)

validator_changes = [
    ("expectContains('arcade/quest/game/main-v2.js', main, 'aim=Math.random()<(.34+ratio*.42)', 'more frequent aimed Alien Formation shots');", "expectContains('arcade/quest/game/main-v2.js', main, 'vy=270+ratio*125,vx=0', 'straight-down slower Alien Formation shots');"),
]
for old, new in validator_changes:
    if old not in validator:
        raise SystemExit('Unable to update Alien Formation projectile validator')
    validator = validator.replace(old, new, 1)

insert_after = "expectContains('arcade/quest/game/main-v2.js', main, 'S.beadEnemyTimer-=dt', '8-bit enemies in Electric Bead Run');\n"
extra = "expectContains('arcade/quest/game/main-v2.js', main, 'speed=rand(360,455)', 'slightly slower Electric Bead speed');\n"
if extra not in validator:
    if insert_after not in validator:
        raise SystemExit('Unable to add Electric Bead speed validator')
    validator = validator.replace(insert_after, insert_after + extra, 1)

insert_after = "expectContains('arcade/quest/game/main-v2.js', main, 'enemyCool:.58', 'faster opening Alien Formation fire');\n"
extra = "expectContains('arcade/quest/game/main-v2.js', main, 'dir:1,speed:72,aliens', 'slower Alien Formation base movement');\nexpectContains('arcade/quest/game/main-v2.js', main, 'spd=g.speed+ratio*145', 'slower Alien Formation late-wave movement');\n"
if "'dir:1,speed:72,aliens'" not in validator:
    if insert_after not in validator:
        raise SystemExit('Unable to add Alien Formation movement validators')
    validator = validator.replace(insert_after, insert_after + extra, 1)

engine_path.write_text(engine, encoding='utf-8')
validator_path.write_text(validator, encoding='utf-8')
print('Applied arcade speed and straight-shot tuning.')
