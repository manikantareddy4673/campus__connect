create extension if not exists pgcrypto;

create table if not exists public.users (
  uuid uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'student'
    check (role in ('student', 'organizer', 'admin'))
);

create table if not exists public.events (
  event_id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(uuid) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  capacity integer not null check (capacity >= 0),
  created_at text not null default now()::text
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(uuid) on delete cascade,
  event_id uuid not null references public.events(event_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, event_id)
);

alter table public.users
  alter column role set default 'student';
alter table public.events
  alter column event_id set default gen_random_uuid(),
  alter column created_at set default now()::text;
alter table public.registrations
  alter column id set default gen_random_uuid(),
  alter column created_at set default now();

insert into public.users (uuid, email)
select id, email
from auth.users
where email is not null
on conflict (uuid) do update set email = excluded.email;

create index if not exists events_created_at_idx
  on public.events (created_at desc);
create index if not exists events_student_idx
  on public.events (student_id);
create index if not exists registrations_event_idx
  on public.registrations (event_id, created_at desc);
create index if not exists registrations_student_idx
  on public.registrations (student_id, created_at desc);

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;

revoke all on table public.users from anon, authenticated;
grant select on table public.users to authenticated;
revoke all on table public.events from anon, authenticated;
grant select on table public.events to anon, authenticated;
grant insert, update on table public.events to authenticated;
revoke all on table public.registrations from anon, authenticated;
grant select, insert on table public.registrations to authenticated;

drop policy if exists "Users can view their own profile and event attendees"
  on public.users;
create policy "Users can view their own profile and event attendees"
  on public.users for select to authenticated
  using (
    auth.uid() = uuid
    or exists (
      select 1
      from public.events e
      join public.registrations r on r.event_id = e.event_id
      where e.student_id = auth.uid()
        and r.student_id = users.uuid
    )
  );

drop policy if exists "Events are visible to everyone" on public.events;
create policy "Events are visible to everyone"
  on public.events for select
  using (true);

drop policy if exists "Organizers can create their own events" on public.events;
create policy "Organizers can create their own events"
  on public.events for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.uuid = auth.uid() and u.role in ('organizer', 'admin')
    )
  );

drop policy if exists "Organizers can update their own events" on public.events;
create policy "Organizers can update their own events"
  on public.events for update to authenticated
  using (
    student_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.uuid = auth.uid() and u.role in ('organizer', 'admin')
    )
  )
  with check (student_id = auth.uid());

drop policy if exists "Users can view their own or hosted registrations"
  on public.registrations;
create policy "Users can view their own or hosted registrations"
  on public.registrations for select to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.events e
      where e.event_id = registrations.event_id
        and e.student_id = auth.uid()
    )
  );

drop policy if exists "Users can register themselves" on public.registrations;
create policy "Users can register themselves"
  on public.registrations for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.event_id = registrations.event_id
    )
  );

create or replace function public.sync_eventhub_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is not null then
    insert into public.users (uuid, email)
    values (new.id, new.email)
    on conflict (uuid) do update set email = excluded.email;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_eventhub_user() from public, anon, authenticated;
drop trigger if exists sync_eventhub_user on auth.users;
create trigger sync_eventhub_user
  after insert or update of email on auth.users
  for each row execute function public.sync_eventhub_user();

create or replace function public.enforce_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_capacity integer;
  registration_count bigint;
begin
  select capacity into event_capacity
  from public.events
  where event_id = new.event_id
  for update;

  if not found then
    raise exception 'Event not found' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.registrations
    where event_id = new.event_id and student_id = new.student_id
  ) then
    raise exception 'You are already registered for this event'
      using errcode = '23505';
  end if;

  select count(*) into registration_count
  from public.registrations
  where event_id = new.event_id;

  if registration_count >= event_capacity then
    raise exception 'This event is full' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_event_capacity() from public, anon, authenticated;
drop trigger if exists enforce_event_capacity on public.registrations;
create trigger enforce_event_capacity
  before insert on public.registrations
  for each row execute function public.enforce_event_capacity();

create or replace function public.get_event_registration_counts(event_ids uuid[])
returns table (event_id uuid, registered_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.event_id, count(*)::bigint
  from public.registrations r
  where r.event_id = any(event_ids)
  group by r.event_id;
$$;

revoke all on function public.get_event_registration_counts(uuid[])
  from public, anon, authenticated;
grant execute on function public.get_event_registration_counts(uuid[])
  to anon, authenticated;

grant usage on schema public to anon, authenticated;
