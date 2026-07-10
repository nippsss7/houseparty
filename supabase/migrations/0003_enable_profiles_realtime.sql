-- Realtime events for profiles were never enabled — Supabase's
-- supabase_realtime publication starts empty, so the app's postgres_changes
-- subscription on the signed-in user's profile row received nothing. The
-- pending-review screen's live verification-status flip depends on it.
alter publication supabase_realtime add table public.profiles;
