create or replace function public.is_os_owner()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.os_roles r where r.user_id = (select auth.uid()) and r.role = 'owner'); $$;
revoke all on function public.is_os_owner() from public, anon;
grant execute on function public.is_os_owner() to authenticated;
drop policy if exists "Users can read their own ZuzuOS role" on public.os_roles;
create policy "Users can read their own role and owners can read role directory" on public.os_roles for select to authenticated using (user_id = (select auth.uid()) or (select public.is_os_owner()));

create or replace function public.owner_set_os_role(target_email text, target_role text)
returns text language plpgsql security definer set search_path = ''
as $$
declare target_id uuid; clean_email text;
begin
  if (select auth.uid()) is null or not public.is_os_owner() then raise exception 'Owner role required'; end if;
  clean_email := lower(trim(target_email));
  if clean_email = '' or clean_email is null then raise exception 'Email is required'; end if;
  if target_role not in ('owner', 'developer', 'user') then raise exception 'Role must be owner, developer, or user'; end if;
  select u.id into target_id from auth.users u where lower(u.email) = clean_email limit 1;
  if target_id is null then raise exception 'No ZuzuOS account found for that email'; end if;
  if target_role = 'user' then
    delete from public.os_roles where user_id = target_id;
    return 'Role removed; account is now a regular user.';
  end if;
  insert into public.os_roles(user_id, role, created_by) values (target_id, target_role, (select auth.uid()))
  on conflict (user_id) do update set role = excluded.role, created_by = excluded.created_by;
  return 'Role saved.';
end;
$$;
revoke all on function public.owner_set_os_role(text, text) from public, anon;
grant execute on function public.owner_set_os_role(text, text) to authenticated;
