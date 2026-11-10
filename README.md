# Daily Student Habit & Time Report

A mobile-first web app for a teacher (Noor) and his students.

- **Students** open `/report`, pick their name, and fill in how they spent their day:
  school, study at home, subjects, sleep, fun time, exercise, water, other
  activities, habit development and phone screen time. A live "Total 24h"
  check updates as they type. One report per student per day — submitting
  again updates the old one.
- **The teacher (admin)** opens `/admin` and sees every student in one
  colour-coded table (green / yellow / red by the rules below), can edit or
  delete any entry, manage the student roster, change the colour rules, see a
  weekly summary, and export Excel (.xlsx), PDF (landscape) or a PNG image
  (for WhatsApp / mentor).

Stack: **Next.js 14 (App Router) + React 18 + TypeScript (strict) + Tailwind
CSS 3 + Supabase (Postgres)**. No local file storage — all data lives in
Supabase. Totals and colours are calculated in code (`lib/status.ts`), never
in the database.

## Status colour rules

All rules live in one editable file, `lib/report-config.ts` (thresholds in
minutes, water in litres). Colours: green `#22c55e`, yellow `#fcd34d`, red
`#ef4444` (white text on red/green, dark text on yellow).

| Field | Green | Yellow | Red |
| --- | --- | --- | --- |
| Study at home | ≥ 7h (420m) | 4h–<7h (240–419m) | < 4h |
| Subjects | ≥ 2 | 1 | 0 |
| Sleep | ≥ 8h (480m) | 6h–<8h (360–479m) | < 6h |
| Fun time | ≤ 2h (120m) | > 2h–3h (121–180m) | > 3h |
| Exercise / Sports | ≥ 30m | 15–29m | < 15m (empty = 0 = red) |
| Water | ≥ 3 L | 1.5–<3 L | < 1.5 L |
| School, Other, Habit, Screen | neutral (no colour) | | |

**Total 24h check:** total = school + study + sleep + fun + exercise + other
+ habit. Screen time and water are **not** included (screen time overlaps
with fun time). If the total is within 5 minutes of 24h: green
"24 hrs Complete". Otherwise red, e.g. "22 hrs 30m / 1 hrs 30m missing" or
"25 hrs / over by 1 hrs".

The admin can change every threshold from **/admin/settings** (saved in the
`report_settings` table, row id=1, merged over the config-file defaults; a
"Reset to defaults" button restores the file values).

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. In the Supabase Dashboard, open **SQL Editor → New query**, paste
   `supabase/schema.sql`, and run it. Then paste `supabase/seed.sql` and run
   it — this adds the first two students (Zara, Syed Hashim Hussain).
3. Copy the keys from **Project Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secret — server only)

The schema enables Row Level Security: anonymous users can read active
students and reports and can insert/update reports (upsert by student+date),
but cannot delete. Admin writes (roster, edit/delete entries, settings) go
through server API routes that use the service-role key and check the admin
session cookie first.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key (browser-safe, RLS-limited) |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | Service-role key for admin API routes only |
| `ADMIN_PASSWORD` | secret | Password for `/admin` |
| `ADMIN_SESSION_SECRET` | secret, optional | Extra secret to sign the admin session cookie (defaults to `ADMIN_PASSWORD`) |

Copy `.env.example` to `.env.local` for local development. Never commit
`.env.local` or the service-role key.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Open `http://localhost:3000/report` for the student form and
`http://localhost:3000/admin` for the admin panel (redirects to
`/admin/login` without a session).

Useful commands:

```bash
npx tsc --noEmit   # type check
npm run build      # production build
npm start          # serve the production build
```

If Supabase env vars are missing, the app does not crash: the student form
and admin pages show a "Setup needed" notice explaining what to add.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com), **Add New → Project → Import** the repo.
3. In **Settings → Environment Variables**, add all five variables above
   (the two `NEXT_PUBLIC_*` keys, `SUPABASE_SERVICE_ROLE_KEY`,
   `ADMIN_PASSWORD`, and optionally `ADMIN_SESSION_SECRET`).
4. Click **Deploy**. Vercel runs `npm run build` and hosts the app; no
   further server setup is needed (the app is a standard Next.js app, and
   Supabase hosts the database).
5. Open the deployed URL: `/report` for students, `/admin` for the teacher.
   Share the student link from the admin panel ("Copy today's link").

## Admin login

Go to `/admin/login` and enter `ADMIN_PASSWORD`. A successful login sets an
`httpOnly`, `SameSite=Lax` (Secure in production) `admin_session` cookie
(HMAC-SHA256 signed, 7-day expiry). Middleware protects `/admin/*` (except
`/admin/login`) and the `/api/admin/*` routes check the cookie themselves.
Log out from the button in the admin header.

## Exports

On `/admin`, the export buttons run entirely in the browser (no server
storage): **Excel** (`.xlsx`, same cell colours, via SheetJS), **PDF**
(landscape A4, same layout and colours, via jsPDF + autotable), and **PNG**
(a screenshot of the table via html2canvas — handy for WhatsApp).

## Project layout

```
app/
  page.tsx                 Landing page (links to /report and /admin)
  report/page.tsx          Public student form (live Total 24h)
  admin/
    login/page.tsx         Admin login
    page.tsx               Daily table + roster + edit/delete + exports
    settings/page.tsx      Threshold settings
    weekly/page.tsx        Weekly summary per student
  api/
    students/route.ts      GET active students (public)
    reports/route.ts       GET by date/range, POST upsert (public)
    admin/
      login/route.ts       POST login (sets cookie)
      logout/route.ts      POST logout (clears cookie)
      students/route.ts    GET/POST/PUT/DELETE roster (admin)
      reports/route.ts     PUT/DELETE entry (admin)
      settings/route.ts    GET/PUT thresholds (admin)
components/
  TimeInput.tsx            Hours + minutes input (empty = 0)
  ReportTable.tsx          The colour-coded daily table
  ExportButtons.tsx        Excel / PDF / PNG exports
  AdminNav.tsx             Admin header navigation
  SetupNotice.tsx          "Supabase not configured" notice
lib/
  report-config.ts         THE config file: all thresholds + colours
  status.ts                Status per field, total, 24h check
  time.ts                  Date + duration formatting
  types.ts                 Student / ReportRow shapes
  validation.ts            Server-side input validation
  admin-auth.ts            Admin session cookie (HMAC-SHA256)
  http.ts                  API helpers (JSON errors, admin check)
  supabase/
    client.ts              Browser anon client
    server.ts              Server anon + service-role clients
middleware.ts              Protects /admin/* (except /admin/login)
supabase/
  schema.sql               Tables + RLS policies + settings row
  seed.sql                 Zara + Syed Hashim Hussain
```
