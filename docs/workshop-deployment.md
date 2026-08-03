# Workshop Deployment

The workshop uses one Supabase project as the shared backend for the desktop app, GitHub Pages, and Vercel. The PVC editor does not require Supabase and remains available when the service is offline.

## 1. Create and Link Supabase

```powershell
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
npx supabase functions deploy publish-track
npx supabase functions deploy download-track
npx supabase functions deploy moderate-content
npx supabase functions deploy cleanup-deleted-tracks --no-verify-jwt
npx supabase secrets set WORKSHOP_CLEANUP_SECRET=<long-random-value>
```

The migration creates the Postgres schema, RLS policies, public preview bucket, private track bucket, counters, notifications, and server-only RPCs.

## 2. Configure GitHub OAuth

Create a GitHub OAuth App. Its callback URL must be:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Enable GitHub in Supabase Auth and store the GitHub client ID and secret there. Add these Supabase redirect URLs:

```text
http://127.0.0.1:5173/**
https://zhangstudylife.github.io/asc-track-designer/**
https://asc-track-designer.vercel.app/**
http://127.0.0.1:43820/auth/callback
...
http://127.0.0.1:43829/auth/callback
```

The ten loopback URLs are required by the portable EXE. GitHub receives only basic identity scopes; no repository or notification permissions are requested.

## 3. Configure Frontends

Set these values in GitHub repository Actions secrets and in the Vercel project environment:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

For local development, place the same values in `.env.local`. Never expose the service-role key or GitHub client secret in a `VITE_` variable.

## 4. Schedule Cleanup

Create a daily Supabase scheduled function call to `cleanup-deleted-tracks` with header:

```text
x-cleanup-secret: <WORKSHOP_CLEANUP_SECRET>
```

The function permanently removes tracks that have remained soft-deleted for 30 days, including all JSON revisions and preview files.
