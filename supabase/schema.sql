-- Run once in the Supabase SQL editor. No anonymous client has table or storage access.
create table if not exists public.profiles (
  id text primary key check (id = 'main'),
  data jsonb not null
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant all on public.profiles to service_role;

create table if not exists public.card_events (
  day date not null default current_date,
  event text not null check(event in ('card_view','save_contact','linkedin_click','resume_view','terminal_click','share_click')),
  total bigint not null default 0,
  primary key(day,event)
);
alter table public.card_events enable row level security;
revoke all on public.card_events from anon, authenticated;
grant all on public.card_events to service_role;

create or replace function public.increment_card_event(event_name text)
returns void language sql security invoker set search_path = '' as $$
  insert into public.card_events(day,event,total) values(current_date,event_name,1)
  on conflict(day,event) do update set total = public.card_events.total + 1;
$$;
revoke all on function public.increment_card_event(text) from public, anon, authenticated;
grant execute on function public.increment_card_event(text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('card-assets','card-assets',false,5242880,array['image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/webp','application/pdf'];
-- The server service role accesses this private bucket. Do not add public policies.
