-- Fix: ID submission was impossible for every non-admin user.
--
-- submit_id_verification (SECURITY DEFINER) flips profiles.verification_status
-- to 'pending', but the protect_profile_privileged_columns guard trigger only
-- exempted admins — auth.uid() inside a definer function is still the calling
-- user, so the trigger raised "Only admins may change role or
-- verification_status" on every submission.
--
-- Sanctioned RPCs now set a transaction-local flag that the guard honors.
-- Direct client updates (PostgREST table writes) can't set it inside the same
-- transaction as their update, so role/status stay locked down.

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.verification_status is distinct from old.verification_status)
     and current_setting('app.allow_privileged_profile_update', true) is distinct from 'true'
     and not public.is_admin(auth.uid()) then
    raise exception 'Only admins may change role or verification_status';
  end if;
  return new;
end;
$$;

create or replace function public.submit_id_verification(
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

  perform set_config('app.allow_privileged_profile_update', 'true', true);
  update public.profiles set verification_status = 'pending' where id = auth.uid();
  perform set_config('app.allow_privileged_profile_update', 'false', true);

  return v_row;
end;
$$;
