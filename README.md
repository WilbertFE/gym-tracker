# GymTrack (working name)

A personal gym tracking and automation app. It records workouts, body weight, daily check-ins, and membership status, then turns that data into insights: a 3D body heatmap showing which muscles have been trained, scheduling suggestions, and training recommendations.

This README is the source of truth for building the app. Agents must read it, and `CLAUDE.md`, before writing any code. Keep this file updated whenever something is created, updated, or deleted (see "Documentation Rule" at the bottom).

---

## 1. Product Context

The owner is a university student who goes to the gym 3 to 4 times a week and has a busy, changing schedule. Problems to solve:

- Hard to track progress: body weight, which exercises were done on a given day, and workout duration.
- Hard to analyze physique changes over time.
- Easy to forget daily check-ins and the date the gym membership ends.
- Hard to find the best time slot to train around classes and other commitments.
- Unsure whether the current routine is good and which muscle groups are neglected.

The app is single-user first (the owner), but must still use real authentication.

---

## 2. Core Features

1. **Daily check-in**: quick log of whether the user went to the gym, plus mood, energy, and sleep (optional). Maintains a streak.
2. **Body weight tracking**: log weight with date, show trend line.
3. **Workout logging**: sessions with exercises, sets, reps, weight, and duration. Fast input is critical because it is used mid-workout on a phone.
4. **Membership tracker**: start date, end date, price, and a reminder when it is about to expire.
5. **3D body heatmap**: a 3D human body model where each muscle group is colored by training intensity (see section 7). Two views: weekly and overall (all time).
6. **Physique analysis**: progress photos stored privately, side by side comparison over time. AI analysis is a later phase.
7. **Smart scheduling**: suggest the best gym time based on the user's class schedule and past attendance.
8. **Training recommendations**: show which muscle groups are under-trained and suggest exercises.

---

## 3. Tech Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js (App Router, `src/` directory, TypeScript) |
| Styling | Tailwind CSS only |
| Components | shadcn/ui |
| Database and auth | Supabase (Postgres, Auth, Storage) |
| 3D | three.js via `@react-three/fiber` and `@react-three/drei` |
| Charts | Recharts (or shadcn chart components) |
| Forms and validation | `react-hook-form` and `zod` |
| Unit and integration tests | Vitest and Testing Library |
| End to end tests | Playwright |
| CI | GitHub Actions |

IMPORTANT: this Next.js version has breaking changes. Before writing code, read the relevant guides in `node_modules/next/dist/docs/`. Do not rely on memory for APIs, conventions, or file structure.

---

## 4. Project Structure

```
src/
  proxy.ts                  # route protection (auth middleware), see section 8
  app/
    layout.tsx
    page.tsx                # landing or redirect
    robots.ts
    sitemap.ts
    (auth)/login/           # public auth pages
    dashboard/              # protected
      components/
    workouts/               # protected
      components/
    body/                   # protected, 3D heatmap and physique
      components/
    membership/             # protected
      components/
    schedule/               # protected
      components/
    api/                    # all CRUD API routes live here
      checkins/
      weights/
      workouts/
      exercises/
      membership/
  components/               # reusable components only
    ui/                     # shadcn components
  lib/
    supabase/               # client, server, and admin helpers
    muscle-intensity.ts     # heatmap scoring logic
    utils.ts
tests/                      # unit and e2e tests
.github/workflows/ci.yml    # automated tests
```

Rules (from `CLAUDE.md`): reusable components go in `src/components`, page specific ones go in `src/app/{page}/components`, helpers go in `src/lib`, every CRUD operation gets an API route under `src/app/api`.

---

## 5. Step 0: Project Setup (do this first)

Run these steps in order. Do not skip the shadcn step.

1. Create the app (if it does not exist yet): TypeScript yes, ESLint yes, Tailwind yes, `src/` directory **yes**, App Router yes.
2. Read `node_modules/next/dist/docs/` for anything you are unsure about, especially middleware and `proxy.ts` placement when using `src/`.
3. Install shadcn **before building any UI** (see section 5.1).
4. Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers`, `recharts`, `three`, `@react-three/fiber`, `@react-three/drei`, `date-fns`.
5. Install dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@playwright/test`.
6. Configure fonts, global theme tokens, and dark mode (section 6).
7. Set up Supabase (section 8), `proxy.ts`, and the first migration.
8. Add `.github/workflows/ci.yml` running lint, type check, unit tests, and build on every push and pull request.
9. Create `.env.local` with the variables listed in section 10. Never commit it. Do not create or commit `.env.example`.
10. Commit following the Git policy in `CLAUDE.md`.

### 5.1 shadcn setup (style and preset)

The owner cannot choose a style, so the agent must choose one that fits the Dark Technical HUD look.

1. Check the current shadcn docs at https://ui.shadcn.com/ (and `npx shadcn@latest init --help`) to see which styles and presets are available today. Do not assume names from memory.
2. Pick the **sharpest, most boxy, most compact** option available. If a preset named **Lyra** exists (boxy, sharp, pairs well with monospace), use it. Otherwise use `new-york` and force `--radius: 0.125rem` or smaller.
3. Base color: **neutral** (or zinc). Enable CSS variables. Dark mode is the default and only theme for now.
4. After init, override the generated tokens in `globals.css` with the HUD palette in section 6 so shadcn components inherit the right look.
5. Add components as needed with `npx shadcn@latest add <component>`. Start with: `button`, `card`, `input`, `label`, `form`, `select`, `tabs`, `dialog`, `sheet`, `table`, `badge`, `progress`, `separator`, `skeleton`, `sonner`, `calendar`, `chart`.
6. Do not hand-write components that shadcn already provides. Do not duplicate reusable components.

---

## 6. Design System: Dark Technical HUD

The look is a dark body scanner or athlete analytics dashboard, with Swiss style typography: strict grid, clear hierarchy, lots of whitespace, almost no decoration. Read and follow the `frontend-design` skill whenever UI changes.

### 6.1 Principles

- The **3D body model is the hero** of the app. Everything else is calm and neutral so the heatmap colors stand out.
- Green, yellow, and red are **reserved for muscle intensity and status**. Never use them for decoration or branding.
- Data first: numbers are large, labels are small and uppercase, units are muted.
- Sharp corners and thin borders. No heavy shadows, no glassmorphism, no purple or blue gradients, no emoji icons.
- Mobile first. The app is used between sets, so tap targets are at least 44px and logging a set takes as few taps as possible.

### 6.2 Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `background` | `#0A0B0D` | page background |
| `surface` | `#111317` | cards, panels |
| `surface-raised` | `#171A1F` | hover, dialogs |
| `border` | `#23262D` | 1px borders |
| `foreground` | `#E6E8EB` | main text |
| `muted` | `#8A8F98` | secondary text, units |
| `accent` | `#22D3EE` | single UI accent (focus, primary action, active nav) |
| `intensity-none` | `#2A2E36` | untrained muscle |
| `intensity-low` | `#22C55E` | heatmap green |
| `intensity-mid` | `#EAB308` | heatmap yellow |
| `intensity-high` | `#EF4444` | heatmap red |

Map these onto shadcn's CSS variables (`--background`, `--card`, `--border`, `--primary`, and so on) in `globals.css`. The accent must stay distinct from the three intensity colors.

### 6.3 Typography

- Sans: **IBM Plex Sans** (UI text and headings).
- Mono: **JetBrains Mono** (all numbers, timers, units, and small uppercase labels), with tabular numerals enabled.
- Load both with `next/font`. Do not use Inter, Roboto, or system default stacks.
- Type scale: big stat numbers 40 to 64px mono, section labels 11 to 12px uppercase with letter spacing, body 14 to 16px.

### 6.4 Layout and components

- 12 column grid on desktop, single column on mobile, consistent 4px spacing scale.
- Cards: 1px border, `surface` background, radius `2px`, small uppercase label at top left, optional status dot at top right.
- Optional HUD details, used sparingly: thin corner brackets on the body model panel, subtle grid background behind the model, a faint scanline overlay on the hero panel only.
- Navigation: bottom tab bar on mobile (Dashboard, Workouts, Body, Schedule, More), left rail on desktop.
- Motion: short (150 to 250ms), functional only (state changes, heatmap color transitions). Respect `prefers-reduced-motion`.

---

## 7. 3D Body Heatmap

### 7.1 Muscle groups

Use a fixed list so data, UI, and model stay in sync:

`chest`, `front_delts`, `side_delts`, `rear_delts`, `biceps`, `triceps`, `forearms`, `abs`, `obliques`, `traps`, `lats`, `lower_back`, `glutes`, `quads`, `hamstrings`, `calves`.

Each exercise in the database maps to a primary muscle group and optional secondary groups.

### 7.2 Intensity scoring

Implement in `src/lib/muscle-intensity.ts` as a pure, unit tested function.

- Score per muscle = weighted sets in the period (primary sets count 1.0, secondary sets count 0.5).
- Two periods: **weekly** (current week, Monday to Sunday) and **overall** (all time, normalized against the user's own history).
- Map the score to a level: `none` (0), `low` (green), `mid` (yellow), `high` (red). Put thresholds in one constants object so they are easy to tune. Starting point for weekly: 1 to 5 weighted sets low, 6 to 12 mid, 13 or more high.
- Open question for the owner: whether red should mean "heavily trained, needs rest" or "dangerously overtrained". Default to the first meaning and keep the mapping configurable.

### 7.3 Model

- Use a GLB human body model where each muscle group is a separate mesh or has its own material, so colors can be set per group. Prefer a license friendly asset (CC0 or CC-BY with attribution recorded in this README).
- If no suitable model is available yet, **build a 2D SVG body map first** with the same muscle group ids and the same scoring and color logic. The 3D model replaces the view later without changing the data layer.
- Load the 3D canvas lazily and keep it a client component. The page file itself stays a Server Component.
- Controls: rotate, zoom, tap a muscle to see its weekly sets, last trained date, and suggested exercises. Toggle between Weekly and Overall.

---

## 8. Database and Auth (Supabase)

### 8.1 Auth

- Use Supabase Auth (email and password to start).
- Protect every authenticated route in `src/proxy.ts`: `/dashboard`, `/workouts`, `/body`, `/membership`, `/schedule`, and all `/api` routes except public ones. Unauthenticated users are redirected to `/login`.
- Enable Row Level Security on every table. Policy: a user can only read and write rows where `user_id = auth.uid()`.

### 8.2 Initial tables

Create via migrations (keep SQL in `supabase/migrations/`).

- `profiles`: `id` (uuid, references auth.users), `display_name`, `height_cm`, `goal`, `created_at`
- `daily_checkins`: `id`, `user_id`, `date` (unique per user), `went_to_gym` (bool), `mood`, `energy`, `sleep_hours`, `notes`
- `weight_logs`: `id`, `user_id`, `date`, `weight_kg`, `notes`
- `exercises`: `id`, `user_id` (null for built-in), `name`, `primary_muscle`, `secondary_muscles` (text array), `equipment`
- `workout_sessions`: `id`, `user_id`, `date`, `started_at`, `ended_at`, `duration_minutes`, `notes`
- `workout_sets`: `id`, `session_id`, `exercise_id`, `set_number`, `reps`, `weight_kg`, `rpe` (optional)
- `memberships`: `id`, `user_id`, `gym_name`, `start_date`, `end_date`, `price`, `notes`
- `progress_photos`: `id`, `user_id`, `date`, `storage_path`, `pose` (front, side, back)
- `availability_blocks`: `id`, `user_id`, `weekday`, `start_time`, `end_time`, `label` (classes and other commitments)
- `body_measurements` (added in Phase 6): `id`, `user_id`, `date` (unique per user), `chest_cm`, `waist_cm`, `hips_cm`, `arm_cm`, `thigh_cm`, `body_fat_pct` (all optional, at least one required)

Progress photos go in a **private** Storage bucket with RLS. Never expose public URLs.

---

## 9. Build Roadmap

Work phase by phase. Finish, test, document, and commit each phase before starting the next.

**Phase 1: Foundation**
Setup (section 5), design tokens, app shell (nav, layout), login, `proxy.ts`, first migration, CI.

**Phase 2: Daily basics**
Daily check-in with streak, weight logging with trend chart, membership tracker with expiry warning. API routes and tests for each.

**Phase 3: Workout logging**
Exercise library (seeded), start and finish a session, add sets quickly, auto duration, history list, session detail.

**Phase 4: Dashboard**
Weekly summary (sessions, total time, volume), weight trend, streak, membership status, next suggested workout.

**Phase 5: Body heatmap**
Muscle intensity logic with tests, 2D SVG map, then 3D model, weekly and overall toggle, muscle detail panel.

**Phase 6: Physique analysis**
Private progress photo upload, side by side comparison, measurement entries. AI based analysis is optional and comes last.

**Phase 7: Smart scheduling and recommendations**
Weekly availability blocks, best time suggestions from availability and attendance history, under-trained muscle recommendations.

---

## 10. Environment Variables

Create `.env.local` (never commit). Variable names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or the publishable key name used by the current Supabase dashboard)
- `SUPABASE_SERVICE_ROLE_KEY` (server only, never exposed to the client)
- `NEXT_PUBLIC_SITE_URL` (single source for the absolute base URL, used by `metadataBase`, canonical URLs, robots, and sitemap)

Do not create or commit `.env.example`.

---

## 11. Engineering Rules (summary of CLAUDE.md)

- Pages and layouts are Server Components. Push `"use client"` down to small interactive components.
- Every page exports typed `metadata` (or `generateMetadata` handling not-found), has an absolute canonical URL, one `<h1>`, semantic HTML, and image `alt` text. Authenticated app pages should use `robots: { index: false }` and be disallowed in `robots.ts`.
- Every CRUD operation has an API route in `src/app/api`. Validate input with zod.
- Add delay (debounce, throttle, or rate limiting) to actions that can be spammed, such as logging endpoints, uploads, and auth.
- Add tests for every crucial feature (scoring logic, API routes, auth protection, session logging). They must run in GitHub Actions.
- Never use the em dash character anywhere: code, comments, UI text, or docs. Use a comma, period, colon, or restructure the sentence.
- Commit after each completed task with a conventional commit message. Ensure build, lint, and tests pass first. Do not commit secrets or temporary files.

---

## 12. Documentation Rule

This README must always describe the current state of the app in detail. Whenever you create, update, or delete a feature, route, table, component, env variable, or dependency, update the relevant section in the same commit.

As the app grows, add these sections below and keep them current:

- Setup and run instructions (install, dev, test, build)
- Implemented features and their status
- API reference (route, method, input, output)
- Database schema and migration history
- Testing and CI overview
- 3D model source and license attribution
- Changelog
---

# Current State (kept up to date)

## 13. Setup and Run

Requirements: Node 22+, a Supabase project.

```bash
npm install --legacy-peer-deps   # optional peers of @hookform/resolvers conflict, safe to ignore
npm run dev                      # http://localhost:3000
npm run lint
npm run typecheck
npm test                         # Vitest unit tests
npm run build
```

Note for Windows: if the project path contains parentheses, run npm scripts from PowerShell, because `cmd.exe` fails to launch `node`.

Create `.env.local` with the variables in section 10 (never commit it). Apply `supabase/migrations/*.sql` to your Supabase project (SQL editor or `supabase db push`). In Supabase Auth settings, decide whether email confirmation is required; the login form handles both.

## 14. Implemented Features and Status

| Area | Status |
| --- | --- |
| Phase 1: Foundation | Done, except applying the migration to a Supabase project (pending, needs the owner to pick or create a project) |
| Phase 2: Daily basics | Done on dummy data (see Demo mode and Data layer below) |
| Phase 3: Workout logging | Done on dummy data |
| Phase 4: Dashboard | Done on dummy data |
| Phase 5: Body heatmap | Done on dummy data (2D SVG map and a procedural 3D model, no licensed GLB yet) |
| Phase 6: Physique analysis | Done on dummy data. AI based analysis is intentionally not built (optional, last) |
| shadcn setup | Style `radix-lyra` (boxy, sharp), neutral base, CSS variables, dark only |
| Design tokens | HUD palette mapped to shadcn variables in `globals.css`, plus `surface`, `surface-raised`, `intensity-*` tokens |
| Fonts | IBM Plex Sans and JetBrains Mono via `next/font`; `.tabular` utility for mono tabular numerals |
| Auth | Email and password via Supabase; login, signup, logout API routes |
| Route protection | `src/proxy.ts` (see below) |
| App shell | Mobile bottom tab bar, desktop left rail |
| Daily check-in | Dashboard: went to gym or rest day, mood, energy, sleep, streak, best streak, gym days in 7 days, 7 day strip. One entry per date, saving again updates it |
| Weight tracking | Body page: latest, 7 day and all time change, Recharts trend line, log form, history table with delete |
| Membership tracker | Membership page: gym, dates, price, days left, progress bar, status (active, expiring within 7 days, expired), edit and delete |
| Exercise library | 37 built-in exercises covering all 16 muscle groups (`src/lib/exercise-library.ts`), plus custom exercises (add, delete if unused) at `/workouts/exercises` |
| Workout sessions | Start (only one in progress at a time), live elapsed timer, finish (duration in minutes is computed automatically, minimum 1), delete with confirmation |
| Fast set logging | Exercise picker grouped by muscle, chips to switch between exercises already in the workout, big minus/plus steppers (1 rep, 2.5 kg), reps and weight prefilled from the last set of that exercise (this workout first, then history), inputs stay after logging so a repeat set is one tap |
| Workout history | List of finished workouts with duration, set count and volume; detail page with sets grouped by exercise |
| Weekly summary | Dashboard: workouts, total time and total volume for the current Monday to Sunday week, each compared with last week, plus a volume bar per day (`src/lib/week.ts`) |
| Next workout suggestion | Dashboard: suggests push, pull or legs, whichever has waited longest (never trained counts as longest, ties go push, pull, legs), with up to 5 exercises (at most 2 per muscle), favouring the ones used most. Shows a resume link and timer instead while a workout is in progress (`src/lib/suggestion.ts`) |
| Dashboard snapshots | Check-in and streak, weight trend (last 12 entries), membership status with days left |
| Muscle intensity scoring | `src/lib/muscle-intensity.ts`: weighted sets per muscle (primary 1.0, secondary 0.5) for the current Monday to Sunday week and for all time. Thresholds, labels and hint text live in one `INTENSITY_CONFIG` object. Weekly: 1 to 5 light (green), 6 to 12 moderate (yellow), 13 or more heavy (red). Overall: relative to the user's most trained muscle (up to 33% light, up to 66% moderate, above heavy) |
| Body heatmap | Body page: Weekly and Overall toggle, Front, Back and 3D views, legend, tap a muscle (or choose it from the list of all 16) to see weekly sets, all time sets, days since last trained, top exercises for the period and suggested exercises |
| Progress photos | `/body/progress`: upload JPEG, PNG or WebP (up to 5 MB, 100 per user) with a date and pose (front, side, back), gallery with pose filter and two step delete. Photos are private: no public URL, every file request is authenticated and scoped to the owner |
| Photo comparison | Pick a pose and two dates and see the photos side by side with the time between them, the weight change and each body measurement change, using the nearest entries on or before each date (`src/lib/progress.ts`). A metric is only shown when two different entries exist |
| Body measurements | Chest, waist, hips, arm, thigh and body fat. One entry per date (saving again replaces it), history table with the change since the previous entry for each metric |
| Pages | Landing, login, dashboard, workouts (list, detail, library), body (heatmap, weight), body progress, membership are functional; schedule is a placeholder |
| Phases 2 to 7 | Not started |

Deviations from the planned structure: authenticated pages live in the `src/app/(app)/` route group so they share one layout with the navigation. URLs are unchanged (`/dashboard`, `/workouts`, and so on). The "More" tab on mobile points to Membership.

### Route protection

`src/proxy.ts` refreshes the Supabase session on every matched request. Anonymous users are redirected to `/login` for `/dashboard`, `/workouts`, `/body`, `/membership`, `/schedule`. Anonymous calls to `/api/*` get `401` JSON, except `/api/auth/*`. Signed in users visiting `/login` are sent to `/dashboard`. The check is optimistic; API routes re-verify the user with `requireUser()` in `src/lib/auth.ts`. Protected prefixes live in `src/lib/site.ts`.

## 15. API Reference

| Route | Method | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| `/api/auth/login` | POST | `{ email, password }` | `{ ok: true }` or `{ error }` (400, 401, 429) | Rate limited: 5 per minute per IP |
| `/api/auth/signup` | POST | `{ email, password }` | `{ ok: true, needsConfirmation }` or `{ error }` | Rate limited: 3 per minute per IP |
| `/api/auth/logout` | POST | none | `{ ok: true }` | Clears the session cookies |

| `/api/checkins` | GET | none | `{ data: Checkin[] }` newest first | |
| `/api/checkins` | POST | `{ date, went_to_gym, mood?, energy?, sleep_hours?, notes? }` | `{ data: Checkin }` | Upsert by date. 30 writes per minute per user |
| `/api/checkins/[id]` | DELETE | none | `{ ok: true }` or 404 | |
| `/api/weights` | GET | none | `{ data: WeightLog[] }` newest first | |
| `/api/weights` | POST | `{ date, weight_kg (20 to 500), notes? }` | `201 { data }` | 30 writes per minute per user |
| `/api/weights/[id]` | PUT, DELETE | same body for PUT | `{ data }` or `{ ok: true }`, 404 if missing | |
| `/api/membership` | GET | none | `{ data: Membership[] }` newest end date first | |
| `/api/membership` | POST | `{ gym_name, start_date, end_date, price?, notes? }` | `201 { data }` | end_date must not precede start_date |
| `/api/membership/[id]` | PUT, DELETE | same body for PUT | `{ data }` or `{ ok: true }`, 404 if missing | |
| `/api/exercises` | GET | none | `{ data: Exercise[] }` built-ins plus own, by name | |
| `/api/exercises` | POST | `{ name, primary_muscle, secondary_muscles?, equipment? }` | `201 { data }` | Primary muscle is removed from the secondary list |
| `/api/exercises/[id]` | DELETE | none | `{ ok: true }`, 403 built-in, 409 used in a workout, 404 missing | |
| `/api/workouts` | GET | none | `{ data: WorkoutSession[] }` newest first | |
| `/api/workouts` | POST | optional `{ notes? }` | `201 { data, already_active: false }`, or `200 { data, already_active: true }` | Returns the in-progress workout instead of creating a second |
| `/api/workouts/[id]` | GET | none | `{ data: { session, sets } }` or 404 | |
| `/api/workouts/[id]` | PUT | `{ notes? }` | `{ data }` | |
| `/api/workouts/[id]` | DELETE | none | `{ ok: true }` | Deletes its sets too |
| `/api/workouts/[id]/finish` | POST | none | `{ data }` with `ended_at` and `duration_minutes` | Idempotent |
| `/api/workouts/[id]/sets` | POST | `{ exercise_id, reps (0 to 1000), weight_kg (0 to 1000), rpe? }` | `201 { data }` with `set_number` assigned per exercise | 400 for an unknown exercise. 90 writes per minute per user |
| `/api/workouts/[id]/sets/[setId]` | PUT, DELETE | `{ reps, weight_kg, rpe? }` for PUT | `{ data }` or `{ ok: true }` | Deleting renumbers the remaining sets of that exercise |
| `/api/photos` | GET | none | `{ data: ProgressPhoto[] }` metadata only, newest first | |
| `/api/photos` | POST | multipart: `file`, `date`, `pose` | `201 { data }`, 400 not a JPEG, PNG or WebP (checked by magic bytes, never by name or claimed type, SVG rejected), 413 over 5 MB, 409 photo limit | 10 uploads per minute per user |
| `/api/photos/[id]` | DELETE | none | `{ ok: true }` or 404 | Removes the record and the file |
| `/api/photos/[id]/file` | GET | none | The image bytes, or 404 | Authenticated. Sent with `Cache-Control: private, no-store`, `nosniff` and a sandboxing CSP |
| `/api/measurements` | GET | none | `{ data: BodyMeasurement[] }` newest first | |
| `/api/measurements` | POST | `{ date, chest_cm?, waist_cm?, hips_cm?, arm_cm?, thigh_cm?, body_fat_pct? }` | `{ data }` | Upsert by date. At least one value required, ranges enforced |
| `/api/measurements/[id]` | DELETE | none | `{ ok: true }` or 404 | |

All routes above require a session (401 otherwise) and validate input with zod (400 on invalid input, 429 when rate limited). Dates are `YYYY-MM-DD`; check-in and weight dates cannot be in the future.

Password rules: 8 to 72 characters (`src/lib/validation/auth.ts`). The in-memory rate limiter (`src/lib/rate-limit.ts`) suits a single instance; use a shared store if scaled out.

## 15.1 Demo Mode and Data Layer (temporary)

Until a Supabase project is connected, the app runs on dummy data:

- Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` (dev only; it is ignored in production builds). `proxy.ts`, `requireUser()` and `getCurrentUserId()` then treat every visitor as one demo user, so login is skipped and a banner is shown.
- All data access goes through `src/lib/repositories/` (`checkins.ts`, `weights.ts`, `memberships.ts`). They read and write an in-memory store (`store.ts`, seeded with sample data, reset when the server restarts).
- Migration to Supabase later: replace the bodies of the repository functions with Supabase queries (the tables already exist in the migration), delete `store.ts`, remove `NEXT_PUBLIC_DEMO_MODE`, and fill in the Supabase env vars. Function signatures, API routes, validation and UI stay unchanged.
- Business logic is pure and tested: `src/lib/streak.ts`, `src/lib/membership.ts`, `src/lib/weight.ts`, `src/lib/workout.ts` (duration, volume, set numbering, grouping, formatting).
- Dashboard panels (`src/app/(app)/dashboard/components/`) only read through the repositories, so they need no change when Supabase is connected. Each panel fetches its own data inside its own `Suspense`; if the extra queries matter later, wrap the repository reads in React `cache`.
- Repositories added in Phase 3: `exercises.ts` and `workouts.ts` (sessions and sets). The seeded demo history has three finished workouts.
- Photos (Phase 6): `repositories/photos.ts` keeps metadata and the bytes in memory under `<user id>/<photo id>.<ext>`, the same layout the private `progress-photos` bucket policy expects. With Supabase, upload to that bucket from the route handler (server side, after the same size and magic byte checks), keep `progress_photos` rows, and stream or sign short lived URLs in `/api/photos/[id]/file`. Never make the bucket public. The seeded demo photos are SVG placeholders, which is why `contentTypeForPath` knows `.svg`; real uploads can never be SVG.
- Extra migration work for Phase 3: built-in exercises currently use stable slug ids (`builtin-barbell-bench-press`). With Supabase, add a seed migration inserting `BUILT_IN_EXERCISES` as rows with `user_id` null and uuid ids, and change `exercise-library.ts` and the repositories to read them from the table. `workout_sets.exercise_id` references `exercises.id`, so the repository must write real ids.
- The unfinished workout is identified by `ended_at` being null. Add a partial unique index on `workout_sessions (user_id) where ended_at is null` in the migration to enforce one active workout in the database too.

Streak definition: consecutive days with any check-in (gym or rest day), since the habit being tracked is logging. It stays alive until the end of today if yesterday was logged.

## 16. Database Schema and Migrations

| Migration | Contents |
| --- | --- |
| `20261024000100_body_measurements.sql` | `body_measurements` table with range checks, one row per user per day, at least one metric per row, and RLS |
| `20261024000000_initial_schema.sql` | All tables from section 8.2 (except `body_measurements`), `muscle_group` and `photo_pose` enums, RLS on every table, profile creation trigger on sign up, private `progress-photos` storage bucket with per-user folder policy |

Status: written, not yet applied to any Supabase project.

## 17. Testing and CI

- Vitest config: `vitest.config.mts`; tests in `tests/unit/`: rate limiter, proxy protection, login route, streak, membership status, weight summary, workout logic, photo type detection by magic bytes, progress comparison and measurement deltas, photo upload and measurement routes (rejected disguised files, SVG, oversize, bad input, per user limit, upload rate limit, privacy headers, user isolation), muscle intensity scoring (weights, weekly range, overall normalisation, last trained, suggestions), week ranges and summaries, delta formatting, next workout suggestion, and CRUD routes for check-ins, weights, membership, exercises and workouts (validation, set numbering and renumbering, one active workout, idempotent finish, cascade delete, prefill priority, user isolation, write rate limits).
- `npm run typecheck` runs `next typegen` first, because route handler types are generated.
- Playwright is installed for end to end tests but not configured yet.
- GitHub Actions: `.github/workflows/ci.yml` runs lint, typecheck, tests and build on every push and pull request, using placeholder Supabase env values.

## 18. 3D Model Source and License

There is no external 3D asset, so there is nothing to attribute. The 3D view is a procedural stand-in built in code: one scaled sphere (ellipsoid) per muscle group plus dark filler shapes, defined in `src/app/(app)/body/components/body-3d-parts.ts` and rendered with react-three-fiber in `body-3d.tsx`. It supports drag to rotate, scroll or pinch to zoom, and tap to select. It is loaded on demand (`next/dynamic`, no SSR) and the page itself stays a Server Component.

The 2D map shapes (`body-shapes.ts`) are hand-drawn paths, also original to this project.

To upgrade to a realistic model: add a CC0 or CC-BY GLB with one mesh or material per muscle group (ids from `src/lib/muscles.ts`), record the source, author and license here, and replace `body-3d.tsx`. The scoring, data and detail panel do not change.

Red meaning: defaults to "heavily trained, needs rest" (open question in section 7.2). To change it, edit `labels.high` and `hints.high` in `INTENSITY_CONFIG`.

## 19. Changelog

- 2026-10-24: Phase 6 physique analysis: private progress photo upload with server side image validation, authenticated photo serving, side by side comparison with weight and measurement changes, body measurements, `body_measurements` migration. AI analysis not built.
- 2026-10-24: Phase 5 body heatmap: tested muscle intensity scoring, 2D SVG body map with front and back views, procedural 3D model, weekly and overall toggle, muscle detail panel and muscle list. The Body page now leads with the heatmap.
- 2026-10-24: Phase 4 dashboard: weekly summary with last week comparison and daily volume bars, next workout suggestion (push, pull, legs rotation), membership and weight snapshots. Moved the weight chart and start workout button to `src/components` and extracted a shared membership status component, since they are now used on several pages.
- 2026-10-24: Phase 3 workout logging on the dummy data layer: seeded exercise library with custom exercises, workout sessions with live timer and automatic duration, fast set logging with prefill, history and session detail, workout and exercise API routes, tests. The nav is wrapped in `Suspense` because `usePathname()` is runtime data on dynamic routes.
- 2026-10-24: Phase 2 daily basics on a swappable in-memory data layer: check-in with streak, weight tracking with trend chart, membership tracker with expiry warning, CRUD API routes, demo mode, tests.
- 2026-10-24: Phase 1 foundation: dependencies, shadcn (radix-lyra), HUD theme, fonts, Supabase helpers, proxy, auth routes and login, app shell, robots, sitemap, initial migration, tests, CI.
