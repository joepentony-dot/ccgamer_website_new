# Shade Puny Characters — enemy animation family

Import date: 28 September 2026

## Licence and authoritative source

- Pack family: Free 16x16 Puny Character Sprites / Puny Monsters
- Author: Shade
- Official source: https://merchant-shade.itch.io/16x16-puny-characters
- Official downloads listed on that page: `Puny-Characters.zip` and `PunyMonsters.zip`
- Licence: Creative Commons Zero v1.0 Universal (CC0-1.0)
- Runtime use: local repository copies only; no hotlinking.

## Binary acquisition

Four unmodified Puny-family sheets were copied from public Git repository `ASH-CHA/Capstonr_Project_2D_RPG` at commit `d682c4c8cc051fd0d7c50c3049d5db8469f5354e`. Source and destination Git blob identities were verified before branch publication.

| Source path | Local path | Git blob SHA | Modified |
| --- | --- | --- | --- |
| assets/npcs/Warrior-Red.png | warrior-red.png | a4b1db8bab01e280030d516ed2d79cbf3402ad96 | no |
| assets/npcs/Human-Soldier-Red.png | soldier-red.png | 295666c6e7712eeac47a79fd938e680eefe2ec2d | no |
| assets/npcs/Archer-Green.png | archer-green.png | 2190926bbaebc6129e870e7fd9c21fa5cc359801 | no |
| assets/npcs/Mage-Red.png | mage-red.png | 96e96210573780a3a740d74b3ae1505954d15f07 | no |

## Runtime mapping

The renderer uses 32x32 cells and maps Dungeon enemy state onto authored animation ranges:

- idle: columns 0–1;
- movement: columns 2–3;
- attack: columns 4–7;
- hurt: columns 18–20;
- death: columns 21–23;
- directions: down/right/up/left use rows 0/2/4/6.

Warrior, Soldier, Archer and Mage sheets are assigned by enemy family. Spider, Ghost, Death Stalker, followers and unsupported/malformed sheets retain the established procedural art as fallbacks.
