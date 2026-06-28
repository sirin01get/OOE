-- Track authentication events by calling/initiating app.
create table if not exists auth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  initiator_app_id text,
  provider text,
  email text,
  event_type text not null default 'signed_in',
  created_at timestamptz default now()
);

create index if not exists auth_events_user_id_idx on auth_events(user_id);
create index if not exists auth_events_initiator_app_id_idx on auth_events(initiator_app_id);
create index if not exists auth_events_created_at_idx on auth_events(created_at desc);

alter table auth_events enable row level security;

create policy "auth_events_owner_select" on auth_events
  for select using (auth.uid() = user_id);

create policy "auth_events_owner_insert" on auth_events
  for insert with check (auth.uid() = user_id);
