-- Isolated anonymous-friendly total for the CCG Do Not Press button.
-- Only the fixed single row can be read/incremented through its two public RPCs.
CREATE TABLE IF NOT EXISTS public.ccg_do_not_press_totals (
  id smallint PRIMARY KEY CHECK (id = 1),
  press_count bigint NOT NULL DEFAULT 0 CHECK (press_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ccg_do_not_press_totals (id, press_count)
VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ccg_do_not_press_totals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ccg_do_not_press_totals FROM PUBLIC, anon, authenticated;

-- These intentionally public SECURITY DEFINER functions have a fixed query and
-- no user-controlled SQL parameters; the underlying table remains inaccessible.
CREATE OR REPLACE FUNCTION public.ccg_do_not_press_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT press_count FROM public.ccg_do_not_press_totals WHERE id = 1;
$$;

CREATE OR REPLACE FUNCTION public.ccg_do_not_press_increment()
RETURNS bigint LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE current_total bigint;
BEGIN
  UPDATE public.ccg_do_not_press_totals
     SET press_count = press_count + 1, updated_at = now()
   WHERE id = 1 RETURNING press_count INTO current_total;
  IF current_total IS NULL THEN
    RAISE EXCEPTION 'CCG button counter row missing';
  END IF;
  RETURN current_total;
END;
$$;

REVOKE ALL ON FUNCTION public.ccg_do_not_press_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ccg_do_not_press_increment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ccg_do_not_press_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ccg_do_not_press_increment() TO anon, authenticated;
