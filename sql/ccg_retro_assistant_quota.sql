-- Reviewed deployment prerequisite. Apply with owner approval; do not execute from public JS.
-- RLS is enabled and no public policies expose the usage counters.
CREATE TABLE IF NOT EXISTS public.ccg_retro_assistant_usage (
  day date NOT NULL,
  bucket text NOT NULL,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  PRIMARY KEY (day, bucket)
);
ALTER TABLE public.ccg_retro_assistant_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ccg_retro_assistant_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ccg_retro_assistant_usage TO service_role;

CREATE OR REPLACE FUNCTION public.ccg_retro_assistant_claim_quota(
  p_day date, p_bucket text, p_user_cap integer, p_global_cap integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE
  seen_user integer;
  seen_global integer;
BEGIN
  IF p_day <> (now() AT TIME ZONE 'UTC')::date
     OR p_bucket !~ '^ip:[a-f0-9]{64}$'
     OR p_user_cap NOT BETWEEN 1 AND 30
     OR p_global_cap NOT BETWEEN 1 AND 1000 THEN
    RETURN false;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ccg_retro_assistant_quota'));
  SELECT used INTO seen_global FROM public.ccg_retro_assistant_usage WHERE day=p_day AND bucket='all';
  SELECT used INTO seen_user FROM public.ccg_retro_assistant_usage WHERE day=p_day AND bucket=p_bucket;
  IF COALESCE(seen_global,0) >= p_global_cap OR COALESCE(seen_user,0) >= p_user_cap THEN
    RETURN false;
  END IF;
  INSERT INTO public.ccg_retro_assistant_usage(day,bucket,used) VALUES(p_day,'all',1)
    ON CONFLICT(day,bucket) DO UPDATE SET used=public.ccg_retro_assistant_usage.used+1;
  INSERT INTO public.ccg_retro_assistant_usage(day,bucket,used) VALUES(p_day,p_bucket,1)
    ON CONFLICT(day,bucket) DO UPDATE SET used=public.ccg_retro_assistant_usage.used+1;
  DELETE FROM public.ccg_retro_assistant_usage WHERE day < p_day - 7;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.ccg_retro_assistant_claim_quota(date,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ccg_retro_assistant_claim_quota(date,text,integer,integer) TO service_role;
