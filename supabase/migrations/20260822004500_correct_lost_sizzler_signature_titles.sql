delete from public.lost_sizzler_collectible_effects
where match_type='title'
  and match_value in ('Pac-Man','Mayhem in Monsterland');

insert into public.lost_sizzler_collectible_effects
  (match_type,match_value,effect_type,duration_ms,config,enabled)
values
  ('title','Cops ''N'' Robbers','score_feast',0,'{"popup":"MAZE FEAST!","score":1000}'::jsonb,true),
  ('title','Spy Vs Spy II: The Island Caper','tactical_freeze',6500,'{"popup":"SPY SABOTAGE!","enemy_time_scale":0.5}'::jsonb,true),
  ('title','Spy Vs Spy III: Arctic Antics','tactical_freeze',6500,'{"popup":"ARCTIC SABOTAGE!","enemy_time_scale":0.5}'::jsonb,true),
  ('title','Monkey Island 2: Lechuck''S Revenge','tactical_freeze',7000,'{"popup":"PIRATE CONFUSION!","enemy_time_scale":0.5}'::jsonb,true)
on conflict (match_type,match_value,effect_type) do update
set duration_ms=excluded.duration_ms,
    config=excluded.config,
    enabled=true,
    updated_at=now();
