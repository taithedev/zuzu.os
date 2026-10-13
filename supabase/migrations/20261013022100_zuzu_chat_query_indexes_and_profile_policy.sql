-- Remove duplicate profile SELECT policy and add lookup indexes for chat/call queries.
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "signed in users can discover profiles" on public.profiles;
create policy "signed in users can discover profiles" on public.profiles for select to authenticated using (true);
create index if not exists os_messages_recipient_created_idx on public.os_messages (recipient_id, created_at desc);
create index if not exists os_call_signals_caller_created_idx on public.os_call_signals (caller_id, created_at desc);
create index if not exists os_call_signals_sender_created_idx on public.os_call_signals (sender_id, created_at desc);
