-- The privileged-columns guard was stricter than intended: its comment says
-- admins may change role/verification_status "via the service role", but
-- service-role and dashboard SQL contexts have auth.uid() = null, which the
-- trigger treated as non-admin — making it impossible to ever promote the
-- first admin. Allow contexts with no JWT (dashboard, service_role); direct
-- client requests always carry a JWT, and anon can't pass profiles' RLS
-- update policy anyway.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.verification_status is distinct from old.verification_status)
     and auth.uid() is not null
     and current_setting('app.allow_privileged_profile_update', true) is distinct from 'true'
     and not public.is_admin(auth.uid()) then
    raise exception 'Only admins may change role or verification_status';
  end if;
  return new;
end;
$$;
