-- The Lost Sizzler: account-backed achievement catalogue and award endpoint.
-- Gameplay unlocks remain locally available for guests. Signed-in players may
-- copy only keys from this fixed catalogue into their own profile badge rows.

insert into public.badge_definitions (slug, name, description, icon, rarity, rule_json, active)
values
  ('ls-first-run', 'Dungeon Door Open', 'Start a Lost Sizzler run.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_FIRST_RUN","category":"journey","sort_order":1,"requirement_value":1}'::jsonb, true),
  ('ls-tutorial-graduate', 'Training Archive Graduate', 'Complete the Tutorial.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_TUTORIAL_GRADUATE","category":"journey","sort_order":2,"requirement_value":1}'::jsonb, true),
  ('ls-floor-1', 'Archive Cleared', 'Clear Floor 1.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_FLOOR_1","category":"journey","sort_order":3,"requirement_value":1}'::jsonb, true),
  ('ls-floor-2', 'Workshop Cleared', 'Clear Floor 2.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_FLOOR_2","category":"journey","sort_order":4,"requirement_value":1}'::jsonb, true),
  ('ls-floor-3', 'Reactor Cleared', 'Clear Floor 3.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_FLOOR_3","category":"journey","sort_order":5,"requirement_value":1}'::jsonb, true),
  ('ls-floor-4', 'Crypt Cleared', 'Clear Floor 4.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_FLOOR_4","category":"journey","sort_order":6,"requirement_value":1}'::jsonb, true),
  ('ls-floor-5', 'Citadel Cleared', 'Clear Floor 5.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_FLOOR_5","category":"journey","sort_order":7,"requirement_value":1}'::jsonb, true),
  ('ls-citadel-platinum', 'Lost Sizzler Platinum', 'Complete the full five-floor game and recover the Lost Sizzler.', '★', 'legendary', '{"game":"lost-sizzler","badge_key":"LS_CITADEL_PLATINUM","category":"platinum","sort_order":8,"requirement_value":1}'::jsonb, true),
  ('ls-solo-champion', 'Solo Sizzler', 'Complete the game in Solo mode.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_SOLO_CHAMPION","category":"journey","sort_order":9,"requirement_value":1}'::jsonb, true),
  ('ls-split-champion', 'Sofa Sizzlers', 'Complete the game in local split-screen co-op.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_SPLIT_CHAMPION","category":"journey","sort_order":10,"requirement_value":1}'::jsonb, true),
  ('ls-online-champion', 'Network Heroes', 'Complete the game in online co-op.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_ONLINE_CHAMPION","category":"journey","sort_order":11,"requirement_value":1}'::jsonb, true),
  ('ls-weekly-champion', 'Weekly Vault Victor', 'Complete the Weekly High-Score Vault.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_WEEKLY_CHAMPION","category":"journey","sort_order":12,"requirement_value":1}'::jsonb, true),
  ('ls-speedrun-45', 'Fast Loader', 'Complete the game in under 45 minutes.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_SPEEDRUN_45","category":"journey","sort_order":13,"requirement_value":1}'::jsonb, true),
  ('ls-no-death-victory', 'One Life, Five Floors', 'Complete the game without dying.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_NO_DEATH_VICTORY","category":"journey","sort_order":14,"requirement_value":1}'::jsonb, true),
  ('ls-first-kill', 'First Blood', 'Defeat your first enemy in a run.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_FIRST_KILL","category":"combat","sort_order":15,"requirement_value":1}'::jsonb, true),
  ('ls-kills-10', 'Ten Down', 'Defeat 10 enemies in one run.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_KILLS_10","category":"combat","sort_order":16,"requirement_value":1}'::jsonb, true),
  ('ls-kills-25', 'Dungeon Sweeper', 'Defeat 25 enemies in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_KILLS_25","category":"combat","sort_order":17,"requirement_value":1}'::jsonb, true),
  ('ls-kills-50', 'Fifty Freed', 'Defeat 50 enemies in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_KILLS_50","category":"combat","sort_order":18,"requirement_value":1}'::jsonb, true),
  ('ls-kills-100', 'Centurion', 'Defeat 100 enemies in one run.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_KILLS_100","category":"combat","sort_order":19,"requirement_value":1}'::jsonb, true),
  ('ls-champion-1', 'Champion Tamer', 'Defeat a champion enemy.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_CHAMPION_1","category":"combat","sort_order":20,"requirement_value":1}'::jsonb, true),
  ('ls-champions-5', 'Sizzler Hunter', 'Defeat 5 champions in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_CHAMPIONS_5","category":"combat","sort_order":21,"requirement_value":1}'::jsonb, true),
  ('ls-champions-10', 'Champion of Champions', 'Defeat 10 champions in one run.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_CHAMPIONS_10","category":"combat","sort_order":22,"requirement_value":1}'::jsonb, true),
  ('ls-guardian-down', 'Guardian Breaker', 'Defeat a floor Guardian.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_GUARDIAN_DOWN","category":"combat","sort_order":23,"requirement_value":1}'::jsonb, true),
  ('ls-sigil-warden-down', 'Warden Dismissed', 'Defeat a Sigil Warden.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_SIGIL_WARDEN_DOWN","category":"combat","sort_order":24,"requirement_value":1}'::jsonb, true),
  ('ls-named-enemy-1', 'Name Remembered', 'Defeat a named enemy.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_NAMED_ENEMY_1","category":"combat","sort_order":25,"requirement_value":1}'::jsonb, true),
  ('ls-named-enemies-5', 'Dossier Closer', 'Defeat 5 named enemies in one run.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_NAMED_ENEMIES_5","category":"combat","sort_order":26,"requirement_value":1}'::jsonb, true),
  ('ls-sword-swings-25', 'Blade Learner', 'Swing a melee weapon 25 times in one run.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_SWORD_SWINGS_25","category":"combat","sort_order":27,"requirement_value":1}'::jsonb, true),
  ('ls-sword-swings-100', 'SID Sabreur', 'Swing a melee weapon 100 times in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_SWORD_SWINGS_100","category":"combat","sort_order":28,"requirement_value":1}'::jsonb, true),
  ('ls-sword-kills-10', 'Cutting Remarks', 'Defeat 10 enemies with melee attacks in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_SWORD_KILLS_10","category":"combat","sort_order":29,"requirement_value":1}'::jsonb, true),
  ('ls-gun-kills-10', 'Straight Shooter', 'Defeat 10 enemies with firearms in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_GUN_KILLS_10","category":"combat","sort_order":30,"requirement_value":1}'::jsonb, true),
  ('ls-hazard-kill', 'Use the Scenery', 'Knock an enemy into a damaging floor hazard.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_HAZARD_KILL","category":"combat","sort_order":31,"requirement_value":1}'::jsonb, true),
  ('ls-vortex-kill', 'Into the Vortex', 'Knock an enemy into a rare vortex.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_VORTEX_KILL","category":"combat","sort_order":32,"requirement_value":1}'::jsonb, true),
  ('ls-stalker-banished', 'No More Stalking', 'Permanently banish a Death Stalker.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_STALKER_BANISHED","category":"combat","sort_order":33,"requirement_value":1}'::jsonb, true),
  ('ls-bounty-1', 'Bounty Claimed', 'Complete a floor Dungeon Bounty.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_BOUNTY_1","category":"combat","sort_order":34,"requirement_value":1}'::jsonb, true),
  ('ls-bounties-5', 'Bounty Grand Slam', 'Complete the Dungeon Bounty on all five floors in one run.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_BOUNTIES_5","category":"combat","sort_order":35,"requirement_value":1}'::jsonb, true),
  ('ls-main-key-1', 'Key Person', 'Collect a Main Vault Key.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_MAIN_KEY_1","category":"objectives","sort_order":36,"requirement_value":1}'::jsonb, true),
  ('ls-main-keys-all', 'Vault Route Open', 'Collect every required Main Vault Key on a floor.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_MAIN_KEYS_ALL","category":"objectives","sort_order":37,"requirement_value":1}'::jsonb, true),
  ('ls-exit-sigil', 'Sigil Bearer', 'Recover an Exit Sigil.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_EXIT_SIGIL","category":"objectives","sort_order":38,"requirement_value":1}'::jsonb, true),
  ('ls-floor-exit', 'Extraction Route', 'Reach an unlocked floor exit.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_FLOOR_EXIT","category":"objectives","sort_order":39,"requirement_value":1}'::jsonb, true),
  ('ls-generator-1', 'Machine Breaker', 'Destroy a monster generator.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_GENERATOR_1","category":"objectives","sort_order":40,"requirement_value":1}'::jsonb, true),
  ('ls-generators-all', 'Power Cut', 'Destroy every required generator on a floor.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_GENERATORS_ALL","category":"objectives","sort_order":41,"requirement_value":1}'::jsonb, true),
  ('ls-rescue-scout', 'Nobody Left Behind', 'Rescue the trapped CCG Scout.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_RESCUE_SCOUT","category":"objectives","sort_order":42,"requirement_value":1}'::jsonb, true),
  ('ls-objective-variety', 'Mission Specialist', 'Complete three different main-objective types in one run.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_OBJECTIVE_VARIETY","category":"objectives","sort_order":43,"requirement_value":1}'::jsonb, true),
  ('ls-secret-1', 'Suspicious Wall', 'Find a secret route.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_SECRET_1","category":"exploration","sort_order":44,"requirement_value":1}'::jsonb, true),
  ('ls-secrets-3', 'No Wall Is Safe', 'Find 3 secret routes in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_SECRETS_3","category":"exploration","sort_order":45,"requirement_value":1}'::jsonb, true),
  ('ls-secrets-10', 'Dungeon Surveyor', 'Find 10 secret routes in one run.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_SECRETS_10","category":"exploration","sort_order":46,"requirement_value":1}'::jsonb, true),
  ('ls-map-75', 'Mostly Mapped', 'Map 75% of a floor.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_MAP_75","category":"exploration","sort_order":47,"requirement_value":1}'::jsonb, true),
  ('ls-map-100', 'Every Corner', 'Map 100% of a floor.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_MAP_100","category":"exploration","sort_order":48,"requirement_value":1}'::jsonb, true),
  ('ls-rooms-25', 'Corridor Commuter', 'Enter 25 rooms in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_ROOMS_25","category":"exploration","sort_order":49,"requirement_value":1}'::jsonb, true),
  ('ls-chest-1', 'Lid Lifter', 'Open a chest.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_CHEST_1","category":"exploration","sort_order":50,"requirement_value":1}'::jsonb, true),
  ('ls-chests-10', 'Chest Inspector', 'Open 10 chests in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_CHESTS_10","category":"exploration","sort_order":51,"requirement_value":1}'::jsonb, true),
  ('ls-chests-25', 'Vault Vacuum', 'Open 25 chests in one run.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_CHESTS_25","category":"exploration","sort_order":52,"requirement_value":1}'::jsonb, true),
  ('ls-shrine-1', 'Risky Prayer', 'Use a shrine.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_SHRINE_1","category":"exploration","sort_order":53,"requirement_value":1}'::jsonb, true),
  ('ls-shrines-5', 'Dungeon Devotee', 'Use 5 shrines in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_SHRINES_5","category":"exploration","sort_order":54,"requirement_value":1}'::jsonb, true),
  ('ls-memory-puzzle', 'Good Memory', 'Solve the Memory Tile Chamber.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_MEMORY_PUZZLE","category":"exploration","sort_order":55,"requirement_value":1}'::jsonb, true),
  ('ls-torch-puzzle', 'Four Flames', 'Solve the Torch Vault sequence.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_TORCH_PUZZLE","category":"exploration","sort_order":56,"requirement_value":1}'::jsonb, true),
  ('ls-weight-bridge', 'Travel Light', 'Cross and stabilise the rotten weight bridge.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_WEIGHT_BRIDGE","category":"exploration","sort_order":57,"requirement_value":1}'::jsonb, true),
  ('ls-boulder-survivor', 'Rock and Run', 'Survive a Boulder Corridor.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_BOULDER_SURVIVOR","category":"exploration","sort_order":58,"requirement_value":1}'::jsonb, true),
  ('ls-rare-loot', 'Something Rare', 'Collect rare loot.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_RARE_LOOT","category":"collection","sort_order":59,"requirement_value":1}'::jsonb, true),
  ('ls-zzap-loot', 'Zzap! 97%', 'Collect a Zzap! 97% item.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_ZZAP_LOOT","category":"collection","sort_order":60,"requirement_value":1}'::jsonb, true),
  ('ls-rare-melee', 'Blade Upgrade', 'Find and equip a rare melee weapon.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_RARE_MELEE","category":"collection","sort_order":61,"requirement_value":1}'::jsonb, true),
  ('ls-game-pickup-1', 'Rescue Disk', 'Collect a C64 game pickup.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_GAME_PICKUP_1","category":"collection","sort_order":62,"requirement_value":1}'::jsonb, true),
  ('ls-game-pickups-5', 'Five Saved Games', 'Collect 5 C64 game pickups in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_GAME_PICKUPS_5","category":"collection","sort_order":63,"requirement_value":1}'::jsonb, true),
  ('ls-game-pickups-10', 'Archive Haul', 'Collect 10 C64 game pickups in one run.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_GAME_PICKUPS_10","category":"collection","sort_order":64,"requirement_value":1}'::jsonb, true),
  ('ls-death-cache', 'Back for More', 'Recover a death cache.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_DEATH_CACHE","category":"collection","sort_order":65,"requirement_value":1}'::jsonb, true),
  ('ls-buried-cache', 'X Marks the Spot', 'Find a buried Treasure Map cache.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_BURIED_CACHE","category":"collection","sort_order":66,"requirement_value":1}'::jsonb, true),
  ('ls-mimic', 'Chest Dentist', 'Defeat a Mimic.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_MIMIC","category":"rare_events","sort_order":67,"requirement_value":1}'::jsonb, true),
  ('ls-gilded-elf', 'Caught in Gold', 'Catch the Gilded Elf.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_GILDED_ELF","category":"rare_events","sort_order":68,"requirement_value":1}'::jsonb, true),
  ('ls-treasure-bat', 'Batting Average', 'Defeat a Treasure Bat before it escapes.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_TREASURE_BAT","category":"rare_events","sort_order":69,"requirement_value":1}'::jsonb, true),
  ('ls-taxman', 'Tax Rebate', 'Catch the Taxman.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_TAXMAN","category":"rare_events","sort_order":70,"requirement_value":1}'::jsonb, true),
  ('ls-adventurer', 'Escort Service', 'Save a Lost Adventurer.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_ADVENTURER","category":"rare_events","sort_order":71,"requirement_value":1}'::jsonb, true),
  ('ls-golden-room', 'Golden Survivor', 'Survive a Golden Room.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_GOLDEN_ROOM","category":"rare_events","sort_order":72,"requirement_value":1}'::jsonb, true),
  ('ls-merchant', 'Window Shopper', 'Find a wandering merchant.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_MERCHANT","category":"rare_events","sort_order":73,"requirement_value":1}'::jsonb, true),
  ('ls-potion-used', 'Medic!', 'Use a restoration potion.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_POTION_USED","category":"mastery","sort_order":74,"requirement_value":1}'::jsonb, true),
  ('ls-torch-used', 'Light Fantastic', 'Light a torch.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_TORCH_USED","category":"mastery","sort_order":75,"requirement_value":1}'::jsonb, true),
  ('ls-teleport-used', 'Now You See Me', 'Use a teleport spell.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_TELEPORT_USED","category":"mastery","sort_order":76,"requirement_value":1}'::jsonb, true),
  ('ls-banishment-used', 'Flask Force', 'Use a Banishment Flask.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_BANISHMENT_USED","category":"mastery","sort_order":77,"requirement_value":1}'::jsonb, true),
  ('ls-level-5', 'Powering Up', 'Reach Level 5.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_LEVEL_5","category":"mastery","sort_order":78,"requirement_value":1}'::jsonb, true),
  ('ls-level-8', 'Power User', 'Reach Level 8.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_LEVEL_8","category":"mastery","sort_order":79,"requirement_value":1}'::jsonb, true),
  ('ls-level-10', 'Double Figures', 'Reach Level 10.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_LEVEL_10","category":"mastery","sort_order":80,"requirement_value":1}'::jsonb, true),
  ('ls-score-5000', 'Score 5,000', 'Reach 5,000 score in one run.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_SCORE_5000","category":"mastery","sort_order":81,"requirement_value":1}'::jsonb, true),
  ('ls-score-10000', 'Score 10,000', 'Reach 10,000 score in one run.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_SCORE_10000","category":"mastery","sort_order":82,"requirement_value":1}'::jsonb, true),
  ('ls-score-25000', 'Score 25,000', 'Reach 25,000 score in one run.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_SCORE_25000","category":"mastery","sort_order":83,"requirement_value":1}'::jsonb, true),
  ('ls-score-50000', 'Score 50,000', 'Reach 50,000 score in one run.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_SCORE_50000","category":"mastery","sort_order":84,"requirement_value":1}'::jsonb, true),
  ('ls-armour-10', 'Tin Can Hero', 'Carry 10 armour points at once.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_ARMOUR_10","category":"mastery","sort_order":85,"requirement_value":1}'::jsonb, true),
  ('ls-one-hp-floor', 'Skin of Your Teeth', 'Clear a floor while on exactly 1 HP.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_ONE_HP_FLOOR","category":"mastery","sort_order":86,"requirement_value":1}'::jsonb, true),
  ('ls-no-damage-floor', 'Untouched', 'Clear a floor without taking damage.', '◆', 'epic', '{"game":"lost-sizzler","badge_key":"LS_NO_DAMAGE_FLOOR","category":"mastery","sort_order":87,"requirement_value":1}'::jsonb, true),
  ('ls-no-death-floor', 'Still Standing', 'Clear a floor without dying.', '◆', 'rare', '{"game":"lost-sizzler","badge_key":"LS_NO_DEATH_FLOOR","category":"mastery","sort_order":88,"requirement_value":1}'::jsonb, true),
  ('ls-empty-ammo-blade', 'Out of Ammo, Not Options', 'Swing your melee weapon after ammunition reaches zero.', '◆', 'common', '{"game":"lost-sizzler","badge_key":"LS_EMPTY_AMMO_BLADE","category":"mastery","sort_order":89,"requirement_value":1}'::jsonb, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  rarity = excluded.rarity,
  rule_json = excluded.rule_json,
  active = excluded.active;

create or replace function public.get_lost_sizzler_badge_catalog()
returns table (
  badge_key text,
  badge_name text,
  badge_description text,
  badge_category text,
  requirement_value int,
  sort_order int
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    upper(coalesce(nullif(d.rule_json ->> 'badge_key', ''), replace(d.slug, '-', '_'))) as badge_key,
    d.name as badge_name,
    coalesce(d.description, '') as badge_description,
    coalesce(nullif(d.rule_json ->> 'category', ''), 'achievement') as badge_category,
    coalesce((d.rule_json ->> 'requirement_value')::int, 1) as requirement_value,
    coalesce((d.rule_json ->> 'sort_order')::int, 1000) as sort_order
  from public.badge_definitions d
  where d.active
    and d.rule_json ->> 'game' = 'lost-sizzler'
  order by sort_order, badge_key;
$$;

revoke all
  on function public.get_lost_sizzler_badge_catalog()
  from public, anon;
grant execute
  on function public.get_lost_sizzler_badge_catalog()
  to authenticated;

create or replace function public.get_member_badge_catalog()
returns table (
  badge_key text,
  badge_name text,
  badge_description text,
  badge_category text,
  requirement_value int,
  sort_order int
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select catalog.*
  from (
    select *
    from (
      values
        ('FIRST_RATING', 'First Score', 'Rate your first Commodore game.', 'ratings', 1, 10),
        ('RATED_10', 'Score Keeper', 'Rate 10 Commodore games.', 'ratings', 10, 20),
        ('RATED_50', 'Archive Critic', 'Rate 50 Commodore games.', 'ratings', 50, 30),
        ('FIRST_COMMENT', 'First Word', 'Post your first game comment.', 'comments', 1, 40),
        ('COMMENTER_10', 'Community Voice', 'Post 10 game comments.', 'comments', 10, 50),
        ('FIRST_LIBRARY_GAME', 'Collection Started', 'Add your first game to the private Member Hub library.', 'library', 1, 60),
        ('LIBRARY_10', 'Shelf Builder', 'Keep 10 games in your private Member Hub library.', 'library', 10, 70),
        ('LIBRARY_50', 'Game Room', 'Keep 50 games in your private Member Hub library.', 'library', 50, 80),
        ('LIBRARY_100', 'Archive Keeper', 'Keep 100 games in your private Member Hub library.', 'library', 100, 90),
        ('C64_EXPLORER', 'C64 Explorer', 'Add a Commodore 64 game to your private library.', 'systems', 1, 100),
        ('AMIGA_EXPLORER', 'Amiga Explorer', 'Add a Commodore Amiga game to your private library.', 'systems', 1, 110),
        ('DUAL_SYSTEM', 'Commodore All-Rounder', 'Add both C64 and Amiga games to your private library.', 'systems', 2, 120)
    ) as milestones(badge_key, badge_name, badge_description, badge_category, requirement_value, sort_order)
    union all
    select
      game.badge_key,
      game.badge_name,
      game.badge_description,
      game.badge_category,
      game.requirement_value,
      1000 + game.sort_order
    from public.get_lost_sizzler_badge_catalog() game
  ) catalog
  order by catalog.sort_order, catalog.badge_key;
$$;

revoke all
  on function public.get_member_badge_catalog()
  from public, anon;
grant execute
  on function public.get_member_badge_catalog()
  to authenticated;

create or replace function public.award_lost_sizzler_achievement(target_badge_key text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  member_id uuid := auth.uid();
  normalized_key text := upper(replace(trim(coalesce(target_badge_key, '')), '-', '_'));
begin
  if member_id is null then
    raise exception 'Authentication required';
  end if;

  if normalized_key = '' or not exists (
    select 1
    from public.get_lost_sizzler_badge_catalog() catalog
    where catalog.badge_key = normalized_key
  ) then
    raise exception 'Unknown Lost Sizzler achievement';
  end if;

  return public.ccg_award_badge_code(member_id, normalized_key);
end;
$$;

revoke all
  on function public.award_lost_sizzler_achievement(text)
  from public, anon;
grant execute
  on function public.award_lost_sizzler_achievement(text)
  to authenticated;
