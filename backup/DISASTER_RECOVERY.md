# 🛟 Disaster Recovery Guide — Inflation War

## What's backed up and where

| Component | Location | How to restore |
|-----------|----------|----------------|
| **Frontend code** | GitHub (`main` + `staging` branches) | `git clone` → `npm install` → deploy to Vercel |
| **Database schema** | `backup/schema_backup.txt` | Re-create tables from schema |
| **RPC functions** | `backup/functions_backup.txt` | Run SQL in Supabase SQL Editor |
| **RLS policies** | `backup/rls_policies_backup.txt` | Re-apply policies |
| **Items data** | `backup/items_data_backup.txt` | Run INSERT statements |
| **Edge Function** | `backup/edge_function_challonge_proxy.txt` | Re-deploy via Supabase dashboard |
| **Images** | `public/` folder in git | Automatically deployed with Vercel |

## ⚠️ What can NOT be fully backed up

- **User accounts** (auth.users) — Supabase manages these. Users would need to re-register.
- **Rosters & roster members** — These are created by users. They would need to recreate their teams.
- **Match logs** — Historical match data. Export periodically if important.
- **Active lobbies** — Temporary by nature, not critical.

## 🔑 Secrets you need to save separately (NOT in git!)

Save these somewhere secure (password manager, encrypted note):

1. **Supabase Project URL**: `https://tnkwhxxxyixoohtmdinx.supabase.co`
2. **Supabase Anon Key**: (from .env file)
3. **Supabase Service Role Key**: (from Supabase dashboard → Settings → API)
4. **Challonge API Key**: (stored in Supabase Edge Function Secrets)
5. **Vercel project settings**: Note your domain, environment variables

## 🔄 Recovery Steps (if everything is destroyed)

### Step 1: Restore code
```bash
git clone https://github.com/xfr3dxd-beep/inflation-war.git
cd inflation-war
npm install
```

### Step 2: Create new Supabase project
- Go to supabase.com → New Project
- Note the new URL and anon key

### Step 3: Restore database schema
- Open Supabase SQL Editor
- Run the SQL from `backup/schema_backup.txt` (table definitions)
- Run the SQL from `backup/functions_backup.txt` (all RPC functions)
- Run the SQL from `backup/rls_policies_backup.txt` (security policies)

### Step 4: Restore items data
- Run the INSERT statements from `backup/items_data_backup.txt`

### Step 5: Re-deploy Edge Function
- Use the code from `backup/edge_function_challonge_proxy.txt`
- Set the `CHALLONGE_API_KEY` secret in Supabase dashboard

### Step 6: Update environment
- Update `.env` with new Supabase URL and anon key
- Update Vercel environment variables

### Step 7: Deploy
```bash
git push origin main
```
Vercel will auto-deploy.

## 📅 Backup Schedule

Run this periodically (before tournaments, after major changes):
1. Export items: `SELECT * FROM items` → save to backup/
2. Export rosters: `SELECT * FROM rosters` + `SELECT * FROM roster_members` → save
3. Export match logs: `SELECT * FROM match_logs` → save
4. Git commit the backup folder

## 💡 Pro tip: Supabase paid plans include automatic daily backups
If you upgrade to the Pro plan ($25/month), Supabase automatically backs up your entire database daily with point-in-time recovery up to 7 days.
