delete from public.lost_sizzler_collectible_effects
where match_type='title'
  and match_value in ('Ghouls ''n Ghosts','Dungeon Master','Frogger','International Karate');

insert into public.lost_sizzler_collectible_effects
  (match_type,match_value,effect_type,duration_ms,config,enabled)
values
  ('title','Bloodwych','xp_boon',0,'{"popup":"BLOODWYCH POWER!","xp":500}'::jsonb,true)
on conflict (match_type,match_value,effect_type) do update
set duration_ms=excluded.duration_ms,
    config=excluded.config,
    enabled=true,
    updated_at=now();
