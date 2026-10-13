create table if not exists public.os_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'developer')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.os_roles enable row level security;
revoke all on public.os_roles from anon, authenticated;
grant select on public.os_roles to authenticated;
drop policy if exists "Users can read their own ZuzuOS role" on public.os_roles;
create policy "Users can read their own ZuzuOS role" on public.os_roles for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.os_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 3 and 4000),
  category text not null default 'improvement' check (category in ('feature', 'bug', 'improvement', 'design')),
  status text not null default 'proposed' check (status in ('proposed', 'planned', 'in_progress', 'shipped', 'declined')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.os_updates enable row level security;
revoke all on public.os_updates from anon, authenticated;
grant select, insert, update, delete on public.os_updates to authenticated;
drop policy if exists "Signed-in users can view ZuzuOS updates" on public.os_updates;
create policy "Signed-in users can view ZuzuOS updates" on public.os_updates for select to authenticated using (true);
drop policy if exists "Developers and owners can submit ZuzuOS updates" on public.os_updates;
create policy "Developers and owners can submit ZuzuOS updates" on public.os_updates for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.os_roles r where r.user_id = (select auth.uid()) and r.role in ('owner','developer')));
drop policy if exists "Only owners can update ZuzuOS updates" on public.os_updates;
create policy "Only owners can update ZuzuOS updates" on public.os_updates for update to authenticated using (exists (select 1 from public.os_roles r where r.user_id = (select auth.uid()) and r.role = 'owner')) with check (exists (select 1 from public.os_roles r where r.user_id = (select auth.uid()) and r.role = 'owner'));
drop policy if exists "Only owners can delete ZuzuOS updates" on public.os_updates;
create policy "Only owners can delete ZuzuOS updates" on public.os_updates for delete to authenticated using (exists (select 1 from public.os_roles r where r.user_id = (select auth.uid()) and r.role = 'owner'));
create or replace function public.set_os_updates_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists set_os_updates_updated_at on public.os_updates;
create trigger set_os_updates_updated_at before update on public.os_updates for each row execute function public.set_os_updates_updated_at();
