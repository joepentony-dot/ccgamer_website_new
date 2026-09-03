# The Lost Sizzler — Supabase Storage Recovery Manifest

This manifest freezes the read-only database metadata needed for the planned Lost Sizzler Storage recovery. It does **not** authorise deletion of any Supabase object.

## Recovery rules

- Bucket: `ccg-arcade-assets`
- Recover the **16 enabled objects first**.
- Record the actual downloaded byte size and SHA-256 for every enabled object.
- Verify every downloaded file decodes/plays before changing runtime references.
- Compare each disabled counterpart by **SHA-256**, not by filename or byte size alone.
- Matching byte size is useful pairing evidence but is **not proof** that two binaries are identical.
- Do not delete, overwrite or disable any Storage object during recovery.
- Do not assign a final repository destination until the local asset/reference audit confirms where each recovered track belongs.
- No object is eligible for removal until local playback, repository-reference tracing and offline regression checks have all passed.

## Frozen metadata snapshot

Database source: `public.arcade_assets`

Metadata pairing key: `asset_meta.playlist_category + asset_meta.original_name`

Snapshot result:

- Enabled objects: **16**
- Enabled bytes: **72,233,137**
- Disabled counterparts: **16**
- Disabled bytes: **72,233,137**
- Pairs with matching database byte size: **16 / 16**
- Cryptographic equality: **NOT YET VERIFIED**

## Recovery manifest

| # | Playlist | Original file | Enabled row | Enabled Storage path | Expected bytes | Enabled SHA-256 | Disabled row | Disabled Storage path | Disabled SHA-256 | Pair status | Local destination |
| ---: | --- | --- | ---: | --- | ---: | --- | ---: | --- | --- | --- | --- |
| 1 | `lostSizzlerDanger` | `combat-01.mp3` | 62 | `music/lostSizzlerDanger/1787411621547-0-combat-01.mp3` | 3,360,888 | PENDING | 83 | `music/lostSizzlerDanger/1787411795701-0-combat-01.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 2 | `lostSizzlerDanger` | `combat-02.mp3` | 76 | `music/lostSizzlerDanger/1787411636390-14-combat-02.mp3` | 5,665,656 | PENDING | 85 | `music/lostSizzlerDanger/1787411797639-2-combat-02.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 3 | `lostSizzlerDanger` | `combat-03.mp3` | 63 | `music/lostSizzlerDanger/1787411622953-1-combat-03.mp3` | 3,999,864 | PENDING | 84 | `music/lostSizzlerDanger/1787411796554-1-combat-03.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 4 | `lostSizzlerExploration` | `exploration-01.mp3` | 67 | `music/lostSizzlerExploration/1787411626645-5-exploration-01.mp3` | 7,227,773 | PENDING | 78 | `music/lostSizzlerExploration/1787411768267-0-exploration-01.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 5 | `lostSizzlerExploration` | `exploration-02.mp3` | 68 | `music/lostSizzlerExploration/1787411628149-6-exploration-02.mp3` | 4,186,493 | PENDING | 79 | `music/lostSizzlerExploration/1787411770422-1-exploration-02.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 6 | `lostSizzlerExploration` | `exploration-03.mp3` | 69 | `music/lostSizzlerExploration/1787411629062-7-exploration-03.mp3` | 6,875,261 | PENDING | 80 | `music/lostSizzlerExploration/1787411771463-2-exploration-03.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 7 | `lostSizzlerExploration` | `exploration-04.mp3` | 70 | `music/lostSizzlerExploration/1787411630429-8-exploration-04.mp3` | 4,794,749 | PENDING | 81 | `music/lostSizzlerExploration/1787411772966-3-exploration-04.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 8 | `lostSizzlerExploration` | `exploration-05.mp3` | 71 | `music/lostSizzlerExploration/1787411631439-9-exploration-05.mp3` | 5,446,781 | PENDING | 82 | `music/lostSizzlerExploration/1787411774062-4-exploration-05.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 9 | `lostSizzlerNamed` | `named-01.mp3` | 72 | `music/lostSizzlerNamed/1787411632588-10-named-01.mp3` | 5,085,047 | PENDING | 88 | `music/lostSizzlerNamed/1787411833343-0-named-01.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 10 | `lostSizzlerNamed` | `named-02.mp3` | 73 | `music/lostSizzlerNamed/1787411633643-11-named-02.mp3` | 3,331,703 | PENDING | 89 | `music/lostSizzlerNamed/1787411834681-1-named-02.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 11 | `lostSizzlerNamed` | `named-03.mp3` | 77 | `music/lostSizzlerNamed/1787411637581-15-named-03.mp3` | 5,134,967 | PENDING | 90 | `music/lostSizzlerNamed/1787411835807-2-named-03.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 12 | `lostSizzlerSanctuary` | `sanctuary-01.mp3` | 74 | `music/lostSizzlerSanctuary/1787411634411-12-sanctuary-01.mp3` | 5,025,147 | PENDING | 86 | `music/lostSizzlerSanctuary/1787411813111-0-sanctuary-01.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 13 | `lostSizzlerSanctuary` | `sanctuary-02.mp3` | 75 | `music/lostSizzlerSanctuary/1787411635463-13-sanctuary-02.mp3` | 4,168,059 | PENDING | 87 | `music/lostSizzlerSanctuary/1787411814619-1-sanctuary-02.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 14 | `lostSizzlerStalker` | `count-loadula-01.mp3` | 64 | `music/lostSizzlerStalker/1787411624060-2-count-loadula-01.mp3` | 2,001,535 | PENDING | 91 | `music/lostSizzlerStalker/1787411848317-0-count-loadula-01.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 15 | `lostSizzlerStalker` | `count-loadula-02.mp3` | 65 | `music/lostSizzlerStalker/1787411624977-3-count-loadula-02.mp3` | 1,946,239 | PENDING | 92 | `music/lostSizzlerStalker/1787411849059-1-count-loadula-02.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |
| 16 | `lostSizzlerStalker` | `count-loadula-03.mp3` | 66 | `music/lostSizzlerStalker/1787411625578-4-count-loadula-03.mp3` | 3,982,975 | PENDING | 93 | `music/lostSizzlerStalker/1787411849620-2-count-loadula-03.mp3` | PENDING | SIZE MATCH ONLY | TBD AFTER VERIFY |

## Recovery-day recording fields

For every enabled object, record:

1. download timestamp;
2. downloaded byte size;
3. SHA-256;
4. decode/playback result;
5. duration and codec if useful for identification;
6. repository/reference matches;
7. final local destination;
8. offline playback regression result.

For every disabled counterpart, record its SHA-256 if/when downloaded. Only mark a pair `HASH IDENTICAL` when the enabled and disabled SHA-256 values match exactly.

## Deletion gate

A disabled or enabled Supabase object must remain untouched until all of these are true:

- verified local binary exists;
- SHA-256 is recorded;
- file decodes successfully;
- all Lost Sizzler references are traced;
- the local runtime uses the intended local asset;
- Solo/Tutorial/2P offline regressions pass;
- relevant online regressions pass separately;
- any supposedly duplicate Storage generation has matching cryptographic hashes;
- a final human review explicitly approves removal.
