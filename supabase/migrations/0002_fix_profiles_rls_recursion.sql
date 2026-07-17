-- Fixes: "infinite recursion detected in policy for relation profiles"
--
-- The original "profiles_select_admin_all" policy checked admin status by
-- querying profiles from within a policy ON profiles, which re-triggers
-- that same policy check forever. The fix is a SECURITY DEFINER function:
-- it runs as the table owner, which bypasses RLS for its internal query,
-- breaking the recursion.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles_select_admin_all" on profiles;

create policy "profiles_select_admin_all" on profiles for select
  using (is_admin());
