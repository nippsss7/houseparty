-- HouseParty M1: profiles, identity verification, admin review, storage buckets.
-- Later milestones add events/booking_requests/reviews in their own migrations.

create extension if not exists postgis;
create extension if not exists pgcrypto;
create extension if not exists moddatetime schema extensions;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  username text unique,
  avatar_url text,
  bio text,
  date_of_birth date,
  phone text,
  role text not null default 'user' check (role in ('user', 'admin')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  host_rating_avg numeric(3, 2) not null default 0,
  host_rating_count int not null default 0,
  guest_rating_avg numeric(3, 2) not null default 0,
  guest_rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function extensions.moddatetime('updated_at');

-- Auto-create a profile row whenever someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent clients from self-promoting role/verification_status; only admins
-- (via the service role or an is_admin() caller) may change these columns.
create function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.verification_status is distinct from old.verification_status)
     and not public.is_admin(auth.uid()) then
    raise exception 'Only admins may change role or verification_status';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- id_verifications
-- ---------------------------------------------------------------------------
create table public.id_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_type text not null check (document_type in ('passport', 'drivers_license', 'national_id')),
  front_image_path text not null,
  back_image_path text,
  selfie_image_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now()
);

create index id_verifications_user_id_idx on public.id_verifications (user_id);
create index id_verifications_status_idx on public.id_verifications (status);

-- ---------------------------------------------------------------------------
-- RLS helper functions (security definer so policies can call them without
-- re-triggering RLS recursively on profiles)
-- ---------------------------------------------------------------------------
create function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;

create function public.is_verified(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and verification_status = 'verified');
$$;

-- Now that is_admin() exists, attach the privileged-column guard trigger.
create trigger protect_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- ---------------------------------------------------------------------------
-- Atomic RPCs (avoid partial-state client writes across two tables)
-- ---------------------------------------------------------------------------

-- Called by a user submitting their ID: inserts the verification record and
-- flips profiles.verification_status to 'pending' in one transaction.
create function public.submit_id_verification(
  p_document_type text,
  p_front_image_path text,
  p_back_image_path text default null,
  p_selfie_image_path text default null
)
returns public.id_verifications
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.id_verifications;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.id_verifications (
    user_id, document_type, front_image_path, back_image_path, selfie_image_path
  ) values (
    auth.uid(), p_document_type, p_front_image_path, p_back_image_path, p_selfie_image_path
  )
  returning * into v_row;

  update public.profiles set verification_status = 'pending' where id = auth.uid();

  return v_row;
end;
$$;

-- Called by an admin: reviews a verification and flips the user's profile
-- status in one transaction, stamping who reviewed it and when.
create function public.review_id_verification(
  p_verification_id uuid,
  p_approve boolean,
  p_rejection_reason text default null
)
returns public.id_verifications
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.id_verifications;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins may review verifications';
  end if;

  update public.id_verifications
  set status = case when p_approve then 'approved' else 'rejected' end,
      rejection_reason = case when p_approve then null else p_rejection_reason end,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_verification_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Verification record not found';
  end if;

  update public.profiles
  set verification_status = case when p_approve then 'verified' else 'rejected' end
  where id = v_row.user_id;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.id_verifications enable row level security;

create policy "profiles are viewable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users can view their own verification submissions"
  on public.id_verifications for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- Direct inserts are blocked in favor of submit_id_verification(); this policy
-- exists only so the security-definer RPC's internal insert satisfies RLS.
create policy "users can submit their own verification"
  on public.id_verifications for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "admins can update verification records"
  on public.id_verifications for update
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- id-documents: strictly private. Path convention: {user_id}/{uuid}.jpg
create policy "users can upload their own id documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'id-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users and admins can view id documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'id-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(auth.uid()))
  );

-- avatars: public read, owner write. Path convention: {user_id}/{uuid}.jpg
create policy "anyone can view avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
