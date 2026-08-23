-- Lost Sizzler custom voice overrides.
-- Reuses the existing protected Arcade Assets table and audio storage bucket.

ALTER TABLE public.arcade_assets
  DROP CONSTRAINT IF EXISTS arcade_assets_asset_group_check;

ALTER TABLE public.arcade_assets
  ADD CONSTRAINT arcade_assets_asset_group_check CHECK (asset_group IN (
    'backgrounds','layers','bosses','hazards','collectibles','powers',
    'fighter','invaders','player','spritesheets','music','sfx','voice'
  ));
