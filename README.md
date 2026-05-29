# LinkedIn Analysis

Small internal tool to track LinkedIn profiles and fetch their posts via Apify for later analysis.

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind v4
- Local Supabase (Postgres) via Supabase CLI + Docker
- Apify actor: `harvestapi/linkedin-profile-posts`

## First-time setup

1. **Start Docker Desktop** (required for local Supabase).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local Supabase stack (Postgres, Studio, Auth, Storage in Docker):
   ```bash
   npm run db:start
   ```
   First run takes a few minutes pulling images.
4. Apply migrations:
   ```bash
   npm run db:reset
   ```
5. Start the dev server:
   ```bash
   npm run dev
   ```

App runs on http://localhost:3000.
Studio (DB UI) runs on http://127.0.0.1:54333.

## How it works

- `/` — add a LinkedIn profile (URL or handle) and see all saved profiles.
- `/profiles/[id]` — view a profile and its posts. Click **Sync posts** to call Apify and upsert the latest 100 posts.

## Environment

`.env.local` is pre-populated with:

- Default local Supabase URL + anon key (same defaults for every local Supabase instance).
- `APIFY_TOKEN` from the Obsidian Vault (token 2).
- `APIFY_ACTOR_ID=harvestapi~linkedin-profile-posts` and `APIFY_MAX_POSTS=100`.

## Ports

Local Supabase is on a non-default port range so it doesn't collide with the CardVault project running on 54321-54324:

| Service | Port  |
| ------- | ----- |
| API     | 54331 |
| DB      | 54332 |
| Studio  | 54333 |
| Inbucket| 54334 |
