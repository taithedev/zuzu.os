-- ZuzuOS private personal wallpapers. Does not touch bot_* tables.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('zuzu-wallpapers','zuzu-wallpapers',false,52428800,
array['image/png','image/jpeg','image/gif','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public=false,file_size_limit=52428800,
allowed_mime_types=excluded.allowed_mime_types;

create policy "zuzu wallpaper owner can read" on storage.objects
for select to authenticated using (
  bucket_id='zuzu-wallpapers' and (storage.foldername(name))[1]=(select auth.uid()::text)
);
create policy "zuzu wallpaper owner can upload" on storage.objects
for insert to authenticated with check (
  bucket_id='zuzu-wallpapers' and (storage.foldername(name))[1]=(select auth.uid()::text)
);
create policy "zuzu wallpaper owner can delete" on storage.objects
for delete to authenticated using (
  bucket_id='zuzu-wallpapers' and (storage.foldername(name))[1]=(select auth.uid()::text)
);
