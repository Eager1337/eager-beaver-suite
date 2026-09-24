CREATE TABLE public.video_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  title text,
  video_url text NOT NULL,
  poster_url text,
  source text NOT NULL DEFAULT 'upload',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT video_links_url_len CHECK (char_length(video_url) <= 2000),
  CONSTRAINT video_links_title_len CHECK (title IS NULL OR char_length(title) <= 200)
);
GRANT SELECT, INSERT ON public.video_links TO anon, authenticated;
GRANT ALL ON public.video_links TO service_role;
ALTER TABLE public.video_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view video links" ON public.video_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create video links" ON public.video_links FOR INSERT TO anon, authenticated
  WITH CHECK ((created_by IS NULL OR created_by = auth.uid()) AND video_url LIKE 'https://%');

CREATE POLICY "Anyone can upload videos" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = 'uploads');
CREATE POLICY "Anyone can read videos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'videos');