
-- downloads: queue + caption fields
ALTER TABLE public.downloads
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','success','error')),
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS ai_caption TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- profiles: preference fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS appearance TEXT NOT NULL DEFAULT 'system'
    CHECK (appearance IN ('light','dark','system'));

-- updated_at trigger for downloads
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS downloads_set_updated_at ON public.downloads;
CREATE TRIGGER downloads_set_updated_at
  BEFORE UPDATE ON public.downloads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime on downloads
ALTER TABLE public.downloads REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'downloads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.downloads;
  END IF;
END $$;
