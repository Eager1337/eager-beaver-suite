CREATE OR REPLACE FUNCTION public.browse_feed(_limit int DEFAULT 60, _offset int DEFAULT 0, _type text DEFAULT NULL)
RETURNS TABLE(id uuid, title text, author_name text, media_type text, media_url text, preview_url text, thumbnail_url text, width int, height int, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.title, d.author_name, d.media_type, d.media_url, d.preview_url, d.thumbnail_url, d.width, d.height, d.created_at
  FROM public.downloads d
  WHERE d.status = 'success' AND d.media_url LIKE 'https://%'
    AND (_type IS NULL OR d.media_type = _type)
  ORDER BY d.created_at DESC
  LIMIT LEAST(GREATEST(_limit,1),100) OFFSET GREATEST(_offset,0)
$$;
GRANT EXECUTE ON FUNCTION public.browse_feed(int,int,text) TO anon, authenticated;