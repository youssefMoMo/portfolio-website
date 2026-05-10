-- =====================================================================
-- supabase-admin-auth.sql
-- =====================================================================
-- Run this once in your Supabase SQL editor (Dashboard → SQL Editor).
-- It is idempotent: safe to re-run after edits.
--
-- WHAT THIS DOES
--   1. Drops the old Discord-OAuth admin_users table (if it exists)
--      and creates a fresh one keyed to auth.users.id (email auth).
--   2. Creates a public.is_admin() helper used by all RLS policies.
--   3. Enables RLS and writes policies for: admin_users, site_content,
--      reviews, games (skip any block whose table doesn't exist in
--      your project — Postgres will raise a clear error).
--   4. Provides the snippet to insert YOU as the first admin.
--
-- BEFORE YOU RUN
--   • Decide which email + password you want to use as the FIRST admin.
--   • In the Supabase Dashboard → Authentication → Users → "Add user",
--     create a user with that email + password and click "Auto Confirm
--     Email" so they don't need to verify.
--   • You'll then run the INSERT at the bottom of this file using THAT
--     email — it looks up the user's UUID from auth.users automatically.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. admin_users table (fresh schema for email auth)
-- ---------------------------------------------------------------------

drop table if exists public.admin_users cascade;

create table public.admin_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  is_active   boolean not null default true,
  last_login  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.admin_users is
  'Users with admin-panel access. Row exists ⇒ user can access /admin if is_active.';


-- ---------------------------------------------------------------------
-- 2. updated_at trigger
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_admin_users_updated on public.admin_users;
create trigger trg_admin_users_updated
  before update on public.admin_users
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 3. is_admin() — the single source of truth for admin authorisation
-- ---------------------------------------------------------------------
-- SECURITY DEFINER so RLS on admin_users itself doesn't block the check.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = auth.uid()
      and is_active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;


-- ---------------------------------------------------------------------
-- 4. RLS on admin_users
-- ---------------------------------------------------------------------

alter table public.admin_users enable row level security;

-- Drop any existing policies (idempotent re-runs)
drop policy if exists "admin_users_select_own"      on public.admin_users;
drop policy if exists "admin_users_select_admins"   on public.admin_users;
drop policy if exists "admin_users_insert_admins"   on public.admin_users;
drop policy if exists "admin_users_update_admins"   on public.admin_users;
drop policy if exists "admin_users_delete_admins"   on public.admin_users;

-- A logged-in user can read THEIR OWN row (needed for the post-login
-- admin check from the client).
create policy "admin_users_select_own"
  on public.admin_users for select
  to authenticated
  using (id = auth.uid());

-- An admin can list every admin (needed for the Users tab in the panel).
create policy "admin_users_select_admins"
  on public.admin_users for select
  to authenticated
  using (public.is_admin());

-- Only admins can add/modify/remove other admins.
create policy "admin_users_insert_admins"
  on public.admin_users for insert
  to authenticated
  with check (public.is_admin());

create policy "admin_users_update_admins"
  on public.admin_users for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_users_delete_admins"
  on public.admin_users for delete
  to authenticated
  using (public.is_admin());


-- ---------------------------------------------------------------------
-- 5. RLS on site_content (public read, admin write)
--    Wrap in DO block so the script doesn't fail if the table is absent.
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='site_content') then

    execute 'alter table public.site_content enable row level security';

    execute 'drop policy if exists "site_content_read_public"  on public.site_content';
    execute 'drop policy if exists "site_content_write_admin"  on public.site_content';
    execute 'drop policy if exists "site_content_update_admin" on public.site_content';
    execute 'drop policy if exists "site_content_delete_admin" on public.site_content';

    execute $p$create policy "site_content_read_public"
                on public.site_content for select
                using (true)$p$;

    execute $p$create policy "site_content_write_admin"
                on public.site_content for insert
                to authenticated
                with check (public.is_admin())$p$;

    execute $p$create policy "site_content_update_admin"
                on public.site_content for update
                to authenticated
                using (public.is_admin())
                with check (public.is_admin())$p$;

    execute $p$create policy "site_content_delete_admin"
                on public.site_content for delete
                to authenticated
                using (public.is_admin())$p$;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 6. RLS on reviews (anyone can submit, public reads APPROVED only,
--    admin reads/edits everything)
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='reviews') then

    execute 'alter table public.reviews enable row level security';

    execute 'drop policy if exists "reviews_read_approved"  on public.reviews';
    execute 'drop policy if exists "reviews_read_admin"     on public.reviews';
    execute 'drop policy if exists "reviews_insert_anyone"  on public.reviews';
    execute 'drop policy if exists "reviews_update_admin"   on public.reviews';
    execute 'drop policy if exists "reviews_delete_admin"   on public.reviews';

    -- Public sees only approved (and not rejected) reviews
    execute $p$create policy "reviews_read_approved"
                on public.reviews for select
                using (approved = true and (rejected is null or rejected = false))$p$;

    -- Admins can see every review
    execute $p$create policy "reviews_read_admin"
                on public.reviews for select
                to authenticated
                using (public.is_admin())$p$;

    -- Anyone (anon or authenticated) can submit a review
    execute $p$create policy "reviews_insert_anyone"
                on public.reviews for insert
                with check (true)$p$;

    -- Only admins can approve/reject/edit reviews
    execute $p$create policy "reviews_update_admin"
                on public.reviews for update
                to authenticated
                using (public.is_admin())
                with check (public.is_admin())$p$;

    execute $p$create policy "reviews_delete_admin"
                on public.reviews for delete
                to authenticated
                using (public.is_admin())$p$;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 7. RLS on games (public read, admin write)
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='games') then

    execute 'alter table public.games enable row level security';

    execute 'drop policy if exists "games_read_public"   on public.games';
    execute 'drop policy if exists "games_insert_admin"  on public.games';
    execute 'drop policy if exists "games_update_admin"  on public.games';
    execute 'drop policy if exists "games_delete_admin"  on public.games';

    execute $p$create policy "games_read_public"
                on public.games for select
                using (true)$p$;

    execute $p$create policy "games_insert_admin"
                on public.games for insert
                to authenticated
                with check (public.is_admin())$p$;

    execute $p$create policy "games_update_admin"
                on public.games for update
                to authenticated
                using (public.is_admin())
                with check (public.is_admin())$p$;

    execute $p$create policy "games_delete_admin"
                on public.games for delete
                to authenticated
                using (public.is_admin())$p$;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 8. Add the FIRST admin
-- ---------------------------------------------------------------------
-- STEP 1 — Create the auth user from the Supabase Dashboard:
--   Authentication → Users → "Add user" → enter email + password →
--   tick "Auto Confirm Email".
--
-- STEP 2 — Replace 'YOUR_EMAIL@example.com' below with that email and
--   run this single statement:
--
--   insert into public.admin_users (id, email, full_name, is_active)
--   select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', ''), true
--   from   auth.users u
--   where  u.email = 'YOUR_EMAIL@example.com'
--   on conflict (id) do update set is_active = excluded.is_active;
--
-- After that you can sign in at /admin with the email + password you set.
-- ---------------------------------------------------------------------
