# The Lost Sizzler — Supabase Storage Recovery Manifest

This manifest freezes the read-only database metadata and the verified desktop-recovery evidence for the Lost Sizzler Storage music set. It does **not** authorise deletion of any Supabase object.

## Recovery status — 6 September 2026

- Bucket: `ccg-arcade-assets`
- Enabled objects recovered: **16 / 16**
- Enabled bytes verified: **72,233,137 / 72,233,137**
- Disabled counterparts recovered: **16 / 16**
- Disabled bytes verified: **72,233,137 / 72,233,137**
- Enabled/disabled pairs with identical SHA-256: **16 / 16**
- Enabled MP3s with successful `ffprobe` audio decode/probe: **16 / 16**
- Disabled copies are byte-for-byte identical to the probed enabled generation, so no second runtime copy is required.
- Repository promotion is still pending: the recovered MP3 bytes have **not yet been committed** to `assets/audio/music/` and the runtime still uses the existing bundled local fallback set.
- Supabase deletion remains blocked until the recovered originals are locally promoted, referenced by the runtime, and the offline/online regression gates pass.

## Recovery rules

- Preserve one verified copy of each of the 16 unique tracks.
- Use SHA-256, not filename or byte size, for duplicate decisions.
- Do not delete, overwrite or disable any Storage object during repository promotion.
- Do not switch runtime references until the matching local binary is present in the repository/package.
- Keep the current WAV fallback assets as independent fallbacks unless a later deliberate cleanup removes them after regression testing.

## Frozen metadata snapshot

Database source: `public.arcade_assets`

Metadata pairing key: `asset_meta.playlist_category + asset_meta.original_name`

Snapshot result:

- Enabled objects: **16**
- Enabled bytes: **72,233,137**
- Disabled counterparts: **16**
- Disabled bytes: **72,233,137**
- Pairs with matching database byte size: **16 / 16**
- Cryptographic equality: **16 / 16 HASH IDENTICAL**

## Recovery manifest

| # | Playlist | Original file | Enabled row | Enabled Storage path | Expected bytes | Enabled SHA-256 | Disabled row | Disabled Storage path | Disabled SHA-256 | Pair status | Local destination |
| ---: | --- | --- | ---: | --- | ---: | --- | ---: | --- | --- | --- | --- |
| 1 | `lostSizzlerDanger` | `combat-01.mp3` | 62 | `music/lostSizzlerDanger/1787411621547-0-combat-01.mp3` | 3,360,888 | `70e5bd2e1dc2f70273b0f5ac60601df9afb8d262e124929002431a19f04d8224` | 83 | `music/lostSizzlerDanger/1787411795701-0-combat-01.mp3` | `70e5bd2e1dc2f70273b0f5ac60601df9afb8d262e124929002431a19f04d8224` | HASH IDENTICAL | `assets/audio/music/combat-01.mp3 (pending commit)` |
| 2 | `lostSizzlerDanger` | `combat-02.mp3` | 76 | `music/lostSizzlerDanger/1787411636390-14-combat-02.mp3` | 5,665,656 | `0b2155e7f82c2fa1fdcb9d1e5cedcbd611412abe6ba8fe042d0d072b230dd36e` | 85 | `music/lostSizzlerDanger/1787411797639-2-combat-02.mp3` | `0b2155e7f82c2fa1fdcb9d1e5cedcbd611412abe6ba8fe042d0d072b230dd36e` | HASH IDENTICAL | `assets/audio/music/combat-02.mp3 (pending commit)` |
| 3 | `lostSizzlerDanger` | `combat-03.mp3` | 63 | `music/lostSizzlerDanger/1787411622953-1-combat-03.mp3` | 3,999,864 | `b4d73ca1b1c9daa21eb4699891f0732d2777283fca71a361ba52d976582dac90` | 84 | `music/lostSizzlerDanger/1787411796554-1-combat-03.mp3` | `b4d73ca1b1c9daa21eb4699891f0732d2777283fca71a361ba52d976582dac90` | HASH IDENTICAL | `assets/audio/music/combat-03.mp3 (pending commit)` |
| 4 | `lostSizzlerExploration` | `exploration-01.mp3` | 67 | `music/lostSizzlerExploration/1787411626645-5-exploration-01.mp3` | 7,227,773 | `6969f2115276a069c7aa48ce4a1001a2706c17ab7308ca7e042c88ba73139e15` | 78 | `music/lostSizzlerExploration/1787411768267-0-exploration-01.mp3` | `6969f2115276a069c7aa48ce4a1001a2706c17ab7308ca7e042c88ba73139e15` | HASH IDENTICAL | `assets/audio/music/exploration-01.mp3 (pending commit)` |
| 5 | `lostSizzlerExploration` | `exploration-02.mp3` | 68 | `music/lostSizzlerExploration/1787411628149-6-exploration-02.mp3` | 4,186,493 | `a8a424a5f5051fb224336fe548a3bc701910535ac823c2baa3c26b84ebe505d0` | 79 | `music/lostSizzlerExploration/1787411770422-1-exploration-02.mp3` | `a8a424a5f5051fb224336fe548a3bc701910535ac823c2baa3c26b84ebe505d0` | HASH IDENTICAL | `assets/audio/music/exploration-02.mp3 (pending commit)` |
| 6 | `lostSizzlerExploration` | `exploration-03.mp3` | 69 | `music/lostSizzlerExploration/1787411629062-7-exploration-03.mp3` | 6,875,261 | `196b3a4e19e5f160fdafb27c7b9380540d7a7e64282b102fd6efdf4705339f2c` | 80 | `music/lostSizzlerExploration/1787411771463-2-exploration-03.mp3` | `196b3a4e19e5f160fdafb27c7b9380540d7a7e64282b102fd6efdf4705339f2c` | HASH IDENTICAL | `assets/audio/music/exploration-03.mp3 (pending commit)` |
| 7 | `lostSizzlerExploration` | `exploration-04.mp3` | 70 | `music/lostSizzlerExploration/1787411630429-8-exploration-04.mp3` | 4,794,749 | `336f40a2b39316a48c5cccab571b4ac5e728b8d2629113561384426d15510419` | 81 | `music/lostSizzlerExploration/1787411772966-3-exploration-04.mp3` | `336f40a2b39316a48c5cccab571b4ac5e728b8d2629113561384426d15510419` | HASH IDENTICAL | `assets/audio/music/exploration-04.mp3 (pending commit)` |
| 8 | `lostSizzlerExploration` | `exploration-05.mp3` | 71 | `music/lostSizzlerExploration/1787411631439-9-exploration-05.mp3` | 5,446,781 | `d022385d104c0c9b0363107880a26d7f5d9f8ccccf84d118e3fde10ace2cd218` | 82 | `music/lostSizzlerExploration/1787411774062-4-exploration-05.mp3` | `d022385d104c0c9b0363107880a26d7f5d9f8ccccf84d118e3fde10ace2cd218` | HASH IDENTICAL | `assets/audio/music/exploration-05.mp3 (pending commit)` |
| 9 | `lostSizzlerNamed` | `named-01.mp3` | 72 | `music/lostSizzlerNamed/1787411632588-10-named-01.mp3` | 5,085,047 | `4b5c112ac130b498404e3eb23d6c252c0e0d6446300b8545b982d0545158d57a` | 88 | `music/lostSizzlerNamed/1787411833343-0-named-01.mp3` | `4b5c112ac130b498404e3eb23d6c252c0e0d6446300b8545b982d0545158d57a` | HASH IDENTICAL | `assets/audio/music/named-01.mp3 (pending commit)` |
| 10 | `lostSizzlerNamed` | `named-02.mp3` | 73 | `music/lostSizzlerNamed/1787411633643-11-named-02.mp3` | 3,331,703 | `d9218b9ed563008569d16ca69b376f83bc71423df1b0cb7c786f900b0a4594ac` | 89 | `music/lostSizzlerNamed/1787411834681-1-named-02.mp3` | `d9218b9ed563008569d16ca69b376f83bc71423df1b0cb7c786f900b0a4594ac` | HASH IDENTICAL | `assets/audio/music/named-02.mp3 (pending commit)` |
| 11 | `lostSizzlerNamed` | `named-03.mp3` | 77 | `music/lostSizzlerNamed/1787411637581-15-named-03.mp3` | 5,134,967 | `d06336ce08b7f562c56ca42faf35b3f891bab8b4154cdb8f14640b35a407230c` | 90 | `music/lostSizzlerNamed/1787411835807-2-named-03.mp3` | `d06336ce08b7f562c56ca42faf35b3f891bab8b4154cdb8f14640b35a407230c` | HASH IDENTICAL | `assets/audio/music/named-03.mp3 (pending commit)` |
| 12 | `lostSizzlerSanctuary` | `sanctuary-01.mp3` | 74 | `music/lostSizzlerSanctuary/1787411634411-12-sanctuary-01.mp3` | 5,025,147 | `3a0f2dec847d63a7732ad523dccc8ad0b2cbdda9c6c742e18a2b0bddc7cc9f51` | 86 | `music/lostSizzlerSanctuary/1787411813111-0-sanctuary-01.mp3` | `3a0f2dec847d63a7732ad523dccc8ad0b2cbdda9c6c742e18a2b0bddc7cc9f51` | HASH IDENTICAL | `assets/audio/music/sanctuary-01.mp3 (pending commit)` |
| 13 | `lostSizzlerSanctuary` | `sanctuary-02.mp3` | 75 | `music/lostSizzlerSanctuary/1787411635463-13-sanctuary-02.mp3` | 4,168,059 | `c356a99b59c4a9628cc4c748d41fc2bdc0eec20e8f6866431449fcb379fada68` | 87 | `music/lostSizzlerSanctuary/1787411814619-1-sanctuary-02.mp3` | `c356a99b59c4a9628cc4c748d41fc2bdc0eec20e8f6866431449fcb379fada68` | HASH IDENTICAL | `assets/audio/music/sanctuary-02.mp3 (pending commit)` |
| 14 | `lostSizzlerStalker` | `count-loadula-01.mp3` | 64 | `music/lostSizzlerStalker/1787411624060-2-count-loadula-01.mp3` | 2,001,535 | `e14a469c0170b345135ed4a24f99fcbf18e8fb777ba12fc7e52958ea23b6cd1a` | 91 | `music/lostSizzlerStalker/1787411848317-0-count-loadula-01.mp3` | `e14a469c0170b345135ed4a24f99fcbf18e8fb777ba12fc7e52958ea23b6cd1a` | HASH IDENTICAL | `assets/audio/music/count-loadula-01.mp3 (pending commit)` |
| 15 | `lostSizzlerStalker` | `count-loadula-02.mp3` | 65 | `music/lostSizzlerStalker/1787411624977-3-count-loadula-02.mp3` | 1,946,239 | `7d00dcc19e6d851f2a2f78dbb35ec487e4a027e186179b579c1f94ce3518a4db` | 92 | `music/lostSizzlerStalker/1787411849059-1-count-loadula-02.mp3` | `7d00dcc19e6d851f2a2f78dbb35ec487e4a027e186179b579c1f94ce3518a4db` | HASH IDENTICAL | `assets/audio/music/count-loadula-02.mp3 (pending commit)` |
| 16 | `lostSizzlerStalker` | `count-loadula-03.mp3` | 66 | `music/lostSizzlerStalker/1787411625578-4-count-loadula-03.mp3` | 3,982,975 | `d66e9feb326d51fdaa1da6c5330463871d7df1b4d77fef579a27fc52be5f1e44` | 93 | `music/lostSizzlerStalker/1787411849620-2-count-loadula-03.mp3` | `d66e9feb326d51fdaa1da6c5330463871d7df1b4d77fef579a27fc52be5f1e44` | HASH IDENTICAL | `assets/audio/music/count-loadula-03.mp3 (pending commit)` |

## Decode/probe evidence

All 16 enabled files returned at least one MP3 audio stream under `ffprobe`. Durations recorded during the desktop verification are:

| File | Codec | Duration (seconds) |
| --- | --- | ---: |
| `combat-01.mp3` | `mp3` | 105.000 |
| `combat-02.mp3` | `mp3` | 177.024 |
| `combat-03.mp3` | `mp3` | 124.968 |
| `exploration-01.mp3` | `mp3` | 225.840 |
| `exploration-02.mp3` | `mp3` | 130.800 |
| `exploration-03.mp3` | `mp3` | 214.824 |
| `exploration-04.mp3` | `mp3` | 149.808 |
| `exploration-05.mp3` | `mp3` | 170.184 |
| `named-01.mp3` | `mp3` | 158.880 |
| `named-02.mp3` | `mp3` | 104.088 |
| `named-03.mp3` | `mp3` | 160.440 |
| `sanctuary-01.mp3` | `mp3` | 157.008 |
| `sanctuary-02.mp3` | `mp3` | 130.224 |
| `count-loadula-01.mp3` | `mp3` | 62.520 |
| `count-loadula-02.mp3` | `mp3` | 60.792 |
| `count-loadula-03.mp3` | `mp3` | 124.440 |

Because every disabled counterpart has the same SHA-256 as its enabled partner, the disabled file is the same binary and does not require a second decode test to establish identity.

## Wider bucket backup

The same recovery session also secured and byte-size-verified the **40 non-music objects** in `ccg-arcade-assets`. Those objects belong to the wider Arcade Asset Manager inventory (`backgrounds`, `bosses`, `collectibles`, `fighter`, `hazards`, `invaders`, `powers`, `spritesheets`) and are **not part of this 16-track Lost Sizzler runtime recovery set**. They are retained as bucket-backup evidence and are not to be copied into the Lost Sizzler package merely because they share the bucket.

## Repository promotion gate

Before any Storage object is considered for removal, all of these must be true:

- the 16 unique verified MP3 binaries exist in the intended repository/package destination;
- repository provenance records the exact SHA-256 and byte size;
- `audio-assets.js` / playlist runtime references point to those local paths without a Supabase fallback being required for normal play;
- Solo, Tutorial and 2P offline regressions pass;
- audio playlist/state-transition regressions pass;
- relevant online account/Weekly Vault/cloud-save/multiplayer regressions pass separately;
- a final human review explicitly approves any Storage removal.
