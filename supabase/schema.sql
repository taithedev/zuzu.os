-- zuzu.os Supabase schema
-- Run in a fresh Supabase project. The connected project already has this schema applied.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'Zuzu User',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[A-Za-z0-9_.-]{3,24}$')
);

create table if not exists public.user_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  namespace text not null,
  item_key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, namespace, item_key),
  constraint user_data_namespace_length check (char_length(namespace) between 1 and 64),
  constraint user_data_key_length check (char_length(item_key) between 1 and 200)
);

create index if not exists user_data_user_namespace_idx on public.user_data(user_id, namespace);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Zuzu User'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_data_set_updated_at on public.user_data;
create trigger user_data_set_updated_at before update on public.user_data
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_data enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own data" on public.user_data;
create policy "Users can read their own data" on public.user_data for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create their own data" on public.user_data;
create policy "Users can create their own data" on public.user_data for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own data" on public.user_data;
create policy "Users can update their own data" on public.user_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own data" on public.user_data;
create policy "Users can delete their own data" on public.user_data for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_data to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('zuzu-user-files', 'zuzu-user-files', false, 10485760, array['image/png','image/jpeg','image/webp','image/svg+xml','text/plain','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "Users access own storage folder" on storage.objects;
create policy "Users access own storage folder" on storage.objects for select to authenticated
using (bucket_id = 'zuzu-user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users upload to own storage folder" on storage.objects;
create policy "Users upload to own storage folder" on storage.objects for insert to authenticated
with check (bucket_id = 'zuzu-user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users update own storage folder" on storage.objects;
create policy "Users update own storage folder" on storage.objects for update to authenticated
using (bucket_id = 'zuzu-user-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'zuzu-user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users delete own storage folder" on storage.objects;
create policy "Users delete own storage folder" on storage.objects for delete to authenticated
using (bucket_id = 'zuzu-user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Keep the trigger function unavailable as a public RPC endpoint.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
