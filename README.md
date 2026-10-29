# Muscles Leveling

A personal gym tracking app that plays like a game (formerly called GymTrack): levels, ranks, quests and boosters on top of workouts, body weight, check-ins and membership. It records workouts, body weight, daily check-ins, and membership status, then turns that data into insights: a 3D body heatmap showing which muscles have been trained, scheduling suggestions, and training recommendations.

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

1. **Daily check-in**: quick log of how the user trained today (gym, home workout or rest day), plus mood, energy, and sleep (optional). Maintains a streak.
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

## 6. Design System: The System

The look is a cold, translucent interface floating over darkness, like the heads-up display a game "System" projects for its Player. Every card is a System window. Mood only: no characters, quotes, logos or art from any franchise. Read and follow the design skill whenever UI changes.

This design lives on the branch `feat/system-ui`. The earlier "dark technical HUD" look (cyan accent, plain cards, IBM Plex headings) is still on `main` until the branch is merged.

### 6.1 Principles

- The **3D body model is the hero** of the muscle screens. Heatmap colors stay as they are, because they are data.
- Green, yellow, and red are **reserved for muscle intensity and status**. The boss red is used only for open weekly gates and destructive actions.
- Data first: numbers are large, labels are small and uppercase, units are muted. Logging a set must stay fast, so the logging screens get the same frame and colors but no extra decoration.
- Sharp corners, thin glowing borders. The glow is soft and static. The page ground (a blue bloom and a faint grid) never animates.
- Mobile first. The app is used between sets, so tap targets are at least 44px.

### 6.2 Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `background` | `#05070D` | page background, blue-black |
| `card` / `surface` | `#0A1222` | System windows, panels |
| `surface-raised` | `#0F1A2E` | hover, raised rows |
| `border` | `#1A2A46` | 1px borders |
| `foreground` | `#DBE6F7` | main text |
| `muted-foreground` | `#8593B0` | secondary text, units |
| `primary` | `#4AA8FF` | System blue: focus, primary action, active nav, glow |
| `danger` | `#FF4D5E` | open gates and bosses, destructive actions |
| `intensity-none` | `#1F2B42` | untrained muscle, empty bars |
| `intensity-low` | `#22C55E` | heatmap green |
| `intensity-mid` | `#EAB308` | heatmap yellow |
| `intensity-high` | `#EF4444` | heatmap red |

The tokens are mapped onto shadcn's CSS variables in `src/app/globals.css`.

### 6.3 Typography

- Display: **Chakra Petch** (angular, HUD-like). Used for headings, bracketed panel labels, buttons, the site name and big level and rank numbers.
- Sans: **IBM Plex Sans** for running text.
- Mono: **JetBrains Mono** for numbers, timers and units, with tabular numerals (`.tabular`).
- All three load through `next/font`. Headings (`h1` to `h3`) use the display face by default.

### 6.4 Layout and components

- **System window** (`.system-window` in `globals.css`): thin glowing border, faint top gradient, corner brackets top left and bottom right. `data-glow` is the stronger kind and `data-danger` turns it red. It materializes once on load (a 220 ms clip and fade, off under reduced motion).
- `Panel` (`src/components/panel.tsx`) renders every card as a System window with a bracketed label such as `[ STATUS ]`. Variants: `plain` (quiet), `system` (glowing), `danger` (red, open gates).
- Bars (XP, quests, boss HP, stats) are thin glowing bars with a bright leading edge (`Progress` and the `.system-bar` utility).
- Navigation: bottom tab bar on mobile (Dashboard, Workouts, Body, Schedule, Settings), left rail on desktop (the same plus Status, Leaderboard and Membership once unlocked). The rail and the bar glow in the System blue.
- Landing and sign in are System windows too: "You have been chosen as a Player."
- Motion: short (150 to 250ms), functional only. Respect `prefers-reduced-motion`.

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
- `daily_checkins`: `id`, `user_id`, `date` (unique per user), `kind` (`gym`, `home` or `rest`), `mood`, `energy`, `sleep_hours`, `notes`
- `weight_logs`: `id`, `user_id`, `date`, `weight_kg`, `notes`
- `exercises`: `id`, `user_id` (null for built-in), `name`, `primary_muscle`, `secondary_muscles` (text array), `equipment`
- `workout_sessions`: `id`, `user_id`, `date`, `started_at`, `ended_at`, `duration_minutes`, `notes`
- `workout_sets`: `id`, `session_id`, `exercise_id`, `set_number`, `reps`, `weight_kg`, `rpe` (optional)
- `memberships`: `id`, `user_id`, `gym_name`, `location` (added later, optional text up to 120 characters), `latitude` and `longitude` (optional, both set or both empty), `start_date`, `end_date`, `price`, `notes`
- `progress_photos`: `id`, `user_id`, `date`, `storage_path`, `pose` (front, side, back)
- `availability_blocks`: `id`, `user_id`, `weekday`, `start_time`, `end_time`, `label` (classes and other commitments)
- `log_photos` (added later): `id`, `user_id`, `checkin_id` or `weight_id` (exactly one, deleted with its entry), `storage_path`, `created_at`. Photos on daily check-ins and weigh-ins; files go in the same private bucket under `<user id>/log/`
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
| Phase 7: Scheduling and recommendations | Done on dummy data. All roadmap phases are complete; the remaining work is connecting Supabase (section 20) |
| shadcn setup | Style `radix-lyra` (boxy, sharp), neutral base, CSS variables, dark only |
| Design tokens | HUD palette mapped to shadcn variables in `globals.css`, plus `surface`, `surface-raised`, `intensity-*` tokens |
| Fonts | Chakra Petch (display), IBM Plex Sans and JetBrains Mono via `next/font`; `.tabular` utility for mono tabular numerals |
| Auth | Email and password via Supabase; login, signup, logout API routes |
| Route protection | `src/proxy.ts` (see below) |
| App shell | Mobile bottom tab bar, desktop left rail |
| Daily check-in | Dashboard, "1. Check in" card: how you trained today, one of Gym, Home workout or Rest day, a streak with the days trained in the last 7, and a 7 day strip (gym filled, home half filled, rest outlined). Mood, energy and sleep are shown right in the form (all optional). One entry per date, saving again updates it |
| Check-in and weigh-in photos | Up to 4 photos per daily check-in (dashboard) and per weigh-in (Body page, the camera icon on each history row). "Take photo" opens the camera on a phone and "Choose photos" picks from the gallery. Photos are shrunk to 1600 px and re-encoded as JPEG in the browser before upload, which also removes the location and device data a phone writes into photos. Add a photo to today's check-in after saving it. Deleting a check-in or weigh-in deletes its photos and files. Private, same rules as progress photos |
| Gym diary | `/dashboard/diary`: all check-in and weigh-in photos grouped by day, newest first, with that day's check-in and weight. Linked from the check-in panel |
| Body page tabs | The Body page shows one view at a time with tabs: Muscles (heatmap) and Weight. A card link below leads to the progress page, which has its own tabs: Photos (compare, upload, gallery) and Measurements (log and history). The tabs are a shared component, `src/components/section-tabs.tsx`. On phones the heatmap controls take a full row each, measurement history is one card per day instead of an eight column table, and before and after photos use tighter gaps |
| Weight tracking | Body page, Weight tab: latest, 7 day and all time change, Recharts trend line, log form, history table with delete |
| Membership tracker | Membership page: gym, location (optional address text) and a map pin (optional). Pick the place by searching, tapping the map, dragging the pin, or "Use my location"; the address text is filled in from the pin unless you typed your own. Shown with an "Open in maps" link that uses the exact pin, or the gym name plus address if there is no pin, dates, price, days left, progress bar, status (active, expiring within 7 days, expired), edit and delete |
| Exercise library | 37 built-in exercises covering all 16 muscle groups (`src/lib/exercise-library.ts`), plus custom exercises (add, delete if unused) at `/workouts/exercises` |
| Check-in required to start | A new workout can only be started when today's daily check-in says you trained, at the gym or at home. With no check-in, or with today marked as a rest day, every start button (Workouts page, dashboard Start training) is turned off and says why, with a "Go to the check-in" link, and the server refuses too (`POST /api/workouts` answers 403 with code `checkin_required` and reason `no_checkin` or `rest_day`). A workout that is already in progress can always be continued, even if the check-in changes afterwards. Rule in `src/lib/workout-gate.ts` |
| Share a workout | When you finish a workout that has sets, a dialog opens by itself with the share image ready (close it any time; the workout page keeps a "Share workout" button too). The image is drawn in the browser (canvas, no server, no extra library) when the dialog is open and is never stored. Six looks in the System style: Classic (blue-black with a grid and a blue bloom, three number tiles), Bold (blue gradient), Light, Status (the three numbers as rows of one System window), Shadow (deep violet, the volume as a big number with time and sets beside it) and Mono (black and white, same layout as Shadow, its white outline reads on every muscle color). They are picked in a 3 by 2 grid. Each has bracketed labels, corner brackets on the three number tiles, a glowing title in the display face and bars with a bright leading edge, and two sizes, Story 1080 x 1920 and Square 1080 x 1080. It shows the day type (Push, Pull, Legs or Full body, named when one split holds at least 65% of the sets), date, where you trained (the gym name and the first part of its address for a gym day, "Home workout" for a home day), your rank badge and level, time, volume in your unit, sets, and **the same body as the workout page**: front and back figures with FRONT and BACK captions, each muscle in the app's green, yellow or red by this week's total sets, and the muscles this workout worked outlined in the accent color. Story adds a Light, Moderate, Heavy legend and the top three lifts with their heaviest set; Square leaves those out for space. A checkbox hides the location. The image never has a name, coordinates or body weight. "Share" uses the phone's share sheet when the browser can share files, otherwise it saves the file; "Save image" always saves it. The body data comes from one helper, `src/lib/workout-body.ts`, used by both the workout page and the share image so they cannot disagree. Wording in `src/lib/share.ts`, drawing in `src/lib/share-render.ts`, dialog in `src/app/(app)/workouts/components/share-workout.tsx`. Not built yet: a streak or level card |
| Levels and XP | The dashboard hero, and a page with the rank ladder and the XP breakdown at `/dashboard/level`. XP is worked out from what is already logged (`src/lib/xp.ts`), with no extra table, so deleting an entry removes its XP. Rules: gym check-in 20, home workout check-in 15, rest day check-in 5, weigh-in 10 (once a day), measurements 10 (once a day), progress photo 10 (once a day), finished workout 40 (needs at least 3 sets), 2 per set in a finished workout (at most 30 sets per workout). Streak milestones are one-time bonuses for the longest run of consecutive check-in days: 3 days 30 XP, 7 days 70, 14 days 150, 30 days 400, 60 days 800, 100 days 1500 (they use your best run, so they stay earned when a streak ends and a rebuilt streak cannot earn the same bonus twice; any check-in keeps a streak alive). Workouts still in progress earn nothing yet. **The curve is fast at the start**: going from level n to n + 1 costs 12 + n XP, so total XP for level L is (L - 1)(L + 24) / 2. Level 2 at 13 XP (one check-in), 5 at 58, 10 at 153, 25 at 588, 50 at 1,813, 100 at 6,138, 200 at 22,300, 1,000 at 511,000. A regular 4 day a week trainer earns about 420 XP a week, so level 50 comes in about a month and level 100 in about 3 months. Leaderboards (local by the country in Settings, and global) are not built yet. They will need XP stored per user so it can be ranked across users, and a decision on what is public |
| Ranks and badges | 13 ranks, each with its own badge: Warm-Up (level 1), Iron Rookie (5), Plate Mover (12), Rep Machine (25), Barbell Knight (40), Beast Mode (60), Iron Titan (80), Gym Legend (100), Hall of Famer (150), Mythic Lifter (250), Iron Immortal (400), Titan of Iron (700, animated) and God of Gains (1000, animated). The ladder is data in `src/lib/ranks.ts` (name, first level, colors, frame, symbol, one-line tagline), so renaming or recoloring a rank is one edit. Badges are inline SVG (`src/components/rank-badge.tsx`, frames ring, shield, winged and crowned, with a symbol such as a plate, dumbbell, flame or crown), so they stay sharp at any size and need no image files. The level page shows every rank, in color but muted with a lock for ranks not reached yet, with the level and the XP still needed. The animated badges pulse unless the system asks for reduced motion |
| XP pop-ups | When something you do earns XP, a small card slides up (bottom right on desktop, above the tab bar on phones): "+20 XP", what earned it ("Gym check-ins +20", at most three, then "and N more"), and a mini level bar that fills. A level up fills the bar, flashes "Level up 8 to 9" and fills the new level; a new rank also shows the badge and the rank name. It disappears by itself after 3.5 seconds (5.5 for a level or rank up), a tap dismisses it, and it never blocks anything: no sound, no full screen overlay. Quick actions merge into the one pop-up instead of queueing. Nothing shows when XP goes down (a delete) or on a page load. With reduced motion asked for, the bar and text appear without movement. It can be turned off in Settings ("XP pop-ups", kept on this device). How it works: XP is computed from your data, so there is no earning event to listen to. After a successful write to a route that can change XP (`/api/checkins`, `weights`, `measurements`, `photos`, a workout's `sets` or `finish` or its deletion) `apiRequest` fires a browser event (`src/lib/api-client.ts`), `XpWatcher` in the app layout waits 800 ms, asks `GET /api/xp`, and compares with the XP it saw last (kept in local storage), see `src/lib/xp-diff.ts` and `src/components/xp-watcher.tsx` |
| XP boosters | Two kinds, both doubling the XP of the days they cover (never stacking, a day is x2 or x1). **Welcome boost**: automatic, the first 7 days after your first logged activity (a check-in, weigh-in, measurement, photo or workout) count double, worked out from the data, nothing stored. **Double XP Day boosters**: earned by training and kept until you pick a day. Earned: 1 for your first finished workout, 1 more for every 5 finished workouts, and for streaks 1 at 7 days, 1 at 14 days and 2 at 30 days (`BOOSTER_RULES` in `src/lib/boosters.ts`). Using one on a day (today, or up to 7 days ahead, never the past) doubles everything earned on that day: check-ins, weigh-ins, measurements, photos, and workouts and sets by the workout's date. Streak milestone bonuses are never doubled. Earned boosters are computed from your activity, only used ones are stored (`xp_boosts`, one row per boosted day, readable and insertable but not editable or deletable by the user). The dashboard hero shows "x2 XP today" (with the welcome days left) and "N boosters ready"; the level page has a Boosters panel (ready, earned, used, "Use a booster today" or tomorrow, boosted days, how to earn) and the XP table shows how much of each source came from boosts; the XP pop-up shows an "x2" tag. Limits: a day already doubled by the welcome boost or a booster refuses a second one (it would be wasted). If the `xp_boosts` table does not exist yet the app still loads, with no boosters used. Honest caveat for later: because the app trusts the signed-in user's own rows, someone could add `xp_boosts` rows directly through the database API; that is harmless while XP is private, but leaderboards will need XP and boosters computed and checked on the server side only |
| Daily and weekly quests | Two cards on the dashboard under "1. Check in" and "2. Start training": **Daily quests** (3) and **Weekly quests** (3, Monday to Sunday, with the days left), each with a checkbox, a progress bar ("15 / 60"), a hint and its XP. Finishing all three of a day gives a bonus of 7 XP, all three of a week 30 XP. There is nothing to claim: like XP, quests are worked out from what you have logged, a quest is done when the day's or week's data reaches its target, and its XP is part of your total (so it shows in the XP pop-up as "Quests" and on the level page, and is doubled on a boosted day). Nothing is stored and no migration is needed. Which quests appear is a fixed function of the date, so a past day always had the same quests: the daily check-in is always first (3 XP), plus two from the pool, and the week gets three from its pool, never two of the same kind (for example train 3 and train 4 days). Daily pool: log 10 sets (5), log 20 sets (8), finish a workout (8), weigh in (4), log how you feel (4, mood, energy and sleep), train 3 muscle groups (6). Weekly pool: train 3 days (25), train 4 days (35), finish 3 workouts (25), log 60 sets (25), train 6 muscle groups (25), check in 5 days (15), weigh in twice (12), log measurements (12), log how you feel 3 times (12). A weekly quest pays on the day its running total reached the target. Sets count by their workout's date, a workout counts when it is finished with at least 3 sets, and muscle groups are the primary muscles of the exercises done. Quests earn XP only for days from 28 Oct 2026 on (`QUEST_START_DATE` in `src/lib/quests.ts`), so past days are not turned into XP after the fact. Logic in `src/lib/quests.ts`, shared with `computeXp`; the cards are `dashboard/components/quests-panel.tsx` |
| Leaderboard | Page `/leaderboard` (desktop sidebar, and a "Leaderboard" link in the dashboard level card for phones). **Opt in**: nobody is listed until they join with a nickname (3 to 20 characters, letters, numbers, spaces, dots, dashes and underscores, so never an email or markup, unique ignoring case, a few reserved names such as admin). What others see: nickname, country, level, rank badge and XP. Never a name, email, photo, weight, workout or location. Leaving deletes the entry. **Four views**, chosen in the address (`?scope=global|country&period=all|week`): Global or My country (from the country in Settings, with a prompt to set one), and All time or This week (Monday to Sunday, starts again every Monday). Top 50 per view, your own row highlighted and pinned under the list with your position when you are further down. Ties go to whoever reached the score first, then the name. **How scores are made**: XP is computed on the server from your own data, never taken from the browser. A small public table (`leaderboard_entries`) holds one row per joined user, and only the server can write it, with the service role key (`createAdminClient`, the only place that key is used); signed-in users can only read it. The score is refreshed when you open the page and after every XP change (the XP pop-up watcher calls `POST /api/leaderboard/sync`, at most once every 10 seconds). **Sanity limits** (`src/lib/leaderboard.ts`): one day counts at most 400 XP on the board (a very full boosted day is about 300), the weekly board counts only the XP dated inside the week (streak milestone bonuses count in all time only), and boosters used beyond the number earned are ignored everywhere (`loadLevel`), so rows added to the booster table by hand do nothing. **Known limit of this version**: your check-ins, weights and workouts are your own rows, and the database lets you write your own rows directly with the public key, bypassing our API rules (for example the gym location check). Someone determined could therefore fake XP. The board is fair among people who play honestly, which is fine for friends and a small community; a stricter version should route all writes through the server. Demo mode shows 15 clearly fake sample players. Needs migration `20261028000400_leaderboard.sql` and `SUPABASE_SERVICE_ROLE_KEY` in the environment (server only, never `NEXT_PUBLIC_`). Logic in `src/lib/leaderboard.ts`, `leaderboard-board.ts`, `leaderboard-sync.ts` |
| Progressive unlocks and the getting started guide | The app shows itself in steps so a new user is not overwhelmed. Unlocks are decided by level (`FEATURES` in `src/lib/unlocks.ts`, one table to tune): the focus plan, paced for about **a week of dedicated training (five days a week) and about two weeks of lighter training (three days a week)**: level 1 is only the dashboard (check-in and the level card), workouts and settings; Body opens at level 4 (42 XP, about the first workout); quests, quest chests and boosters at 10 (153 XP); Schedule, the status window and Membership at 14 (247 XP); the leaderboard, titles, Profile and Collection at 18 (357 XP); Rank trials at 22 (483 XP, before the first trial can hold the level at 24); weekly gates at 26 (625 XP); muscle levels at 33 (912 XP, the last). Every page follows its level (one `FeatureGate` in `src/components/feature-gate.tsx`, the nav and the phone tab bar, the dashboard cards and the Settings sections), and the getting started step "Log your weight" says when it opens. The pace assumes a dedicated day is about 95 XP (check-in, workout, 12 sets, weigh-in, quests) and the welcome boost doubles the first 7 days, so a dedicated user opens everything in about 5 to 7 days and a lighter one in about two weeks. Past level 25 the level only moves once the rank trial is cleared, which a user who trains weekly clears at once. To make the phase longer or shorter, move the levels in `FEATURES`; a test keeps the last unlock between 800 and 1,000 XP and every step at least 90 XP apart. The dashboard always shows one "Next unlock" card (what, at which level, how many XP away), never the whole list. The sidebar hides locked pages, and a locked page shows a teaser instead of an error. Accounts already past a level keep everything. **Show all features** in Settings opens everything at once (a cookie, `ml_show_all`). **Getting started** replaces the old welcome text: four steps that tick themselves from what you did (check in, log your first set, finish your first workout with at least 3 sets, log your weight), and finishing them earns one XP booster. **Welcome slides**: three skippable slides the first time an account with no workouts opens the dashboard, once per device. **One-time tips** (`SystemTip`) appear when a feature is first shown and are remembered per device. **How it works** page at `/guide`: six short cards plus the unlock table, linked from the level card. The menu reads the level from a cookie (`ml_level`) that the XP watcher keeps up to date, so building the menu costs no database work, and it only decides what to show: each locked page checks the real level on the server. The unlock table already lists features that arrive in later steps (status, gates, muscle levels, trials); until they exist they cannot be reached |
| Sera, the guide | A mascot, a girl named Sera, in the corner of every page. A round avatar opens a chat; when she has something to say a short speech bubble types out beside her. It is a **scripted guide**, not an AI: written dialogue with tap-to-reply buttons, no API key, no cost, nothing unexpected. She knows only counts and flags (your level, what is locked and when it opens, today's check-in and workout, chests waiting, quests done, streak, days away), built on the server and never containing weight, photos, places or notes. Topics: what should I do next (worked out from your day), how XP works, what is locked, about this page, show me everything now, be quiet for today, turn Sera off. She speaks up on her own only at key moments: a first welcome with a short tour (an existing user gets one quiet hello), a new rank, a new unlock, a locked page, the first finished workout, a waiting chest, coming back after 3 days, and a gentle check-in nudge for newer users. Each moment is told once, at most 3 a day, never while a workout is being logged (she is hidden on those pages), never while the chat is open, and never in Quiet or Off. What she has told you is remembered on this device only (`localStorage`); **Settings, Sera, your guide** has Normal, Quiet and Off. She is an original character drawn as inline SVG in the System palette: silver blue hair in a bob with side swept bangs and one long lock, a slim headset with a glowing earpiece, and a fitted dark high collar jacket with cyan piping and a small rank pin, with a natural body (sloped shoulders, a clear waist, hips, tapered arms with elbows and cuffs, slim hands; the body lives in `sera-body.tsx` and the colors in `sera-palette.ts`). One drawing gives all nine moods (calm, happy, cheer, thinking, surprised, sleepy, smug, flustered, annoyed) by swapping the eyes, brows, mouth, blush and extras (a sweat drop, a sparkle), and her eight poses (idle, wave, point, cheer, smug, crossed, taunt, hairflip) use four arm drawings: smug and crossed stand like idle, taunt points, hairflip waves. She blinks, breathes, sways her long lock and moves her mouth while she talks, all CSS and off for reduced motion. A quirk (her tongue, a puffed cheek, a turn of the head, a flip of her lock) is a prop of the drawing. The art was tried in other styles (a twin tail anime girl, painted sprites, 3D); this first drawing is the one kept, and the others live in the git history. **She stands up in full** (the whole body, above the buttons, with a gold halo) for the three rarest moments only: the first welcome, a new rank (crossing into a rank such as Iron Rookie or Plate Mover, with a mention of what it opened, `rank:<id>` in her memory), and a 30 day streak. Every other appearance stays waist up, and a short landscape screen falls back to waist up. The chat is a labelled, non-modal dialog with a live log, Escape closes it, and typing is skipped with reduced motion. **Her personality** is a smug tsundere, written in `script.ts`, `beats.ts`, `suggest.ts`, `pages.ts` and the tour texts (English for now; every line lives in those data modules, so a later multi-language feature only has to swap them): arrogant and competitive, prideful about caring ("it is not like I was worried"), sarcastic about a lazy day ("so we are deciding to be gym decor today?"), and quietly supportive when you do well, with short honest praise. Rules: she always gives the real information, she teases the situation and never the person, and she never mocks your body, effort or ability; a test reads every line she can say and fails on insults, em dashes or franchise names. **Quirks**: now and then, while she is idle, she sticks her tongue out, puffs a cheek, flips her hair or turns away with a "hmph" (`src/lib/mascot/quirks.ts`, `use-quirk.ts`); five fast taps on her avatar annoy her ("Stop poking me!"). Code: `src/lib/mascot/` (pure and tested: context, suggest, script, triggers, state, quirks), `src/components/mascot/`, her drawing in `sera-art.tsx` (it also takes an `src` for your own picture), and a dev only sheet at `/dev/sera` in demo mode that shows every mood, pose and quirk, her full body in slim trousers and ankle boots (`view="full"`) and the appearances and tours to play. For looking at the new user experience in demo mode, start the dev server with `NEXT_PUBLIC_DEMO_MODE=true NEXT_PUBLIC_DEMO_FRESH=1` (a brand new demo account) |
| Confirmations | Important actions ask one more time in a popup (`src/components/confirm-dialog.tsx`, on top of the shadcn alert dialog in `src/components/ui/alert-dialog.tsx`; never a browser `confirm`). It covers finishing a workout, deleting a workout, a set, a custom exercise, a weigh-in, a progress or entry photo, a membership, clearing the gym pin, leaving the leaderboard, deleting your profile, signing out, and spending a Double XP booster. The action runs only after you press the confirm button; Cancel, Escape and a tap outside do nothing, and a second tap is ignored while it works. Low risk or undoable things (equipping an item, opening a chest, starting a workout, Sera's mode) do not ask. Test in `tests/unit/confirm-dialog.test.tsx` |
| Sera, big appearances and guided tours | For the moments that matter she is not a corner button but **big on the screen**, waist up, over a dimmed page (a phone first layout: she stands at the bottom edge about half the screen high, her words in a card above her head typed out a beat at a time, large buttons under the thumb; on a wide screen she stands bottom right with the card beside her; a short landscape phone gets a compact version). Moments, most important first: the first-ever **welcome** (wave, offers the tour), a **feature unlocked** (cheer, "Show me" goes to the new page and starts its tour; it waits until the level up screen has closed), a **gate boss defeated** (cheer, golden glow, the boss, the rank and the reward, once per week's boss), the **first workout**, **streaks of 7, 14 and 30 days** (once per streak), **welcome back** after 3 days away, and last the **daily hello** (the first visit of each day, one or two beats about today, closes itself after a few seconds, tap to dismiss). At most 2 big appearances a day (the daily hello counts), never on a workout page, never in Quiet or Off, and the daily hello only when nothing bigger has appeared. Small things stay speech bubbles (a waiting chest, the check-in nudge, a locked page, a tour offer), at most 3 a day. **Guided tours** dim the page, cut out one area with a glowing frame, and explain it in two plain sentences with a step counter (3 / 7), Back, Next, Done and a close button; on a phone the card is a bottom sheet with Sera's hand peeking over its edge (at the top when the area itself is low on the screen), the page scrolls the area into view and the frame follows, an area missing today (a locked or empty card) is skipped, arrow keys and Escape work, and the page behind cannot be tapped. There is a tour for the dashboard, Workouts, Body, Schedule, Status, Collection, Leaderboard, Profile and Membership. A tour starts from her welcome, from an unlock, from her menu (**Show me around this page**, always there) and from an offer: the first time you open a page with a tour a bubble asks "Want a quick tour of this page?" once; a finished, skipped or declined tour is not offered again (remembered on this device). Tours are data in `src/lib/mascot/tours.ts` (each step names a `data-tour` area, a title, a text and a pose); the stages are in `src/lib/mascot/beats.ts`; a test reads the page source and fails if a tour names an area that no page marks. Each big appearance names a mood and a pose. In demo mode `/dev/sera` has buttons to play every stage and tour |
| System look and level-up screen | The cards that speak as the game (the level card, getting started, next unlock, daily and weekly quests) use the **System window** style: a thin glowing frame with corner brackets and a faint blue glass background (`system-window` in `globals.css`, `Panel variant="system"`). Their words follow one tone, short bracketed capitals such as "QUEST COMPLETE", "ALL QUESTS COMPLETE" and "[SYSTEM] Quests unlocked", kept in one file, `src/lib/system-voice.ts`. **Level-up screen** (`src/components/level-up-screen.tsx`): for a moment worth more than a small pop-up, meaning 3 or more levels at once, a new rank, or something unlocking, a card in the middle of a dimmed screen shows the badge, the new level, the new rank and what unlocked (at most three, then "and N more") with the XP gained. It closes with a tap, Escape or the Continue button, or by itself after 5 seconds (8 when something unlocked), scrolls on a short phone screen, never plays sound, and just appears when reduced motion is asked for. Smaller gains keep the small pop-up. The rule is `isBigMoment` in `src/lib/xp-diff.ts`. Can be turned off in Settings ("Full screen for big level ups, new ranks and unlocks", kept on this device) |
| Status window | Page `/status`, opens at level 14 (sidebar item, link in the level card). Shows your **rank letter**, from E to SSS (Warm-Up is E, Iron Rookie and Plate Mover D, Rep Machine and Barbell Knight C, Beast Mode and Iron Titan B, Gym Legend and Hall of Famer A, Mythic Lifter and Iron Immortal S, Titan of Iron SS, God of Gains SSS; `letter` in `src/lib/ranks.ts`), level and XP, and **five stats** with a bar, a number, a line on what raises it and the numbers behind it, plus a radar chart of the shape. The stats grow by themselves from what you logged, nothing is spent: **Strength** (total volume lifted), **Endurance** (sets and finished workout minutes), **Vitality** (check-ins and your best streak), **Agility** (different muscles, 4 points each, and different exercises, 1.5 each up to 40) and **Discipline** (training days and finished quests). Strength, Endurance, Vitality and Discipline use a logarithmic curve, `10 x log2(1 + x)`, so the first workouts move a stat a lot and later gains take more, but nobody runs off the chart. The bars use a ceiling a little above your best stat, so the shape is readable. Logic in `src/lib/stats.ts` (pure, tested), page in `src/app/(app)/status/`. Not built yet: a status card in the share dialog |
| Weekly gates and bosses | Dashboard card, opens at level 26. Every Monday a gate opens (rank E to S, a name such as "Gate of Iron", a boss such as "Rep Wraith") with an HP bar. Every set you log that week deals its volume (weight times reps) as damage, a bodyweight rep counts 20. Clear the boss before Sunday ends for XP (E 15, D 25, C 40, B 60, A 90, S 130, dated on the day it fell, so a boosted day doubles it) and, for A and S gates, one XP booster. Nothing to claim, nothing stored. Which gate appears is fixed by the week; its HP is your recent weekly damage (average of the last 4 trained weeks, at least 2,500) times the rank's multiplier (0.6 to 2.0), so it is fair for a beginner and a veteran, and a newcomer only meets E and D gates until they have trained for a few weeks. Counts from the week of 26 Oct 2026 (`GATE_START_DATE`). Logic in `src/lib/gates.ts`, card in `dashboard/components/gate-panel.tsx` |
| Muscle levels | Every one of the 16 muscles has its own level, shown on the Status page (opens at level 33), most trained first, with a bar and "N more sets to level X". A primary set counts 1 and a secondary set 0.5, as in the heatmap. Level L needs 2 x (L - 1) squared weighted sets (level 2 at 2, 3 at 8, 5 at 32, 10 at 162). Worked out from the sets, nothing stored. `src/lib/muscle-levels.ts` |
| Titles | Milestone titles, shown on the Status page (opens at level 18) and next to your nickname on the leaderboard: First Steps (finish the guide), Quest Runner (50 quests), Iron Regular (50 workouts), Unbroken (30 day streak), Gate Breaker (5 gates), Well Rounded (all 16 muscles), Heavy Lifter (100,000 kg), Centurion (level 100), Living Legend (level 250). The most prestigious earned one is worn. Worked out from your data, the leaderboard copy is written by the server when your score syncs (`title` column, migration `20261029000000_rank_trials_titles.sql`; until it runs, the rest of the score still saves). `src/lib/titles.ts` |
| Rank trials | From the Rep Machine rank (level 25) up, reaching a rank's level is not enough: you first clear a trial, finishing 3 to 6 workouts (3 for Rep Machine, more for higher ranks, at most 6) within 7 to 10 days. Until then the level stops one level short of the rank, with the bar one XP short of full, and your XP keeps counting. A banner on the level card says "Trial available" with your best so far. Clearing a trial is remembered forever in `rank_trials` (written by the server only, owner can read), so it can never be taken back. A trial is checked against all your finished workouts, so a veteran clears it straight away. Before the table exists nobody is held back. `src/lib/trials.ts` |
| Comeback quest | After a day with no daily quest finished, the next day shows one extra, easy quest ("Comeback": log 5 sets, 8 XP) at the top of the daily quests. It is not part of the daily bonus. No XP is ever taken away: this is the soft version of a penalty. It only counts for days from 28 Oct 2026 on, and for accounts that already existed the day before. It can be turned off in Settings ("Offer an easy comeback quest after a quiet day", a cookie, `ml_no_recovery`); off means it neither shows nor pays. `RECOVERY_QUEST` in `src/lib/quests.ts` |
| Quest chests | Finish all 3 quests of a day for a daily chest, all 3 of a week for a weekly chest (they open at level 10 with quests, and count for days from 29 Oct 2026 on). A chest holds one random cosmetic item with a grade: Common, Rare, Epic or Legendary. Daily odds are 62, 27, 9 and 2 percent, weekly odds 30, 42, 20 and 8, so a weekly chest is clearly better for rare items. Bad luck ends: after 10 daily chests below Rare, or 3 weekly chests below Epic, the next chest is owed a good item (worked out from the opened chests). A chest never gives an item you own while one of its grade is missing; once you own a whole grade, a repeat pays XP instead (Common 3, Rare 6, Epic 12, Legendary 25, counted as the source `chests`). A daily chest can be opened for 7 days after it was earned and a weekly chest for 14, then it ran out. Chests are earned from the quest data like XP and nothing is stored until one is opened. The opening is decided on the server (`POST /api/chests/open`: it re-derives the chest, refuses one that is not earned, ran out or is already open, rolls with a secure random source and saves the result; the chest id is part of the primary key, so a chest cannot be opened twice even in a race). Rules: `src/lib/chests.ts`, `src/lib/items.ts` |
| Items and the Collection page | 21 cosmetic items in four slots, each worn one at a time: badge frame (a decoration around your rank badge, 5), aura (the glow color of your level number and XP bar, 7), nameplate (a word shown next to your nickname on the leaderboard and on Status, 7) and share look (two extra looks for share images, Ember and Aurora, 2). Items never change how much XP you earn. The Collection page (`/collection`, opens at level 5) shows the chests waiting, what is worn, every item by grade (found ones lit, the rest as "?"), Equip buttons, the odds and the last chests opened. Equipping goes through `PUT /api/equipment`, which refuses an item you do not own. Only the word of a nameplate is public, never which item it was (`plate` column on `leaderboard_entries`). |
| The chest opening | A full screen moment in the System style: the chest rises, a tap starts it, it shakes while the server rolls (about 0.8 seconds), the lid hops open with a beam and one ring in the color of what you won (the light runs through the lower grades for a moment and settles on the real one), and the item card turns up out of the chest. One burst of small shards for Rare (10), Epic (18) and Legendary (30), none for Common, and Legendary gets a slower reveal and a faint gold edge. It plays once, has no sound, loops nothing and never starts by itself. A tap anywhere skips to the result, Escape closes it, "Open chests quickly" in Settings (cookie `ml_quick_chests`) or a system setting for less motion turns it into a short fade, and the result is read out to screen readers. All motion is CSS (`src/app/globals.css`, `chest-*`), the chest is inline SVG, and the code is in `src/components/chest/`. |
| Item art and previews | Every item has real visuals, not just text. **Grade cards** wear their grade: Common is flat, Rare has an inner glow and corner pips, Epic has a gradient edge with corner brackets, Legendary has a double gold edge with a glowing gem, and every card shows 1 to 4 diamonds for its grade. **Icons**: each item has a Phosphor duotone icon in a medal tinted with its grade colour. **Auras** are layered art drawn around your badge: a soft halo (Mint, Sand), thin rings (Rose, Violet), ice crystals (Frost), a gold ring with twinkling sparks (Gilded) and radiant rays (Sovereign); they only move where they are shown large (level card, Status, profile, preview). **Nameplates** are dressed by grade (plain chip, bracketed glow, gradient edge, gold crest with notched corners), also on the leaderboard, where the word finds its item. **Share looks** are drawn as real thumbnails with the share renderer and a made up workout. **Live preview**: on the Collection page, Preview tries an item on a card showing you (badge with frame inside its aura, name with nameplate, title, level, share look) without saving, "Equip what I am previewing" saves it and Reset puts it back. Everything that moves is CSS and off for reduced motion. Code: `src/components/items/`, `src/lib/item-art.ts`, `.item-card`, `.aura` and `.nameplate` in `src/app/globals.css`. For looking at every item in demo mode, start the dev server with `NEXT_PUBLIC_DEMO_MODE=true NEXT_PUBLIC_DEMO_ITEMS=all` (the demo user then owns all 21; ignored outside demo mode) |
| Player profiles | Every user can make a profile in Settings (the "Profile" section, `/settings#profile`): a username (the address, `/u/<username>`, 3 to 20 lowercase letters, digits and underscores, unique, a few names are kept), a display name (unique, the same name as on the leaderboard), a bio (one line, up to 160 characters, plain text) and who can open it. A profile starts **private**. The other choice is **signed-in users**: any user with an account can open it, it is never on the open internet, never in a sitemap and always `noindex`. The page (`/u/<username>`, `/profile` takes you to your own) shows a header with your rank badge and frame, display name, nameplate, title, level with your aura and bio, then the sections: stats with the radar, collection (items by grade, worn ones marked), titles, activity (finished workouts, longest streak, quests, gates, volume, training since) and muscle levels. Profiles are read only: no follows, comments or messages. The username check in the form is rate limited so it cannot be used to list names. Code: `src/lib/profile.ts` (rules and the visibility filter), `src/app/(app)/u/[username]/`, `src/app/(app)/settings/components/profile-form.tsx`, `/api/profile`, `/api/profile/check` |
| Profile privacy | A switch for each section: rank and level, stats, collection, titles, muscle levels and activity. A section that is switched off is **not sent to the browser at all**: the server cuts the profile down to what the viewer may see (`toPublicProfile`) before the page is rendered. What a profile shows comes from a snapshot the server works out from your own data and stores in `player_profiles.snapshot` (kept fresh when you open your profile, when you save it, and after your XP changes). It is never taken from the request. Never shown, whatever you choose: weight and measurements, progress photos, gym, location and membership, check-ins, moods and notes, email. A private profile and a profile that does not exist look exactly the same to other users, so nobody can find out who has one. Only the owner can read their row directly; every other read goes through the server with the service role. On the leaderboard, a row links to a profile only when that profile is open to other users. |
| Check in at the gym | Only a Gym check-in needs your phone to be at the gym. The check-in form watches the browser's location for up to 10 seconds and keeps the most precise reading (indoors a phone first gives a coarse cell or Wi-Fi guess and the GPS fix comes later; it stops early at 50 m or better and shows the accuracy while it waits), sends that with the check-in, and the server compares it with the gym pinned on the Membership page (newest membership). It must be within 200 m (`GYM_RADIUS_METERS`). The device's reported error is forgiven up to 300 m (`ACCURACY_ALLOWANCE_METERS`), so a poor fix inside the gym still counts, and only an accuracy worse than 1500 m is refused as too vague (the message then asks for Precise location in the browser). The Membership gym pin taken with "Use my location" also waits for the best reading and warns when it may be off by more than 100 m. Too far answers `403 { code: "location_required", reason: "too_far", distance_meters }` and says how far you are. Other reasons: `no_position` (location blocked), `inaccurate`, `no_gym_location` (no pin on the gym, the form then links to Membership and the button is off). A Home workout or a Rest day needs no location. A day that is already a gym check-in can be edited (mood, sleep) from anywhere, and changing a home or rest day to Gym checks again. The position is used for the check and never stored. Limitation: the position comes from the browser, so someone who fakes it can pass; this stops honest mistakes and casual cheating, not a determined one. Logic in `src/lib/gym-location.ts`, browser part in `src/lib/browser-location.ts`, the kinds in `src/lib/checkin-kind.ts` |
| Rest timer and set times | Every logged set records when it was completed (`completed_at`). The Log a set panel shows a Rest timer that counts up from the last set of the workout and starts again from 0:00 after each new set. It turns to the accent color and says "Ready for the next set" after 90 seconds (`REST_TARGET_SECONDS` in `src/lib/workout.ts`). The logged sets list shows, for each set, how far into the workout it was done (for example 02:31 for a set finished two minutes and 31 seconds after the workout started, not the clock time) and the rest taken before it, for example "rest 01:30". Sets logged before this existed have their workout's start time, so they show neither. Needs migration `20261028000100_set_timestamps.sql` |
| Workout sessions | Start (only one in progress at a time), live elapsed timer, finish (duration in minutes is computed automatically, minimum 1), delete with confirmation |
| Fast set logging | Exercise picker grouped by muscle, chips to switch between exercises already in the workout, big minus/plus steppers (1 rep, 2.5 kg), reps and weight prefilled from the last set of that exercise (this workout first, then history), inputs stay after logging so a repeat set is one tap |
| Live muscle map during a workout | The workout page has a Muscle map panel under the set logger that shows just the body: front and back figures, colored by the week's total (this workout included), with the muscles this workout has worked outlined in the accent color. It updates after every logged set. A screen reader gets a text list of what was worked and what is still untrained this week. Finished workouts show the same figures as "Muscles trained" (`src/app/(app)/workouts/components/workout-muscle-map.tsx`). The dashboard no longer has a muscle map panel |
| Workout history | List of finished workouts with duration, set count and volume; detail page with sets grouped by exercise |
| Weekly summary | Dashboard: workouts (compared with last week) and total volume for the current Monday to Sunday week, plus a volume bar per day (`src/lib/week.ts`). Volume has a hint: weight x reps, all sets |
| Next workout suggestion | Dashboard: suggests push, pull or legs, whichever has waited longest (never trained counts as longest, ties go push, pull, legs), with up to 5 exercises (at most 2 per muscle), favouring the ones used most. Shows a resume link and timer instead while a workout is in progress (`src/lib/suggestion.ts`) |
| Dashboard layout | The level comes first: a hero card with your rank badge, level, XP bar, the XP to the next level and the next rank (`dashboard/components/level-hero.tsx`). Under it, "1. Check in" and "2. Start training" side by side (check-in first, because it unlocks starting). Below, once at least one workout exists: the weekly summary and two small cards, body weight and membership. A new account sees the hero, a short Welcome guide and the two top cards (`dashboard/components/dashboard-content.tsx`) |
| Muscle intensity scoring | `src/lib/muscle-intensity.ts`: weighted sets per muscle (primary 1.0, secondary 0.5) for the current Monday to Sunday week and for all time. Thresholds, labels and hint text live in one `INTENSITY_CONFIG` object. Weekly: 1 to 5 light (green), 6 to 12 moderate (yellow), 13 or more heavy (red). Overall: relative to the user's most trained muscle (up to 33% light, up to 66% moderate, above heavy) |
| Body heatmap | Body page: Weekly and Overall toggle, Front, Back and 3D views, legend, tap a muscle (or choose it from the list of all 16) to see weekly sets, all time sets, days since last trained, top exercises for the period and suggested exercises |
| Progress photos | `/body/progress`: upload JPEG, PNG or WebP (up to 5 MB, 100 per user) with a date and pose (front, side, back), gallery with pose filter and two step delete. Photos are private: no public URL, every file request is authenticated and scoped to the owner |
| Photo comparison | Pick a pose and two dates and see the photos side by side with the time between them, the weight change and each body measurement change, using the nearest entries on or before each date (`src/lib/progress.ts`). A metric is only shown when two different entries exist |
| Body measurements | Chest, waist, hips, arm, thigh and body fat. One entry per date (saving again replaces it), history table with the change since the previous entry for each metric |
| Weekly commitments | Schedule page: recurring classes and other commitments per weekday (Monday first), add and remove. A weekly calendar (Monday to Sunday, 06:00 to 22:00, widened to fit any commitment outside those hours) works like Google Calendar: drag down a day to select the hours (snaps to 15 minutes), or tap or click for a one hour slot, then name it in a dialog where the times can still be adjusted. Click or tap a block to remove it. On touch screens the page keeps scrolling, so a tap picks one hour there. The "Add with exact times" form stays below the calendar for keyboard use. The blocks are buttons, so they can be opened and removed with the keyboard too. Logic in `src/lib/week-grid.ts`, component in `src/app/(app)/schedule/components/week-calendar.tsx`. Weekday numbers follow `Date#getDay`: 0 = Sunday ... 6 = Saturday. Times are `HH:MM` on a 24 hour clock |
| Best time to train | Schedule page (`src/lib/scheduling.ts`): top 3 days in the next week, one best slot each. A slot must fit between 06:00 and 22:00, start at least 15 minutes from now, and stay 30 minutes clear of every commitment. Slot length is the median of your finished workouts, rounded up to 15 minutes (60 minutes with no history). Score: closeness to the times you trained on that weekday (up to 3) and on any weekday (up to 2), plus rest (+1 well rested, -1 trained the day before, -2 already trained that day) and -3 once 4 workouts are done that week. Each suggestion lists its reasons. All numbers are in the `SCHEDULING` constant |
| Under-trained recommendations (not shown) | The Schedule page panel was removed for now. The logic is kept in `src/lib/recommendations.ts` with its tests, but nothing in the interface uses it. It would list: muscles that are untrained or light this week (same scoring as the heatmap), fewest weekly sets first, then longest since last trained. Shows how many more sets reach a moderate level and which exercises to try, favouring ones you use |
| Settings | Settings page (`/settings`): country (optional, for local rankings later), weight unit (kg or lb) and default currency (IDR or USD). Defaults for a new user: no country, kg, IDR. Saved with `PUT /api/settings`. Needs migration `20261028000000_user_settings.sql` |
| Weight unit (kg or lb) | Weights are always stored in kilograms. The unit only changes display and input: body weight (form, stats, chart, history, diary), set logging (the weight box, its step of 2.5 kg or 5 lb, and the logged sets), volume everywhere, and the weight change in photo comparison. Typed pounds are converted to kilograms rounded to 2 decimals, so switching units never loses data. Helpers in `src/lib/units.ts` |
| Currency | Each membership price has its own currency (IDR or USD), preselected from Settings for new memberships. Prices are never converted, so changing the default does not change saved prices. The price is shown on the Membership page (`formatPrice` in `src/lib/currency.ts`) |
| Pages | All pages are functional: landing, login, dashboard, workouts (list, detail, library), body (heatmap, weight), body progress, membership, schedule, settings |
| Phases 2 to 7 | Not started |

Deviations from the planned structure: authenticated pages live in the `src/app/(app)/` route group so they share one layout with the navigation. URLs are unchanged (`/dashboard`, `/workouts`, and so on). The fifth tab is called Membership on mobile and desktop.

### Route protection

`src/proxy.ts` refreshes the Supabase session on every matched request. Anonymous users are redirected to `/login` for `/dashboard`, `/workouts`, `/body`, `/membership`, `/schedule`. Anonymous calls to `/api/*` get `401` JSON, except `/api/auth/*`. Signed in users visiting `/login` are sent to `/dashboard`. The check is optimistic; API routes re-verify the user with `requireUser()` in `src/lib/auth.ts`. Protected prefixes live in `src/lib/site.ts`.

## 15. API Reference

| Route | Method | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| `/api/auth/login` | POST | `{ email, password }` | `{ ok: true }` or `{ error }` (400, 401, 429) | Rate limited: 5 per minute per IP |
| `/api/auth/signup` | POST | `{ email, password }` | `{ ok: true, needsConfirmation }` or `{ error }` | Rate limited: 3 per minute per IP |
| `/api/auth/logout` | POST | none | `{ ok: true }` | Clears the session cookies |

| `/api/checkins` | GET | none | `{ data: Checkin[] }` newest first | |
| `/api/checkins` | POST | `{ date, kind ("gym", "home" or "rest"), mood?, energy?, sleep_hours?, notes?, latitude?, longitude?, accuracy? }` | `{ data: Checkin }`, or `403 { error, code: "location_required", reason, distance_meters? }` | Upsert by date. 30 writes per minute per user. A gym check-in needs a position within 200 m of the pinned gym, see Check in at the gym. The position is not stored |
| `/api/checkins/[id]` | DELETE | none | `{ ok: true }` or 404 | |
| `/api/weights` | GET | none | `{ data: WeightLog[] }` newest first | |
| `/api/weights` | POST | `{ date, weight_kg (20 to 500), notes? }` | `201 { data }` | 30 writes per minute per user |
| `/api/weights/[id]` | PUT, DELETE | same body for PUT | `{ data }` or `{ ok: true }`, 404 if missing | |
| `/api/membership` | GET | none | `{ data: Membership[] }` newest end date first | |
| `/api/membership` | POST | `{ gym_name, location? (up to 120 characters), latitude? and longitude? (both or neither), start_date, end_date, price?, currency ("IDR" or "USD"), notes? }` | `201 { data }` | end_date must not precede start_date |
| `/api/settings` | GET | none | `{ data: { user_id, country, weight_unit, currency } }` | Defaults when nothing is saved yet |
| `/api/settings` | PUT | `{ country (ISO code or null), weight_unit ("kg" or "lb"), currency ("IDR" or "USD") }` | `200 { data }` | Replaces all three. Creates the row on first save |
| `/api/xp` | GET | none | `{ data: { userId, total, level, progress, rank, lines: [{ source, label, xp }] } }` | The user's XP, level (with 0 to 1 progress), rank and XP per source. Used by the XP pop-up to find what an action earned |
| `/api/boosts` | GET | none | `{ data: { earned, used, available, sources, usedDays, welcome: { start, end, active, daysLeft } or null, activeToday } }` | Boosters earned (from activity), used and available |
| `/api/boosts` | POST | `{ day }` (`YYYY-MM-DD`) | `201 { data: { id, day, ... } }`, `400` for a past day, more than 7 days ahead or bad input, `409 { code: "already_boosted" }` or `409 { code: "no_boosters" }` | Uses one Double XP Day booster. 10 writes per minute per user |
| `/api/leaderboard` | GET | query `scope` (`global` or `country`) and `period` (`all` or `week`) | `{ data: { scope, period, weekStart, country, joined, displayName, rows: [{ rank, display_name, country, level, xp, is_me }], me, problem } }`, or `400 { code: "no_country" }` for the country board without a country | Top 50 plus your position. No user ids in the rows. Brings your own score up to date first |
| `/api/leaderboard/profile` | PUT | `{ display_name }` | `200 { data: { display_name } }`, `400` for an invalid nickname, `409 { code: "name_taken" }` | Joins or renames. The score is computed on the server, anything else in the body is ignored. 10 writes per minute |
| `/api/leaderboard/profile` | DELETE | none | `200 { data: { left: true } }` | Leaves and deletes the entry |
| `/api/leaderboard/sync` | POST | none | `204`, or `429` | Recomputes your own score, `204` and no change if you have not joined. At most once every 10 seconds per user |
| `/api/membership/[id]` | PUT, DELETE | same body for PUT | `{ data }` or `{ ok: true }`, 404 if missing | |
| `/api/exercises` | GET | none | `{ data: Exercise[] }` built-ins plus own, by name | |
| `/api/exercises` | POST | `{ name, primary_muscle, secondary_muscles?, equipment? }` | `201 { data }` | Primary muscle is removed from the secondary list |
| `/api/exercises/[id]` | DELETE | none | `{ ok: true }`, 403 built-in, 409 used in a workout, 404 missing | |
| `/api/workouts` | GET | none | `{ data: WorkoutSession[] }` newest first | |
| `/api/workouts` | POST | optional `{ notes? }` | `201 { data, already_active: false }`, `200 { data, already_active: true }`, or `403 { error, code: "checkin_required", reason }` | Returns the in-progress workout instead of creating a second. A new workout needs today's check-in to say you went to the gym |
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
| `/api/availability` | GET | none | `{ data: AvailabilityBlock[] }` Monday first, then by start time | |
| `/api/availability` | POST | `{ weekday (0 to 6), start_time, end_time, label? }` | `201 { data }` | Times `HH:MM`, end after start, label up to 60 characters |
| `/api/availability/[id]` | PUT, DELETE | same body for PUT | `{ data }` or `{ ok: true }`, 404 if missing | |
| `/api/log-photos` | GET | optional query `kind` (`checkin` or `weight`) and `entry_id` | `{ data: LogPhoto[] }` metadata only, newest first | |
| `/api/log-photos` | POST | multipart: `file`, `kind`, `entry_id` | `201 { data }`, 400 not a JPEG, PNG or WebP (magic bytes, SVG rejected), 404 unknown entry, 409 more than 4 on the entry, 413 over 5 MB | 10 uploads per minute per user |
| `/api/log-photos/[id]` | DELETE | none | `{ ok: true }` or 404 | Removes the row and the file |
| `/api/log-photos/[id]/file` | GET | none | The image bytes, or 404 | Authenticated, same private headers as progress photos |

All routes above require a session (401 otherwise) and validate input with zod (400 on invalid input, 429 when rate limited). Dates are `YYYY-MM-DD`; check-in and weight dates cannot be in the future.

Password rules: 8 to 72 characters (`src/lib/validation/auth.ts`). The in-memory rate limiter (`src/lib/rate-limit.ts`) suits a single instance; use a shared store if scaled out.

## 15.1 Demo Mode and Data Layer

The app has two interchangeable data backends. All pages and API routes call the repositories in `src/lib/repositories/`; each file there is a thin dispatcher that picks a backend per call, and TypeScript checks that both have identical signatures.

- `memory/`: the in-memory dummy store (demo mode).
- `supabase/`: the real Postgres and Storage implementation, using the signed in user's session so Row Level Security applies. `supabase/db.ts` has the shared helpers (error checking, paging past Supabase's 1000 row response cap).
- `types.ts`: result types shared by both.
- Demo mode is on only when `NEXT_PUBLIC_DEMO_MODE=true` **and** the build is not production. Otherwise Supabase is used.

Demo mode details:

- Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` (dev only; it is ignored in production builds). `proxy.ts`, `requireUser()` and `getCurrentUserId()` then treat every visitor as one demo user, so login is skipped and a banner is shown.
- All data access goes through `src/lib/repositories/` (`checkins.ts`, `weights.ts`, `memberships.ts`). They read and write an in-memory store (`store.ts`, seeded with sample data, reset when the server restarts).
- To use Supabase instead, follow section 20.
- Business logic is pure and tested: `src/lib/streak.ts`, `src/lib/membership.ts`, `src/lib/weight.ts`, `src/lib/workout.ts` (duration, volume, set numbering, grouping, formatting).
- Dashboard panels (`src/app/(app)/dashboard/components/`) only read through the repositories, so they need no change when Supabase is connected. Each panel fetches its own data inside its own `Suspense`; if the extra queries matter later, wrap the repository reads in React `cache`.
- Repositories added in Phase 3: `exercises.ts` and `workouts.ts` (sessions and sets). The seeded demo history has three finished workouts.
- Scheduling (Phase 7): `availability_blocks` already has the right shape. Postgres `time` columns return `HH:MM:SS`, so trim to `HH:MM` in the repository (and accept `HH:MM` on write). Time of day for your usual training hours is read from each workout's `started_at` in the server's timezone. That is fine on a single user local setup, but on a host running in UTC it shifts hours. Before deploying, store the user's timezone (for example on `profiles`) and convert in `suggestSlots`.
- Check-in and weigh-in photos: `repositories/supabase/logPhotos.ts` uploads to `<user id>/log/<id>.<ext>` in the private bucket. Deleting a check-in or weigh-in first collects its file paths, because the rows cascade but storage objects do not, then removes the files after the entry is gone. Direct API uploads are not stripped of metadata (only the browser path is), because that needs an image library on the server.
- Photos (Phase 6): `repositories/photos.ts` keeps metadata and the bytes in memory under `<user id>/<photo id>.<ext>`, the same layout the private `progress-photos` bucket policy expects. With Supabase, upload to that bucket from the route handler (server side, after the same size and magic byte checks), keep `progress_photos` rows, and stream or sign short lived URLs in `/api/photos/[id]/file`. Never make the bucket public. The seeded demo photos are SVG placeholders, which is why `contentTypeForPath` knows `.svg`; real uploads can never be SVG.
- Extra migration work for Phase 3: built-in exercises currently use stable slug ids (`builtin-barbell-bench-press`). With Supabase, add a seed migration inserting `BUILT_IN_EXERCISES` as rows with `user_id` null and uuid ids, and change `exercise-library.ts` and the repositories to read them from the table. `workout_sets.exercise_id` references `exercises.id`, so the repository must write real ids.
- The unfinished workout is identified by `ended_at` being null. Add a partial unique index on `workout_sessions (user_id) where ended_at is null` in the migration to enforce one active workout in the database too.

Streak definition: consecutive days with any check-in (gym, home or rest day), since the habit being tracked is logging. It stays alive until the end of today if yesterday was logged.

## 16. Database Schema and Migrations

| Migration | Contents |
| --- | --- |
| `20261024000500_log_photos.sql` | `log_photos` table for check-in and weigh-in photos, with indexes and row level security that also checks the entry belongs to the same user |
| `20261028000000_user_settings.sql` | `user_settings` table (country, weight unit, currency) with row level security, and a `currency` column on `memberships` (existing prices become IDR) |
| `20261028000100_set_timestamps.sql` | `completed_at` on `workout_sets` (existing sets get their workout's start time) |
| `20261028000200_checkin_kind.sql` | `kind` on `daily_checkins` (`gym`, `home`, `rest`) replacing `went_to_gym`; existing yes becomes gym and no becomes rest, then the old column is dropped |
| `20261028000300_xp_boosts.sql` | `xp_boosts` table (one row per used Double XP Day booster, unique per user and day) with row level security that allows reading and adding your own rows only |
| `20261028000400_leaderboard.sql` | `leaderboard_entries` table (nickname, country, all time and weekly XP, level) readable by signed-in users and writable only by the server (no insert, update or delete policy), with a case-insensitive unique nickname and ranking indexes |
| `20261029000000_rank_trials_titles.sql` | `rank_trials` table (cleared trials, owner can read, only the server writes) and a `title` column on `leaderboard_entries` |
| `20261029000100_chests.sql` | `chest_openings` (opened chests, one row per chest, owner can read, only the server writes), `equipment` (the worn items, same rules) and a `plate` column on `leaderboard_entries` |
| `20261029000200_profiles.sql` | `player_profiles` table (not `profiles`, an older table of that name already exists and is left alone): username, display name, bio, visibility, section switches and the snapshot. Case blind unique indexes on username and display name. The owner can read their own row, only the server writes and reads the rest |
| `20261024000400_membership_coordinates.sql` | Adds optional `latitude` and `longitude` to `memberships` with range checks and a both-or-neither rule |
| `20261024000300_membership_location.sql` | Adds the optional `location` column to `memberships`. Both of these are safe to run twice (`if not exists`), so a project that already ran `setup.sql` just runs these two files |
| `20261024000200_integrity_and_exercise_seed.sql` | Unique indexes the Supabase repositories rely on (one in-progress workout per user, unique set numbers per exercise, unique built-in exercise names) and the 37 built-in exercises |
| `20261024000100_body_measurements.sql` | `body_measurements` table with range checks, one row per user per day, at least one metric per row, and RLS |
| `20261024000000_initial_schema.sql` | All tables from section 8.2 (except `body_measurements`), `muscle_group` and `photo_pose` enums, RLS on every table, profile creation trigger on sign up, private `progress-photos` storage bucket with per-user folder policy |

`supabase/setup.sql` is all migrations concatenated in order, for a one-time paste into the Supabase SQL editor. Regenerate it whenever a migration is added. Status: applied to the project in `.env.local` on 2026-10-24 and verified (all tables present, RLS blocking anonymous reads, 37 built-in exercises, private photo bucket). The connected Supabase tooling has no access to that project, so migrations are run from the dashboard SQL editor.

## 17. Testing and CI

- Vitest config: `vitest.config.mts`; tests in `tests/unit/`: rate limiter, proxy protection, login route, streak, membership status, weight summary, backend selection (demo versus Supabase, never demo in production), Supabase paging and error helpers, prefill rule shared by both backends, workout logic, slot suggestions (commitments, travel buffer, history, rest, weekly cap, duration), under-trained recommendations, availability routes, photo type detection by magic bytes, progress comparison and measurement deltas, photo upload and measurement routes (rejected disguised files, SVG, oversize, bad input, per user limit, upload rate limit, privacy headers, user isolation), muscle intensity scoring (weights, weekly range, overall normalisation, last trained, suggestions), week ranges and summaries, delta formatting, next workout suggestion, and CRUD routes for check-ins, weights, membership, exercises and workouts (validation, set numbering and renumbering, one active workout, idempotent finish, cascade delete, prefill priority, user isolation, write rate limits).
- `npm run typecheck` runs `next typegen` first, because route handler types are generated.
- Playwright is installed for end to end tests but not configured yet.
- GitHub Actions: `.github/workflows/ci.yml` runs lint, typecheck, tests and build on every push and pull request, using placeholder Supabase env values.

## 17.1 Map Picker (Membership Location)

The membership form has a map for choosing where the gym is. It uses Leaflet through react-leaflet, loaded in the browser only (`next/dynamic`, no SSR), with OpenStreetMap tiles. No API key or account is needed.

- **Search**: the Search button (or Enter) calls OpenStreetMap's Nominatim `search` endpoint. Results are validated before use (`src/lib/geo.ts`). It is deliberately not search-as-you-type, which Nominatim's usage policy forbids.
- **Pin**: tap the map, or drag the pin. The address text is looked up with Nominatim `reverse` and filled in only if the field is empty or still holds the previous map-filled text, never over text you typed. Long addresses are shortened to 120 characters at a comma.
- **Use my location**: the browser's Geolocation API (needs permission, and HTTPS or localhost).
- **Rate limit**: requests to Nominatim are spaced at least 1.1 seconds apart in the browser, to stay within its fair use policy (about 1 request per second, intended for light use).
- **Privacy**: tiles, searches and reverse lookups are requested from OpenStreetMap servers by your browser, so they see your IP address and the places you look at. Nothing else from the app is sent. The required attribution is shown on the map.
- **Scrolling**: mouse wheel zoom is off so the page scrolls normally over the map, and on touch devices one-finger dragging does not pan it. Zoom with the + and - buttons, double click, or pinch.
- **Accessibility**: the map is not keyboard friendly, so the same result is reachable by searching, "Use my location" or typing the address in the text field.
- **Dark theme**: the tile layer is inverted with CSS so the map matches the interface.
- **Navigating away and back**: with Cache Components, Next.js hides a page you leave (React Activity) and re-runs its effects when you return, but Leaflet destroys its map when effects clean up. A map left as it was crashed the page with "Cannot read properties of undefined (reading 'appendChild')" when you came back through the sidebar, though a fresh load worked. `LocationMap` therefore bumps a `key` in a layout effect cleanup, which throws the old map away and builds a new one when the page is shown again (the pattern from `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`). Any new widget that owns a DOM instance (maps, charts with imperative setup, players) needs the same care. Test it by going Dashboard, then Membership, through the sidebar and with Back and Forward, not only by loading the page directly.
- **Marker**: a CSS dot, because Leaflet's default marker images do not survive bundling.

## 18. 3D Model Source and License

There is no external 3D asset, so there is nothing to attribute. The 3D view is a procedural stand-in built in code: one scaled sphere (ellipsoid) per muscle group plus dark filler shapes, defined in `src/app/(app)/body/components/body-3d-parts.ts` and rendered with react-three-fiber in `body-3d.tsx`. It supports drag to rotate, scroll or pinch to zoom, and tap to select. It is loaded on demand (`next/dynamic`, no SSR) and the page itself stays a Server Component.

The 2D map shapes (`body-shapes.ts`) are hand-drawn paths, also original to this project.

To upgrade to a realistic model: add a CC0 or CC-BY GLB with one mesh or material per muscle group (ids from `src/lib/muscles.ts`), record the source, author and license here, and replace `body-3d.tsx`. The scoring, data and detail panel do not change.

Red meaning: defaults to "heavily trained, needs rest" (open question in section 7.2). To change it, edit `labels.high` and `hints.high` in `INTENSITY_CONFIG`.

## 19. Changelog

- 2026-10-29: Sera gets a smug tsundere voice, nine moods, eight poses, idle quirks and a poke easter egg, on her original silver blue drawing (the painted sprite and 3D experiments were dropped).
- 2026-10-29: Sera gets a more natural body (shoulders, waist, hips, tapered arms, slim hands) and a dev only full body preview on `/dev/sera`.
- 2026-10-29: Sera stands up in full for the welcome, a new rank and a 30 day streak.
- 2026-10-29: Sera redrawn from zero as an anime style girl: pastel twin tails, big glossy eyes, ribbons, a sailor jacket and bow, properly shaped hands, new tail, ahoge and ribbon animations.
- 2026-10-29: The unlock levels are paced for about a week of dedicated training and two weeks of lighter training: Body 4, quests and chests 10, Schedule, Status and Membership 14, leaderboard, Titles, Profile and Collection 18, Rank trials 22, gates 26, muscle levels 33.
- 2026-10-29: Sera appears big for key moments (welcome, unlock, gate boss, first workout, streaks, welcome back, the daily hello) and gives highlighted tours of every page; the dashboard level card no longer shows a Profile link before level 10.
- 2026-10-29: Sera, a scripted guide mascot with a pop-up chat, and the focus plan: Body now opens at level 3, Schedule at 5, Membership at 8 and Profile and Collection at 10, with every page, the nav, the dashboard cards and the Settings sections following. The welcome slides were replaced by her welcome.
- 2026-10-29: Real visuals for the items: grade cards, an icon for every item, aura art, nameplate styles by grade, real share look thumbnails and a live preview on the Collection page. The share font lookup moved to `src/lib/share-fonts.ts` and the stats radar to the shared components.
- 2026-10-29: Player profiles with per-section privacy, a profile section in Settings and a profile page at `/u/<username>`. The display name is now one name for the profile and the leaderboard, and leaderboard rows link to open profiles. Needs migration `20261029000200_profiles.sql`; until it runs, Settings and the profile page say profiles are not set up yet and the rest of the app works as before.
- 2026-10-29: Quest chests with graded cosmetic items, a Collection page and a smooth chest opening animation. Needs migration `20261029000100_chests.sql`; until it runs no chests are shown and the rest of the app works as before, and until the `plate` column exists the nameplate is left out of the leaderboard.
- 2026-10-29: Three more share looks, Status, Shadow and Mono, with two new layouts for the headline numbers (a list window and a big volume with time and sets beside it). The look picker is now a 3 by 2 grid. Same facts on every look; the first three looks are unchanged apart from the System restyle.
- 2026-10-29: The share image (story and square) got the System look on the branch `feat/system-ui`: new blue palettes, Chakra Petch title, bracketed labels, corner brackets on the stat tiles, a header rule and glowing accents. Same layout and content as before.
- 2026-10-29: Full System restyle on the branch `feat/system-ui`: new blue-black palette, Chakra Petch display face, every card a glowing System window with bracketed labels, glowing bars, a red boss window, new landing and sign in. Also fixed a horizontal overflow of the content area between about 770 and 1250 px wide.
- 2026-10-29: Muscle levels, titles (also on the leaderboard), rank trials from level 25 and a comeback quest after a quiet day, with a Settings switch. Needs migration `20261029000000_rank_trials_titles.sql`; until it runs, trials do not hold anyone back and titles are not saved on the leaderboard.
- 2026-10-29: Weekly gates and bosses with XP and booster rewards, unlocking at level 12.
- 2026-10-29: Status window with a rank letter (E to SSS), five stats and a radar chart, unlocking at level 8.
- 2026-10-29: System look (glowing window cards, bracketed notices) and a full-screen level-up moment for big level ups, new ranks and unlocks, with a Settings switch.
- 2026-10-29: Progressive unlocks and a getting started guide, so new users see a few things first and the rest opens as they level up. Next unlock card, locked-page teasers, welcome slides, one-time tips, a How it works page and a Show all features switch. Finishing the guide earns a booster.
- 2026-10-28: Leaderboard page: opt in with a nickname, Global and My country boards, all time and this week. Scores are computed and written by the server. Used boosters beyond the number earned are now ignored. Needs migration `20261028000400_leaderboard.sql`.
- 2026-10-28: Renamed the app from GymTrack to Muscles Leveling everywhere you can read it: sidebar, landing and login, page titles and descriptions, the share images (header, footer and the saved file name, now `muscles-leveling-...png`), the share sheet title and the docs. Not renamed on purpose: the package name `gym-tracker`, the folder, and the browser storage keys and event names that start with `gymtrack:`, so saved XP pop-up settings are not reset. A test keeps the old name out of the code.
- 2026-10-28: Daily and weekly quests on the dashboard. Three of each, rotating by date, with progress bars and XP, a bonus for finishing them all, no claiming and no new table. `loadLevel` is now cached per request so the level card and the quests share one load.
- 2026-10-28: Game pass, part 3. XP boosters: an automatic welcome boost (double XP for the first 7 days) and collectable Double XP Day boosters earned from workouts and streaks and used on a day you choose. New `GET` and `POST /api/boosts`, a Boosters panel on the level page, boost chips on the dashboard hero and an x2 tag on the XP pop-up. Needs migration `20261028000300_xp_boosts.sql`.
- 2026-10-28: Game pass, part 2. XP pop-ups with an animated level bar, level-up and rank-up moments, merged and short, switchable in Settings. New `GET /api/xp`. Coming next: XP boosters.
- 2026-10-28: Game pass, part 1. New fast level curve and 13 ranks with SVG badges and a rank ladder. The dashboard now opens with a level hero. Mood, energy and sleep are back in the check-in form. The share image uses the same body as the workout page (same colors, outline, FRONT and BACK captions) plus the rank badge, and opens by itself after finishing a workout. Coming next: XP pop-ups and XP boosters.
- 2026-10-28: Fixed the share card headline numbers overlapping: a long time such as 1h 19m was cut to "1h 19.." and the kg unit could sit on top of the volume. The number now shrinks to fit its tile and the unit is placed after it.
- 2026-10-28: Checked the home check-in, geofence refusals, set times, rest timer and share images against the live project (test rows removed afterwards). Exercises in the logged sets list now follow the order they were done. The share card shows the gym name plus the first part of its address instead of the whole geocoded address. If an API route still reports an old column after a migration, restart `next dev`: its route cache can go stale.
- 2026-10-28: Home workout is a third check-in choice and needs no location. It counts as training for starting workouts and earns XP. Streaks now earn milestone XP. Sets show how far into the workout they were done instead of the clock time. Share images show the muscles worked on a body and where you trained, with a switch to hide the location. Needs migration `20261028000200_checkin_kind.sql`.
- 2026-10-28: Shareable workout images in three looks and two sizes (story and square), made in the browser, with the phone share sheet or a download. Drawing logic is unit tested, but the images have not been checked by eye yet.
- 2026-10-28: Levels and XP, earned from check-ins, weigh-ins, measurements, progress photos and finished workouts, shown on the dashboard with a breakdown page. Leaderboards are left for later.
- 2026-10-28: A gym check-in now has to be made at the gym: the phone's location must be within 200 m of the gym pinned on the Membership page. Rest days are unaffected. This also gates starting workouts, since they need a gym check-in.
- 2026-10-30: The gym check-in is more forgiving indoors: it waits for the best GPS reading, forgives up to 300 m of reported error and only refuses a fix worse than 1500 m.
- 2026-10-30: Important actions ask for a confirmation in a popup: finishing a workout, deleting things, leaving the leaderboard, signing out and using a booster.
- 2026-10-28: Rest timer that restarts after every logged set, and a completion time on every set (with the rest taken before it in the logged sets list). Needs migration `20261028000100_set_timestamps.sql`.
- 2026-10-28: Settings page with country, weight unit (kg or lb) and currency (IDR or USD). Weights are shown and typed in the chosen unit but stay in kilograms in the database. Membership prices carry their own currency. Needs migration `20261028000000_user_settings.sql`. On phones the last tab is now Settings, with Membership one tap away.
- 2026-10-28: Body and progress pages made roomier on phones: tabs instead of long stacks, full width heatmap controls, measurement history as cards, tighter photo comparison. Not yet checked on a real phone.
- 2026-10-27: Simplified the app. Dashboard is now "1. Check in" and "2. Start training" first, with a lighter weekly summary and small weight and membership cards below, and a Welcome guide for new accounts. Optional check-in fields are folded away. The mobile tab "More" is now "Membership". The Body page uses Muscles and Weight tabs. Added plain-language hints for volume and primary muscle.
- 2026-10-27: Removed two Schedule page panels that were confusing: "Under-trained this week" and the "All commitments" list (the weekly calendar already shows every commitment). `recommendUndertrained` stays in the code, unused by the interface.
- 2026-10-27: Schedule page: commitments can be added by dragging across a weekly calendar, like Google Calendar, instead of only typing times. The typed form and the list remain.
- 2026-10-27: Removed the "Muscle map, this week" panel from the dashboard (for now). `?focus=<muscle group>` on `/workouts/[id]` still works, and `coverage.ts` is still used by the workout page muscle map, but nothing links with `focus` any more and `coverageMessage` and `coverageDelta` are only covered by tests.
- 2026-10-24: Fixed a crash on the Membership page when arriving by in-app navigation (sidebar, Back, Forward). The map is rebuilt when the page is shown again. Verified on the dev server and on the production build.
- 2026-10-24: Starting a workout now requires today's check-in to say you went to the gym. Enforced by the API and shown in the interface (disabled start buttons with the reason and a link to the check-in). Continuing a workout already in progress is always allowed. Added `getCheckinByDate` to the check-in repositories.
- 2026-10-24: Live muscle map on the workout page, kept visual only (front and back body, this workout's muscles outlined). `formatScore` moved to `src/lib/muscle-intensity.ts`; the body map gained a `highlight` option.
- 2026-10-24: One-tap start workout for the most neglected muscle group from the dashboard muscle map. The workout page accepts `?focus=<muscle group>` and opens with a matching exercise selected.
- 2026-10-24: Dashboard muscle map for motivation: weekly muscle coverage with a comparison to last week and the list of groups not trained yet. The body map component moved to `src/components/body-map/` and gained a display-only mode (no buttons, a title tooltip per muscle).
- 2026-10-24: Verified check-in and weigh-in photos against the live project: uploads, the 4 per entry limit, validation, private serving, deleting one photo, cascade when a weigh-in is deleted (stored files removed too), the diary, and the browser resize (a 4000x3000 JPEG with an embedded GPS marker was stored as 1600x1200 with the marker gone). The upload limit of 10 per minute applies to rejected uploads as well.
- 2026-10-24: Photos on daily check-ins and weigh-ins (up to 4 each), shrunk and stripped of metadata in the browser, plus a gym diary page. Needs migration `20261024000500_log_photos.sql`. Deleting a check-in or weigh-in also deletes the stored files.
- 2026-10-24: Verified the map picker against the live project (search, pin, address autofill, save, persisted coordinates). Fixed the map capturing the mouse wheel and touch drags, and added the Leaflet tile seam fix.
- 2026-10-24: Map picker for the membership location: search a place, tap the map, drag the pin or use your current location (Leaflet and OpenStreetMap, no account or API key). Stores `latitude` and `longitude` next to the address. Needs migrations `20261024000300` and `20261024000400`.
- 2026-10-24: Membership location: optional free text field (branch, area or address) with an "Open in maps" link, shown on the Membership page and the dashboard. Needs migration `20261024000300_membership_location.sql`.
- 2026-10-24: Verified the Supabase backend end to end against the live project (about 60 API checks plus a visual pass of the dashboard, body, progress and schedule pages). Fixed a bug found by that run: a malformed id (for example `/api/workouts/not-a-uuid`, or an unknown exercise id in a set) made Postgres throw and returned 500; the Supabase repositories now validate uuids (`isUuid`) and answer 404 or 400 like the demo backend. Confirmed the photo bucket is private: the public storage URL answers "Bucket not found" and the anon key cannot read the object.
- 2026-10-24: Supabase backend: repositories for every table and the private photo bucket, dispatchers that choose between demo and Supabase, shared prefill logic, integrity and exercise seed migration, combined `supabase/setup.sql`. Demo mode stays available for development. Not yet exercised against a live database.
- 2026-10-24: Phase 7 scheduling and recommendations: weekly commitments with CRUD routes, best time suggestions from commitments and attendance history, under-trained muscle recommendations with exercise suggestions. This completes the planned roadmap.
- 2026-10-24: Phase 6 physique analysis: private progress photo upload with server side image validation, authenticated photo serving, side by side comparison with weight and measurement changes, body measurements, `body_measurements` migration. AI analysis not built.
- 2026-10-24: Phase 5 body heatmap: tested muscle intensity scoring, 2D SVG body map with front and back views, procedural 3D model, weekly and overall toggle, muscle detail panel and muscle list. The Body page now leads with the heatmap.
- 2026-10-24: Phase 4 dashboard: weekly summary with last week comparison and daily volume bars, next workout suggestion (push, pull, legs rotation), membership and weight snapshots. Moved the weight chart and start workout button to `src/components` and extracted a shared membership status component, since they are now used on several pages.
- 2026-10-24: Phase 3 workout logging on the dummy data layer: seeded exercise library with custom exercises, workout sessions with live timer and automatic duration, fast set logging with prefill, history and session detail, workout and exercise API routes, tests. The nav is wrapped in `Suspense` because `usePathname()` is runtime data on dynamic routes.
- 2026-10-24: Phase 2 daily basics on a swappable in-memory data layer: check-in with streak, weight tracking with trend chart, membership tracker with expiry warning, CRUD API routes, demo mode, tests.
- 2026-10-24: Phase 1 foundation: dependencies, shadcn (radix-lyra), HUD theme, fonts, Supabase helpers, proxy, auth routes and login, app shell, robots, sitemap, initial migration, tests, CI.


---

## 20. Switching to Supabase

The code is ready. These steps are what remains, and the first and last need you.

0. **Done and verified on 2026-10-24**: steps 1 to 5 below. Step 6 (cleanup of the demo code) is optional and still open.
1. **Env** (`.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key), `SUPABASE_SERVICE_ROLE_KEY` (unused so far), `NEXT_PUBLIC_SITE_URL`. See section 10.
2. **Create the schema**: open the Supabase dashboard for the project, go to **SQL Editor**, paste the whole of `supabase/setup.sql` and run it once. It creates the tables with Row Level Security, the sign-up profile trigger, the private `progress-photos` bucket and its policy, the integrity indexes, and the built-in exercises. Check **Table Editor** shows `exercises` with 37 rows, then run the security advisor.
3. **Turn demo mode off**: remove `NEXT_PUBLIC_DEMO_MODE=true` from `.env.local` (or set it to `false`) and restart `npm run dev`.
4. **Auth settings** (dashboard, Authentication): under Providers, Email, decide whether "Confirm email" is required. Under URL Configuration, set the Site URL to `http://localhost:3000` (and your real domain when deployed).
5. **Smoke test**: open the app, it redirects to `/login`. Create an account, sign in, then try: a check-in, a weight, a membership, start and finish a workout with a few sets, an exercise of your own, a progress photo, a measurement, and a commitment on the Schedule page. Reload each page to confirm the data persisted. New accounts start empty, because the demo sample data lives only in the in-memory store.
6. **Cleanup once happy**: delete `src/lib/repositories/memory/`, `src/lib/demo.ts`, the demo branches in `src/proxy.ts`, `src/lib/auth.ts` and the logout route, and the dispatcher indirection. Move the tests that rely on demo mode to a Supabase test project or mock the client.

Known follow-ups for production:

- **Timezone**: usual training hours are read from each workout's `started_at` in the server's timezone. Store the user's timezone (for example on `profiles`) and convert in `suggestSlots` before deploying to a UTC host.
- **Rate limiting** is in memory and per instance; use a shared store if you scale out.
- **Backups and limits**: photos are capped at 5 MB each and 100 per user.
