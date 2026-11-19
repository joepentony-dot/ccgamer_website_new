C64 Dungeon Carnage — bundled owner-recorded dialogue audio.

R169 AUTHORITATIVE OWNER VOICE PACKAGE (19 November 2026)
  ccg-owner-voices-r169.ogg
  170 conservatively trimmed and level-matched owner-recorded takes in
  a single Ogg/Opus file, 48 kHz mono, approximately 382 seconds total.
  124 existing event/dialogue keys; 42 keys have alternate voice takes.
  The new source is local to the game. It is not fetched from Supabase
  or HelioHost. Runtime cue offsets and voice-key aliases are declared
  in js/v10-42-r69-recorded-voices.js, after the historical R69 metadata.
  SHA-256: fc4dbbdf2277da76a354b7135befcc19fdf51a0e421ffe2a67bb589cb74d6997

  All existing routed keys prefer these new owner recordings.
  The six uploaded Mara Venn / Orin Vale catalogue lines VC176–VC181
  are NOT part of the active sprite and have NOT been routed.
  Weekly Vault cues were not supplied; old approved recordings remain
  the fallback for uncovered keys only. Voice On/Off, mobile gesture
  permission, clip-priority interrupting and no-backlog rules remain.

HISTORICAL FALLBACKS (preserved, not overwritten or deleted)
  ccg-recorded-voices-r69.ogg
    Original approved 84-cue owner recording (legacy and unprovided events).
  lost-sizzler-voices.ogg
    Original 49-cue archived voice sprite, only approved rare greeting
    fallback remains eligible under the current voice director.
    SHA-256: c09aa9fb584d0d36be1feb17899607f262a62f67ebdb1f612d2d1833df4cf22b

The original 'GAME VOICEOVERS.zip' upload is preserved outside this
public game directory. The source files had a .wav suffix but contained
AAC audio inside MP4 containers; each was decoded and cleaned before
the R169 Opus sprite was assembled. The original MP4/AAC uploads are
not distributed as part of the game.

Any future conversion, licensing, new NPC routing, or HelioHost migration
is separate from this static owner audio release.
