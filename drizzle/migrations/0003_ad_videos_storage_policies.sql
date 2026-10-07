-- Owner-scoped access to the private ad-videos bucket.
-- Uploads happen server-side via the service role; these policies let
-- signed-in users read only their own folder if they ever access storage directly.
create policy "ad_videos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'ad-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ad_videos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ad-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ad_videos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ad-videos' and (storage.foldername(name))[1] = auth.uid()::text);