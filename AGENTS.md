# Pattern++ — AI Agent Reference Guide

> A smart interview preparation platform combining **Pattern Recognition** with the **SuperMemo-2 (SM-2) Spaced Repetition Algorithm**.
> Deployed at: `https://patternplusplus.vercel.app`

---

## Quick Reference

| Detail         | Value                                                  |
| -------------- | ------------------------------------------------------ |
| Framework      | Next.js 16 (App Router, Turbopack)                     |
| Language       | TypeScript 5                                           |
| Styling        | Tailwind CSS 4, Shadcn UI (Zinc dark theme)            |
| Database       | Supabase (PostgreSQL)                                  |
| Auth           | Supabase Auth (email + password)                       |
| Fonts          | Domine (headings), Poppins (body) — **do not change**  |
| Deploy         | Vercel                                                 |
| LeetCode API   | Internal proxy at `/api/leetcode` → LeetCode GraphQL   |

---

## Architecture Overview

```
Client (Browser)
  ├─ AuthProvider (sets timezone cookie, manages Supabase session)
  ├─ Pages (Server Components — fetch data via Server Actions)
  └─ Interactive Components ("use client" — call Server Actions)

Server Actions ("use server")
  ├─ src/actions/workout/     ← Daily Workout engine
  ├─ src/actions/activity.ts  ← Heatmap & streak stats
  ├─ src/actions/leetcode.ts  ← LeetCode sync
  ├─ src/actions/problems.ts  ← Problem bank CRUD
  └─ src/actions/profile.ts   ← User profile

API Routes
  └─ src/app/api/leetcode/route.ts ← CORS proxy for LeetCode GraphQL

Libraries
  ├─ src/lib/sm2.ts           ← SM-2 algorithm (pure function)
  ├─ src/lib/review-spread.ts ← Review load-balancing
  ├─ src/lib/leetcode.ts      ← LeetCode GraphQL client (via internal proxy)
  └─ src/lib/supabase/        ← Supabase client/server utilities
```

---

## Database Schema (Supabase)

### `profiles`

| Column              | Type           | Notes                                          |
| ------------------- | -------------- | ---------------------------------------------- |
| `id`                | `uuid` PK      | Same as `auth.users.id` (1:1 mapping)          |
| `leetcode_username` | `text NOT NULL` | **Mandatory** — user's LeetCode handle         |
| `display_name`      | `text`          | Optional display name                          |
| `avatar_url`        | `text`          | Profile picture URL                            |
| `created_at`        | `timestamptz`   | Default `now()`                                |
| `updated_at`        | `timestamptz`   | Default `now()`                                |

> `leetcode_username` is **required**. Collected during onboarding before dashboard access.

### `problems`

| Column          | Type              | Notes                                             |
| --------------- | ----------------- | ------------------------------------------------- |
| `id`            | `uuid` PK         | Auto-generated                                    |
| `title`         | `text`            | e.g., "Best Time to Buy and Sell Stock"           |
| `leetcode_num`  | `int`             | LeetCode problem number                           |
| `title_slug`    | `text`            | URL slug for LeetCode GraphQL lookups             |
| `difficulty`    | `text`            | `'Easy'` / `'Medium'` / `'Hard'`                 |
| `url`           | `text`            | Link to LeetCode                                  |
| `patterns`      | `text[]`          | PostgreSQL array — queryable with `@>`, `&&`      |
| `created_at`    | `timestamptz`     | Default `now()`                                   |

### `user_progress`

| Column              | Type           | Notes                                     |
| ------------------- | -------------- | ----------------------------------------- |
| `id`                | `uuid` PK      | Auto-generated                            |
| `user_id`           | `uuid` FK       | → `auth.users.id`                         |
| `problem_id`        | `uuid` FK       | → `problems.id`                           |
| `easiness_factor`   | `float`         | SM-2 EF (starts at 2.5)                   |
| `interval`          | `int`           | Days until next review                    |
| `repetitions`       | `int`           | Consecutive correct recalls               |
| `next_review_date`  | `date`          | When to show this problem again           |
| `last_reviewed_at`  | `timestamptz`   | Timestamp of last review                  |
| `status`            | `text`          | `'new'` / `'learning'` / `'mastered'`     |
| `stuck_note`        | `text`          | User's personal "Stuck" hint              |

**Unique constraint:** `(user_id, problem_id)`

**Sentinel values:**
- `next_review_date = '9999-12-31'` → problem excluded from revision scheduling
- `status = 'mastered'` → problem excluded from revision scheduling

### `activity_log`

| Column        | Type           | Notes                          |
| ------------- | -------------- | ------------------------------ |
| `id`          | `uuid` PK      |                                |
| `user_id`     | `uuid` FK       | → `auth.users.id`             |
| `problem_id`  | `uuid` FK       | → `problems.id`               |
| `solved_at`   | `date`          | Day the problem was solved     |
| `quality`     | `int`           | SM-2 quality rating (1–5)     |

---

## Core Business Logic

### SM-2 Algorithm (`src/lib/sm2.ts`)

Pure function. Input: `{ quality, repetitions, easinessFactor, interval }` → Output: `{ repetitions, easinessFactor, interval, nextReviewDate }`.

- `quality >= 3` → correct recall, increment repetitions, extend interval
- `quality < 3` → forgot, reset repetitions to 0, interval to 1
- EF formula: `EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))`, clamped to min `1.3`

### Review Load-Balancing (`src/lib/review-spread.ts`)

- `MAX_REVIEWS_PER_DAY = 1` — at most 1 revision problem per day
- `MAX_SPREAD_DAYS = 60` — search window for open review slots
- If the target review date is full, push forward day by day until a slot opens

### Daily Workout Engine (`src/actions/workout/get-daily-workout.ts`)

**The "Daily 3"** — 1 Revision + 2 Discovery/New problems per day.

#### Timezone Handling
- Reads `timezone` cookie (set by `AuthProvider.tsx` on client mount)
- Uses `Intl.DateTimeFormat("en-CA", { timeZone })` for server-side local date
- Client components pass `clientTodayStr` as override for actions called client-side

#### Problem Selection Logic
1. **Check already-solved today** — fetch `activity_log` for today's entries
2. **Find revision problem** — query `user_progress` joined with `problems` (`problems!inner(*)`)
   - Excludes: `status = 'mastered'`, `next_review_date = '9999-12-31'`, `difficulty = 'Easy'`, `patterns @> {'Database'}`
   - Ordered by `next_review_date ASC` (earliest due first)
   - If due date is in the future, rebalances it to today
3. **Restore already-solved problems** — any problem solved today stays in the workout (no flickering on refresh)
4. **Fill remaining slots from local DB** — unsolved problems matching revision patterns via `.overlaps("patterns", revisionPatterns)`
5. **Dynamic LeetCode fallback** — if local DB doesn't have enough, fetch from LeetCode GraphQL by tag
6. **Random fallback** — if still < 3, fetch random Medium/Hard from LeetCode

> [!IMPORTANT]
> **Exclusion filters must stay aligned** between the workout engine and the Problem Bank page. Both must exclude Easy difficulty and Database patterns from the revision pool. If you add a new exclusion, update both:
> - `src/actions/workout/get-daily-workout.ts` (SQL filters on `user_progress` + `problems` queries)
> - `src/components/problems/ProblemBankClient.tsx` (`getProblemStatus` / `getNextReviewDate` / sort logic)

#### Related Server Actions
- `rateWorkoutProblem()` — runs SM-2, upserts `user_progress`, logs to `activity_log`, load-balances next review date
- `toggleWorkoutProblemSolved()` — marks solved (defaults to rating 3) or unsolved (deletes today's log, reverts progress)

### LeetCode Integration

- **Proxy**: `/api/leetcode` (Next.js API route) proxies requests to `https://leetcode.com/graphql` with browser-like headers to bypass CORS
- **Client**: `src/lib/leetcode.ts` sends GraphQL queries through the proxy
- **Sync**: `src/actions/leetcode.ts` syncs a user's LeetCode solved history into the local `problems` + `user_progress` tables
- **URL Construction**: `getLeetCodeProxyUrl()` uses `NEXT_PUBLIC_APP_URL` → `VERCEL_URL` → `localhost:3000` fallback chain

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx           ← Sidebar + main content wrapper
│   │   ├── dashboard/page.tsx   ← Overview: Heatmap + Streak + Daily Workout
│   │   ├── workout/page.tsx     ← Standalone workout page (placeholder)
│   │   ├── problems/page.tsx    ← Problem Bank with filters/sort
│   │   ├── analytics/page.tsx   ← Pattern analytics charts
│   │   └── settings/page.tsx    ← Profile settings
│   ├── api/leetcode/route.ts    ← LeetCode GraphQL CORS proxy
│   ├── layout.tsx               ← Root layout (fonts, providers, Toaster)
│   ├── page.tsx                 ← Landing page / auth redirect
│   └── globals.css              ← Tailwind + custom styles
│
├── actions/
│   ├── workout/
│   │   ├── get-daily-workout.ts ← Daily 3 generation (timezone-aware)
│   │   ├── rate-problem.ts      ← SM-2 rating + activity logging
│   │   ├── toggle-solved.ts     ← Quick solve/unsolve toggle
│   │   ├── types.ts             ← WorkoutProblem, DatabaseProblem, DatabaseUserProgress
│   │   ├── utils.ts             ← getLocalDateStr (timezone-aware), patternToSlug, toWorkoutProblem
│   │   └── index.ts             ← Re-exports
│   ├── activity.ts              ← getDashboardStats, getHeatmapData
│   ├── leetcode.ts              ← syncLeetCodeSolvedProblems
│   ├── problems.ts              ← addProblem, rebalanceReviewDates
│   └── profile.ts               ← getProfile, updateProfile
│
├── components/
│   ├── dashboard/
│   │   ├── Heatmap.tsx          ← GitHub-style 90-day activity grid
│   │   ├── StreakCard.tsx        ← Active days, streak, total solved
│   │   └── SyncButton.tsx       ← LeetCode sync trigger
│   ├── layout/
│   │   ├── Sidebar.tsx          ← Collapsible sidebar navigation
│   │   └── AuthModal.tsx        ← Login/signup modal
│   ├── problems/
│   │   ├── ProblemBankClient.tsx ← Client-side filters, sorting, rebalance
│   │   ├── ProblemTable.tsx      ← Table rendering with status/review dates
│   │   ├── ProblemFilters.tsx    ← Search, difficulty, pattern, status filters
│   │   └── AddProblemDialog.tsx  ← Add problem form dialog
│   ├── profile/
│   │   └── ProfileForm.tsx      ← LeetCode username + display name form
│   ├── workout/
│   │   ├── WorkoutSection.tsx   ← Client wrapper: fetches daily workout, handles rate/toggle
│   │   └── WorkoutCard.tsx      ← Individual problem card with rating UI
│   └── ui/                      ← Shadcn auto-generated components
│
├── hooks/
│   └── useAuthModal.ts          ← Zustand store for auth modal state
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            ← Browser-side Supabase client
│   │   └── server.ts            ← Server-side Supabase client (cookies)
│   ├── sm2.ts                   ← SM-2 spaced repetition algorithm
│   ├── review-spread.ts         ← Review date load-balancing
│   ├── leetcode.ts              ← LeetCode GraphQL fetch utilities
│   └── utils.ts                 ← Shadcn `cn()` utility
│
├── providers/
│   ├── AuthProvider.tsx         ← Supabase auth context + timezone cookie
│   └── ModalProvider.tsx        ← Auth modal provider
│
└── proxy.ts                     ← Middleware: auth guard for dashboard routes
```

---

## Critical Invariants & Gotchas

> [!CAUTION]
> Read these before making changes. Past bugs came from violating these rules.

### 1. Timezone: Server ≠ Client
The server runs in UTC (Vercel). The user's browser is in IST or other local timezone. **All date comparisons must use the client's local date**, not the server's `new Date()`.
- `AuthProvider.tsx` sets a `timezone` cookie on every page load
- Server actions read this cookie via `cookies()` from `next/headers`
- `getLocalDateStr(new Date(), timeZone)` formats the date correctly
- Client components compute `getClientTodayStr()` locally and pass it as `clientTodayStr`

### 2. Workout Stability on Navigation
The daily workout must **not change** when the user navigates away and comes back. Problems solved today must reappear in the same slots. This is achieved by:
- Querying `activity_log` for today's solved problems first
- Re-adding them to the workout list before filling remaining slots
- `WorkoutSection.tsx` uses `useEffect` to re-fetch with client date on mount

### 3. Easy & Database Exclusions
Easy problems and Database-pattern problems are **permanently excluded** from the revision scheduling pool:
- On sync/rate: Easy problems get `status = 'mastered'` + `next_review_date = '9999-12-31'`
- Workout queries filter with `.neq("problems.difficulty", "Easy")` and `.not("problems.patterns", "cs", '{"Database"}')`
- Problem Bank hides the review date for mastered/Easy problems (shows "—")

### 4. Review Capacity
- `MAX_REVIEWS_PER_DAY = 1` in `review-spread.ts` — only 1 revision problem scheduled per day
- If no revision is due today, the earliest future revision is pulled forward to today
- Mastered problems (`status = 'mastered'` OR `next_review_date = '9999-12-31'`) are never rebalanced

### 5. LeetCode Proxy
All LeetCode API calls go through `/api/leetcode` (not directly to `leetcode.com`). This avoids CORS issues. The proxy URL is resolved via:
1. `NEXT_PUBLIC_APP_URL` env var (if set)
2. `VERCEL_URL` env var (auto-set by Vercel)
3. `localhost:3000` fallback

### 6. Fonts
Domine (headings, `font-heading`) and Poppins (body, `font-sans`) are loaded via `next/font/google`. **Do not change these.**

---

## Environment Variables

| Variable                         | Required | Purpose                                    |
| -------------------------------- | -------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`       | ✅       | Supabase project URL                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | ✅       | Supabase anonymous key                     |
| `SUPABASE_SERVICE_ROLE_KEY`      | ✅       | Supabase service role key (server-only)    |
| `NEXT_PUBLIC_APP_URL`            | Prod     | Deployed URL for LeetCode proxy routing    |

---

## Common Tasks for AI Agents

### Adding a new problem filter/exclusion
1. Update the Supabase query in `get-daily-workout.ts` (revision + discovery queries)
2. Update `ProblemBankClient.tsx` filter/sort logic to match
3. If the exclusion applies at sync time, update `src/actions/leetcode.ts` too

### Modifying the SM-2 parameters
- Edit `src/lib/sm2.ts` — it's a pure function, no side effects
- Interval schedule is in `calculateSM2()`: rep 1 → 6 days, rep 2 → 10 days, then `interval * EF`

### Changing review load-balancing
- Edit `src/lib/review-spread.ts` — `MAX_REVIEWS_PER_DAY` and `MAX_SPREAD_DAYS`
- Called from `rateWorkoutProblem()` in `src/actions/workout/rate-problem.ts`

### Adding a new page
1. Create `src/app/(dashboard)/<route>/page.tsx` (Server Component)
2. Add the route to `Sidebar.tsx` nav items
3. Add the route to `proxy.ts` `isDashboardRoute` check
