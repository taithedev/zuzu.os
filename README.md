# zuzu.os

A Windows-inspired personal web desktop with Supabase authentication, profile settings, local-first notes, and private account sync. Built as a static site so it can be deployed to GitHub Pages now and Vercel later.

## Current features

- ZuzuOS-branded account system backed by Supabase Auth: email/password sign-up, sign-in, sign-out, password reset, and password changes. No Microsoft sign-in is used.
- Profile creation on registration, editable display name and username.
- User-scoped database storage protected by row-level security (RLS).
- Private file upload, listing, download, and deletion in the user's own storage folder (10 MB limit per file).
- Account data export and a confirmed account deletion flow backed by a server-side Edge Function.
- Quick note saved locally and synchronized to the signed-in user's account.
- Settings window, theme accent selector, file/profile export, and external-link launcher.
- Cine Hub discovery links, local audio playback, sketch canvas with PNG export, safe simulated terminal, local CIRI helper, and App Store catalog.
- Responsive desktop shell, taskbar, account menu, and cookie/preferences notice.

## Supabase project

The frontend uses the public publishable key only. It never uses a service-role key.

- Project URL: https://wfqudstuncdldsvxqveu.supabase.co
- Schema: [supabase/schema.sql](supabase/schema.sql)
- Tables: `profiles`, `user_data`
- Private Storage bucket: `zuzu-user-files`

The schema has already been applied to the connected `zuzu.os` project. The `delete-account` Edge Function is deployed with JWT verification enabled and deletes the signed-in user's private uploads before deleting the account. If deploying to a different Supabase project, run `supabase/schema.sql` in the SQL Editor, then update `SUPABASE_URL` and `SUPABASE_KEY` at the top of `app.js` with that project's URL and publishable key.

### Auth dashboard settings

In Supabase Dashboard → Authentication → URL Configuration, set the Site URL to your deployed URL. Add each local or production URL under Redirect URLs if you use password reset or email confirmation. Email confirmation may be enabled; when it is enabled, new users must verify their email before signing in.

## Run locally

Serve this directory over HTTP; do not open `index.html` as a `file://` URL.

```bash
python -m http.server 8080
```

Open http://localhost:8080.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` deploys the root directory when code is pushed to `main`. In GitHub, open Settings → Pages and choose **GitHub Actions** as the build and deployment source. The public frontend key is intentionally present in client code; Supabase RLS is the access-control boundary. Never put a service-role key, database password, or AI provider secret in this repository.

## Vercel later

Import this repository into Vercel and use the repository root as the project root. No build command is required for this static version. The same Supabase URL and publishable key can be used in the browser; make sure the Vercel production and preview URLs are added to Supabase Auth's Redirect URLs.

## Important security notes

- Database policies restrict profile and saved-data rows to the authenticated owner.
- The private Storage bucket policies require uploads to be placed under a folder named with the signed-in user's UUID.
- The Files app supports private uploads, listing, downloads, and deletion. Drag-and-drop upload and in-app document previews are not implemented yet.
- Music plays files locally in the browser; it does not stream a music catalog. Cine Hub opens discovery links instead of hosting movies.
- This project intentionally uses ZuzuOS-branded email/password accounts; no Microsoft identity provider or Microsoft sign-in button is part of the design.
- Do not treat client-side UI visibility as authorization. Enforce privileged actions in Supabase RLS or trusted server-side functions.
