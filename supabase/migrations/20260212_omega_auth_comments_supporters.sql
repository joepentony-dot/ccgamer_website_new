-- Omega production repair: comments/reporting/supporter links/auth redirects compatibility

CREATE TABLE IF NOT EXISTS public.comment_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL,
  reporter_user_id uuid NOT NULL,
  reason text,
  page_type text,
  page_id text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'comment_reports'
      AND policyname = 'reports_insert_authenticated'
  ) THEN
    CREATE POLICY "reports_insert_authenticated"
      ON public.comment_reports
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = reporter_user_id);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.supporter_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  platform text,
  url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS page_type text;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS page_id text;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'comments'
      AND policyname = 'comments_owner_update'
  ) THEN
    CREATE POLICY "comments_owner_update"
      ON public.comments
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'comments'
      AND policyname = 'comments_owner_delete'
  ) THEN
    CREATE POLICY "comments_owner_delete"
      ON public.comments
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS rating integer;
