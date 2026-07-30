#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACMAN_PATH = ROOT / "resources" / "audio" / "easter-eggs" / "pacman.html"
MARKER = "CCG PACMAN SELF-CONTAINED RUNTIME"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    text = PACMAN_PATH.read_text(encoding="utf-8")
    if MARKER in text:
        print("PACMAN self-contained runtime correction already applied.")
        return

    text = replace_once(
        text,
        '\t<link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Permanent+Marker">\n',
        "",
        "external PACMAN font",
    )
    text = replace_once(
        text,
        '\t<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/modernizr/2.8.3/modernizr.min.js"></script>\n\t<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>\n',
        "",
        "external PACMAN runtime scripts",
    )

    old_play = '''    function play(name) { \n        if (!game.soundDisabled()) {\n            endEvents[name] = function() { ended(name); };\n            playing.push(name);\n            files[name].addEventListener("ended", endEvents[name], true);\n            files[name].play();\n        }\n    };'''
    new_play = '''    function play(name) { \n        var file = files[name];\n        if (!game.soundDisabled() && file) {\n            endEvents[name] = function() { ended(name); };\n            playing.push(name);\n            file.addEventListener("ended", endEvents[name], true);\n            var playPromise = file.play();\n            if (playPromise && typeof playPromise.catch === "function") {\n                playPromise.catch(function () {});\n            }\n        }\n    };'''
    text = replace_once(text, old_play, new_play, "safe PACMAN audio playback")

    old_audio_boot = '''        var extension = Modernizr.audio.ogg ? 'ogg' : 'mp3';\n\n        var audio_files = [\n            ["start", root + "audio/opening_song." + extension],\n            ["die", root + "audio/die." + extension],\n            ["eatghost", root + "audio/eatghost." + extension],\n            ["eatpill", root + "audio/eatpill." + extension],\n            ["eating", root + "audio/eating.short." + extension],\n            ["eating2", root + "audio/eating.short." + extension]\n        ];\n\n        load(audio_files, function() { loaded(); });'''
    new_audio_boot = '''        /* CCG PACMAN SELF-CONTAINED RUNTIME */\n        // The embedded game must start without third-party scripts or remote audio.\n        // Pacman.Audio safely ignores unavailable sounds while gameplay remains local.\n        loaded();'''
    text = replace_once(text, old_audio_boot, new_audio_boot, "PACMAN remote audio boot")

    old_startup = '''$(function(){\n  var el = document.getElementById("pacman");\n\n  if (Modernizr.canvas && Modernizr.localstorage && \n      Modernizr.audio && (Modernizr.audio.ogg || Modernizr.audio.mp3)) {\n    window.setTimeout(function () { PACMAN.init(el, "https://raw.githubusercontent.com/daleharvey/pacman/master/"); }, 0);\n  } else { \n    el.innerHTML = "Sorry, needs a decent browser<br /><small>" + \n      "(firefox 3.6+, Chrome 4+, Opera 10+ and Safari 4+)</small>";\n  }\n});'''
    new_startup = '''(function initialiseLocalPacman() {\n  "use strict";\n\n  function start() {\n    var el = document.getElementById("pacman"),\n        canvas = document.createElement("canvas");\n\n    if (el && canvas.getContext && typeof window.localStorage !== "undefined") {\n      try {\n        PACMAN.init(el, "");\n        document.documentElement.setAttribute("data-ccg-pacman-ready", "true");\n      } catch (error) {\n        console.error("PACMAN failed to initialise", error);\n        el.innerHTML = "PACMAN COULD NOT START";\n        document.documentElement.setAttribute("data-ccg-pacman-ready", "error");\n      }\n    } else if (el) {\n      el.innerHTML = "PACMAN REQUIRES CANVAS SUPPORT";\n      document.documentElement.setAttribute("data-ccg-pacman-ready", "unsupported");\n    }\n  }\n\n  if (document.readyState === "loading") {\n    document.addEventListener("DOMContentLoaded", start, { once: true });\n  } else {\n    start();\n  }\n}());'''
    text = replace_once(text, old_startup, new_startup, "PACMAN native startup")

    PACMAN_PATH.write_text(text, encoding="utf-8")
    print("Applied self-contained PACMAN runtime correction.")


if __name__ == "__main__":
    main()
