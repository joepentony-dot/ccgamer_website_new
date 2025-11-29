import json
import os

# ============================================================
# CCG FINAL THUMBNAIL PATCHER (Fixes 32 incorrect entries)
# ============================================================

ROOT = "."
games_path = os.path.join(ROOT, "games", "games.json")

# Load games.json
with open(games_path, "r", encoding="utf-8") as f:
    games = json.load(f)

# Mapping of incorrect filename → correct path
# (Automated from your real folders)
PATCHES = {
    "barbarian%202%20new.png": "resources/images/thumbnails/fighting/BARBARIAN 2 NEW.png",
    "blockbusters%20new.png": "resources/images/thumbnails/quiz/blockbusters new.png",
    "cave%20of%20the%20word%20wizard%20new.png": "resources/images/thumbnails/quiz/cave of the word wizard new.png",
    "deactivators%20(europe).jpg": "resources/images/thumbnails/strategy/Deactivators (Europe).jpg",
    "donald%20duck's%20playground%20(usa).jpg": "resources/images/thumbnails/quiz/Donald Duck's Playground (USA).jpg",
    "double%20dragon%20ii%20-%20the%20revenge%20(europe).jpg": "resources/images/thumbnails/fighting/Double Dragon II - The Revenge (Europe).jpg",
    "bad%20dudes%20vs.%20dragon%20ninja%20(usa).jpg": "resources/images/thumbnails/fighting/Bad Dudes vs. Dragon Ninja (USA).jpg",
    "feud%20-%20battle%20of%20the%20wizards%20(europe).jpg": "resources/images/thumbnails/action-adventure/Feud - Battle of the Wizards (Europe).jpg",
    "fighting%20warrior%20new.png": "resources/images/thumbnails/fighting/fighting warrior new.png",
    "granys%20garden%20new.png": "resources/images/thumbnails/quiz/granys garden new.png",
    "ik%2b%20c64%20new.png": "resources/images/thumbnails/fighting/IK+ C64 NEW.png",
    "karateka%20(usa).jpg": "resources/images/thumbnails/fighting/Karateka (USA).jpg",
    "micro%20mouse%20new.png": "resources/images/thumbnails/quiz/micro mouse new.png",
    "mike%20read's%20computer%20pop%20quiz%20(europe).jpg": "resources/images/thumbnails/quiz/Mike Read's Computer Pop Quiz (Europe).jpg",
    "pit-fighter%20-%20the%20ultimate%20competition%20(europe).jpg": "resources/images/thumbnails/fighting/Pit-Fighter - The Ultimate Competition (Europe).jpg",
    "question%20of%20sport%2c%20a%20(europe).jpg": "resources/images/thumbnails/quiz/Question of Sport, A (Europe).jpg",
    "rock%20n%20wrestle.png": "resources/images/thumbnails/fighting/rock n wrestle.png",
    "spartacus%20-%20the%20swordslayer%20(europe).jpg": "resources/images/thumbnails/fighting/Spartacus - The Swordslayer (Europe).jpg",
    "spitting%20image%20-%20the%20computer%20game%20(europe).jpg": "resources/images/thumbnails/fighting/Spitting Image - The Computer Game (Europe).jpg",
    "street%20fighter%20new.png": "resources/images/thumbnails/fighting/STREET FIGHTER NEW.png",
    "street%20hassle%20new.png": "resources/images/thumbnails/fighting/STREET HASSLE NEW.png",
    "tour%20de%20france%20(usa).jpg": "resources/images/thumbnails/racing/Tour de France (USA).jpg",
    "uchi-mata%20(europe).jpg": "resources/images/thumbnails/fighting/Uchi-Mata (Europe).jpg",
    "vigilante%20(europe).jpg": "resources/images/thumbnails/fighting/Vigilante (Europe).jpg",
    "visible%20solar%20system%20new.png": "resources/images/thumbnails/quiz/visible solar system new.png",
    "kung-fu%20-%20the%20way%20of%20the%20exploding%20fist%20(europe).jpg": "resources/images/thumbnails/fighting/Kung-Fu - The Way of the Exploding Fist (Europe).jpg",
    "yie%20ar%20kung-fu%20(europe).jpg": "resources/images/thumbnails/fighting/Yie Ar Kung-Fu (Europe).jpg",
    "final%20fight.png": "resources/images/thumbnails/fighting/Final Fight.png",
    "the%20settlers%20new.png": "resources/images/thumbnails/strategy/the settlers new.png",
    "ik%2b.png": "resources/images/thumbnails/fighting/IK+.png",
    "kawasaki%20rhythm%20rocker%20new.png": "resources/images/thumbnails/quiz/kawasaki rhythm rocker new.png",
    # Final special case — broken fake file:
    "Miscellaneous/jammie booker": "resources/images/thumbnails/fighting/WWF WrestleMania (Europe).jpg"
}

patched = 0

for game in games:
    thumb = game.get("thumbnail", "")

    for wrong, correct in PATCHES.items():
        if wrong in thumb:
            game["thumbnail"] = correct
            patched += 1

output_path = os.path.join(ROOT, "games", "games_patched.json")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(games, f, indent=4, ensure_ascii=False)

print(f"PATCH COMPLETE — Fixed {patched} thumbnail paths.")
print(f"New file written: {output_path}")
