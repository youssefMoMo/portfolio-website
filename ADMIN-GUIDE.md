# Admin Panel — Access Guide

## Admin URL

**`https://your-site.vercel.app/admin`**

That URL renders `src/pages/AdminLogin.tsx`. The login screen automatically chooses one of three login modes depending on what environment variables you have configured.

---

## Three login modes

The code in `src/lib/auth.ts` and `src/pages/AdminLogin.tsx` decides the mode at runtime based on env vars. Here is exactly what determines the mode and what credentials to use.

### Mode 1 — Supabase + Discord OAuth (production mode)

**Triggered when:** both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set as environment variables (Vercel → Project Settings → Environment Variables).

**Login UI:** a single "Login with Discord" button.

**How to get access:**

1. Click the Discord button — it redirects to Discord OAuth.
2. After Discord approves, you land at `/admin/callback`.
3. The callback queries the `admin_users` table in Supabase and looks up your Discord user ID.
4. **You must be in the `admin_users` table with `is_active = true`** for access to be granted.

**To add yourself as an admin in Supabase:**

```sql
INSERT INTO admin_users (discord_id, discord_username, is_active)
VALUES ('YOUR_DISCORD_USER_ID', 'YourName', true);
```

Find your Discord user ID by enabling Developer Mode in Discord settings → right-click your name → "Copy User ID".

If your account isn't in that table, OAuth will succeed but the dashboard will reject you with "Not authorised as admin".

### Mode 2 — Custom dev credentials

**Triggered when:** Supabase env vars are NOT set, but `VITE_DEV_ADMIN_ID` and `VITE_DEV_ADMIN_PASSWORD` are.

**Login UI:** ID + password form, labeled "Discord ID".

**Credentials:** whatever you put in the env vars.

```
.env.local (or Vercel env vars):
VITE_DEV_ADMIN_ID=123456789012345678
VITE_DEV_ADMIN_PASSWORD=YourStrongPassword
```

### Mode 3 — Hard fallback (no env config at all)

**Triggered when:** no Supabase config AND no `VITE_DEV_ADMIN_*` env vars.

**Login UI:** ID + password form, labeled "Username".

**Credentials (hardcoded fallback):**
```
Username: admin
Password: admin123
```

⚠️ This mode is intended for local development only. **Do not deploy to production with this mode active** — set Supabase env vars or at minimum `VITE_DEV_ADMIN_ID` and `VITE_DEV_ADMIN_PASSWORD`.

---

## Which mode is your deployment in?

Check Vercel → your project → Settings → Environment Variables.

| Has `VITE_SUPABASE_*` | Has `VITE_DEV_ADMIN_*` | Mode | Login |
|---|---|---|---|
| ✅ | (any) | Mode 1 | Discord OAuth |
| ❌ | ✅ | Mode 2 | Custom ID + password |
| ❌ | ❌ | Mode 3 | `admin` / `admin123` |

---

## What happens after login

You land at `/admin/dashboard` (path `src/pages/AdminDashboard.tsx`). It has tabs for:

- **Home** — edit hero badge, titles, subtitle, stats, CTA text
- **Portfolio** — manage the 22 portfolio items (image, title, category, ordering, publish toggle)
- **Pricing** — manage pricing plans (name, prices, frames, features, ordering)
- **Reviews** — view, approve, delete submitted reviews
- **Policies** — manage the policies grid (icon, title, description)
- **Games** — manage Roblox games (placeId, name, link)
- **Users** — manage `admin_users` (Mode 1 only)
- **Logs** — error logs from the live site
- **Analytics** — basic visit metrics

---

## Admin → Frontend connection (how content syncs)

When you save in the admin:

1. `saveContent()` writes to **Supabase `site_content` table** (if configured)
2. `saveContent()` also writes to **localStorage** as a backup
3. `saveContent()` dispatches a `contentUpdated` window event (used by other admin tabs)

When a frontend page loads:

1. `getContent("home" | "portfolio" | "pricing" | "policies")` runs in `useEffect`
2. It reads from **Supabase first** (always latest); falls back to **localStorage**, then to baked-in defaults from `src/lib/data.ts`

**This means:**
- A user visiting your live site sees your latest admin saves on **page load / refresh**
- A user already on the page when you save won't see updates until they refresh
- Admin users **DO** see live updates between admin tabs (they subscribe to the `contentUpdated` event)

If you want true live updates for visitors too (rare for a portfolio site), each frontend page would need to subscribe to Supabase Realtime on the `site_content` table. The code already exists (`subscribeToContentUpdates`) — it just isn't wired to public pages because most portfolio sites don't need it.

---

## Verification checklist (do each at least once)

After deploying with this fix-pack:

- [ ] Visit `/admin` — see the login screen (no 404)
- [ ] Log in with one of the three modes above
- [ ] Land at `/admin/dashboard` — see the tab bar
- [ ] Edit Home → "hero badge" → save → refresh `/` → text updated
- [ ] Edit Pricing → change price on plan #1 → save → refresh `/pricing` → price updated
- [ ] Edit Portfolio → reorder/add/remove items → refresh `/portfolio` → items updated
- [ ] Edit Policies → change a policy title → refresh `/policies` → updated

If any of those don't reflect on the frontend, check the browser console — it will log Supabase errors if the tables aren't set up. The SQL files in the repo (`supabase-setup.sql`, `reviews-table.sql`) create everything needed.

---

## If you're locked out

1. **Mode 1:** Add yourself to `admin_users` with the SQL above.
2. **Mode 2:** Update `VITE_DEV_ADMIN_*` env vars in Vercel and redeploy.
3. **Mode 3:** Use `admin` / `admin123` (this is in `src/pages/AdminLogin.tsx` constants `DEV_FALLBACK_ID` / `DEV_FALLBACK_PWD`).

To force Mode 3 temporarily for a lockout: remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Vercel env vars, redeploy, log in as `admin`/`admin123`. Re-add the env vars after.
