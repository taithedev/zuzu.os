-- Direct messages and WebRTC call signaling for ZuzuOS.
-- The browser client only receives rows involving the signed-in user.
create table if not exists public.os_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  constraint os_messages_no_self_dm check (sender_id <> recipient_id)
);
create index if not exists os_messages_pair_created_idx on public.os_messages (sender_id, recipient_id, created_at desc);
alter table public.os_messages enable row level security;
drop policy if exists "participants read direct messages" on public.os_messages;
create policy "participants read direct messages" on public.os_messages for select to authenticated using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
drop policy if exists "sender creates own direct messages" on public.os_messages;
create policy "sender creates own direct messages" on public.os_messages for insert to authenticated with check ((select auth.uid()) = sender_id and sender_id <> recipient_id);
grant select, insert on public.os_messages to authenticated;

create table if not exists public.os_call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null,
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offer','answer','ice','hangup','reject')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint os_call_signals_participants_differ check (caller_id <> callee_id),
  constraint os_call_signals_sender_is_participant check (sender_id = caller_id or sender_id = callee_id)
);
create index if not exists os_call_signals_pair_created_idx on public.os_call_signals (callee_id, created_at desc);
alter table public.os_call_signals enable row level security;
drop policy if exists "call participants read signals" on public.os_call_signals;
create policy "call participants read signals" on public.os_call_signals for select to authenticated using ((select auth.uid()) = caller_id or (select auth.uid()) = callee_id);
drop policy if exists "participants create call signals" on public.os_call_signals;
create policy "participants create call signals" on public.os_call_signals for insert to authenticated with check ((select auth.uid()) = sender_id and ((select auth.uid()) = caller_id or (select auth.uid()) = callee_id));
drop policy if exists "participants clear call signals" on public.os_call_signals;
create policy "participants clear call signals" on public.os_call_signals for delete to authenticated using ((select auth.uid()) = caller_id or (select auth.uid()) = callee_id);
grant select, insert, delete on public.os_call_signals to authenticated;

drop policy if exists "signed in users can discover profiles" on public.profiles;
create policy "signed in users can discover profiles" on public.profiles for select to authenticated using (true);
grant select on public.profiles to authenticated;

do $$ begin alter publication supabase_realtime add table public.os_messages; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.os_call_signals; exception when duplicate_object then null; when undefined_object then null; end $$;
