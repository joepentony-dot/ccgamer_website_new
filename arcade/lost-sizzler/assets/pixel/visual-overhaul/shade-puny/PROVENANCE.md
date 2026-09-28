# Shade Puny Characters — player source

Import date: 28 September 2026

- Asset: `Warrior-Blue.png`
- Author: Shade
- Official free source: https://merchant-shade.itch.io/16x16-puny-characters
- OpenGameArt mirror/source listing: https://opengameart.org/content/puny-characters
- Licence: Creative Commons Zero v1.0 Universal (CC0-1.0)
- Official free pack states commercial use, modification and redistribution are permitted and attribution is not required.
- Sheet size: 768x256, arranged as 24 columns x 8 rows of 32x32 cells.
- Imported local path: `warrior-blue.png`
- Modified before import: no
- Git blob SHA: `03f4c87f30c7fcb754fccb42e02459294f0acd2e`

Cross-verification before import found the exact same Git blob SHA in four independent public projects:

- `ASH-CHA/Capstonr_Project_2D_RPG`
- `Y0L042/PB_prototype_2`
- `ult0/robo-game`
- `rabbitglauser/Voidlands-Godot-Game`

A Godot SpriteFrames resource referencing this exact sheet confirmed the horizontal animation groups used here: idle columns 0-1, walk 2-3, melee/attack 4-7, carry 15-17, hurt 18-20 and death 21-23. Visual inspection confirms eight direction rows in clockwise order beginning at front/down, so Dungeon Carnage uses rows 0,2,4,6 for down/right/up/left.

The production game loads only this local repository copy; it does not hotlink any source.
