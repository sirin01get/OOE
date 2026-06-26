-- OOE schema
create extension if not exists "pgcrypto";

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  status text not null default 'new', -- new | researching | researched | prioritized | decided
  created_at timestamptz default now()
);

create table if not exists research_runs (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id) on delete cascade not null,
  model text not null,
  raw_response jsonb,
  created_at timestamptz default now()
);

create table if not exists elements (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid references research_runs(id) on delete cascade not null,
  content text not null,
  source_url text,
  proposed_rank int not null,
  created_at timestamptz default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id) on delete cascade not null,
  element_id uuid references elements(id) on delete set null,
  user_rank int not null,
  included boolean not null default true,
  note text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table topics enable row level security;
alter table research_runs enable row level security;
alter table elements enable row level security;
alter table decisions enable row level security;

create policy "topics_owner" on topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "research_runs_owner" on research_runs
  for all using (
    exists (select 1 from topics t where t.id = research_runs.topic_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from topics t where t.id = research_runs.topic_id and t.user_id = auth.uid())
  );

create policy "elements_owner" on elements
  for all using (
    exists (
      select 1 from research_runs r join topics t on t.id = r.topic_id
      where r.id = elements.research_run_id and t.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from research_runs r join topics t on t.id = r.topic_id
      where r.id = elements.research_run_id and t.user_id = auth.uid()
    )
  );

create policy "decisions_owner" on decisions
  for all using (
    exists (select 1 from topics t where t.id = decisions.topic_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from topics t where t.id = decisions.topic_id and t.user_id = auth.uid())
  );
