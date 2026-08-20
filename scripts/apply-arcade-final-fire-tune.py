from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
main_path = ROOT / 'arcade/quest/game/main-v2.js'
validator_path = ROOT / 'scripts/validate-arcade-quest.js'

main = main_path.read_text(encoding='utf-8')
validator = validator_path.read_text(encoding='utf-8')

replacements = {
    "if(fire&&P.stun<=0&&input.down('KeyZ','ControlLeft')&&P.fire<=0)": "if(fire&&P.stun<=0&&input.tap('KeyZ','ControlLeft')&&P.fire<=0)",
    "S.inv={shipX:800,shield:3,invuln:0,fire:0,dir:1,speed:84,aliens,shots:[],enemyCool:.82,drop:0,elapsed:0,bunkers}": "S.inv={shipX:800,shield:3,invuln:0,fire:0,dir:1,speed:84,aliens,shots:[],enemyCool:.58,drop:0,elapsed:0,bunkers}",
    "if(input.down('KeyZ','ControlLeft')&&g.fire<=0)": "if(input.tap('KeyZ','ControlLeft')&&g.fire<=0)",
    "count=ratio>.62?3:ratio>.3?2:1": "count=ratio>.5?3:ratio>.12?2:1",
    "aim=Math.random()<(.28+ratio*.35)": "aim=Math.random()<(.34+ratio*.42)",
    "g.enemyCool=rand(Math.max(.34,.72-ratio*.24),Math.max(.55,1.0-ratio*.18))": "g.enemyCool=rand(Math.max(.22,.54-ratio*.18),Math.max(.38,.76-ratio*.16))",
    "const speed=rand(400,505),fromLeft=(S.beadLeftShots===0&&S.beadTime>8)||(S.beadLeftShots===1&&S.beadTime>19),dir=fromLeft?1:-1,x=fromLeft?-52:Q.W+52;": "const speed=rand(400,505),leftMarks=[5.5,10.5,15.5,20.5,24.5],fromLeft=S.beadLeftShots<leftMarks.length&&S.beadTime>leftMarks[S.beadLeftShots],dir=fromLeft?1:-1,x=fromLeft?-52:Q.W+52;",
    "transition('ALIEN FORMATION','45 ALIENS. FASTER FIRE. FINITE COVER. LEFT, RIGHT, FIRE.','invaders',1.9)": "transition('ALIEN FORMATION','45 ALIENS. NO AUTOFIRE. THEY SHOOT BACK A LOT.','invaders',1.9)",
}

for old, new in replacements.items():
    count = main.count(old)
    if count != 1:
        raise SystemExit(f'Expected one match in main-v2.js, found {count}: {old}')
    main = main.replace(old, new)

validator_replacements = {
    "expectContains('arcade/quest/game/main-v2.js', main, 'count=ratio>.62?3:ratio>.3?2:1', 'late-wave multi-shot Alien Formation pressure');": "expectContains('arcade/quest/game/main-v2.js', main, 'count=ratio>.5?3:ratio>.12?2:1', 'stronger multi-shot Alien Formation pressure');",
    "expectContains('arcade/quest/game/main-v2.js', main, 'aim=Math.random()<(.28+ratio*.35)', 'aimed Alien Formation shots');": "expectContains('arcade/quest/game/main-v2.js', main, 'aim=Math.random()<(.34+ratio*.42)', 'more frequent aimed Alien Formation shots');",
}
for old, new in validator_replacements.items():
    count = validator.count(old)
    if count != 1:
        raise SystemExit(f'Expected one match in validator, found {count}: {old}')
    validator = validator.replace(old, new)

anchor = "expectContains('arcade/quest/game/main-v2.js', main, 'S.enemySpawn-=dt', 'additional ambient 8-bit enemies');\n"
extra = (
    "expectContains('arcade/quest/game/main-v2.js', main, \"input.tap('KeyZ','ControlLeft')&&P.fire<=0\", 'single-press player firing');\n"
    "expectContains('arcade/quest/game/main-v2.js', main, \"if(input.tap('KeyZ','ControlLeft')&&g.fire<=0)\", 'single-press Alien Formation firing');\n"
    "expectContains('arcade/quest/game/main-v2.js', main, 'leftMarks=[5.5,10.5,15.5,20.5,24.5]', 'five scheduled left-side Electric Bead attacks');\n"
    "expectContains('arcade/quest/game/main-v2.js', main, 'enemyCool:.58', 'faster opening Alien Formation fire');\n"
    "expectContains('arcade/quest/game/main-v2.js', main, 'g.enemyCool=rand(Math.max(.22,.54-ratio*.18)', 'shorter Alien Formation firing gaps');\n"
)
if extra not in validator:
    if validator.count(anchor) != 1:
        raise SystemExit('Unable to locate validator insertion anchor')
    validator = validator.replace(anchor, anchor + extra)

main_path.write_text(main, encoding='utf-8')
validator_path.write_text(validator, encoding='utf-8')
print('Arcade one-shot/firing-pressure tuning applied.')
