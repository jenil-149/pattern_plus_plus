@AGENTS.md
# Pattern++ — Step-by-Step Build Walkthrough

> A smart interview preparation platform combining **Pattern Recognition** with the **SuperMemo-2 (SM-2) Spaced Repetition Algorithm**.

---

## Phase 0 — Project Scaffolding & Tooling

### Step 0.1 · Initialize Next.js Project

| Detail       | Value                                      |
| ------------ | ------------------------------------------ |
| Command      | `npx -y create-next-app@latest ./`         |
| Location     | `D:\coding\react\Pattern++`                |
| App Router   | ✅ Yes                                      |
| TypeScript   | ✅ Yes                                      |
| Tailwind CSS | ✅ Yes                                      |
| ESLint       | ✅ Yes                                      |
| `src/` dir   | ✅ Yes                                      |
| Import alias | `@/*`                                      |

**What you get:** A bare Next.js 14+ project with App Router, TypeScript, and Tailwind pre-configured.

---

### Step 0.2 · Install Shadcn UI

```bash
npx -y shadcn@latest init
```

- Theme: **Zinc** (dark mode default)
- Base color: **Zinc-950** for backgrounds
- CSS variables: ✅ Yes

Then install only the components we'll need as we go (e.g., `npx shadcn@latest add button card badge`).

---

### Step 0.3 · Install Core Dependencies

```bash
npm install lucide-react recharts
npm install @supabase/supabase-js @supabase/ssr
```

| Package              | Purpose                            |
| -------------------- | ---------------------------------- |
| `lucide-react`       | Icon library (consistent w/ Shadcn)|
| `recharts`           | Charts for Pattern Analytics       |
| `@supabase/supabase-js` | Supabase client SDK            |
| `@supabase/ssr`      | SSR-friendly Supabase helpers      |

---

### Step 0.4 · Environment & Supabase Config

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Create two utility files:

| File                                 | Purpose                               |
| ------------------------------------ | ------------------------------------- |
| `src/lib/supabase/client.ts`         | Browser-side Supabase client          |
| `src/lib/supabase/server.ts`         | Server-side Supabase client (cookies) |

---

## Phase 1 — Database Schema (Supabase)

> [!IMPORTANT]
> All SQL runs inside your Supabase Dashboard → SQL Editor. No backend server needed.

### Step 1.1 · `problems` Table

Stores the master problem bank.

| Column          | Type              | Notes                                             |
| --------------- | ----------------- | ------------------------------------------------- |
| `id`            | `uuid` PK         | Auto-generated                                    |
| `title`         | `text`            | e.g., "Best Time to Buy and Sell Stock"           |
| `leetcode_num`  | `int`             | LeetCode problem number                           |
| `difficulty`    | `text`            | `'Easy'` / `'Medium'` / `'Hard'`                 |
| `url`           | `text`            | Link to LeetCode                                  |
| `patterns`      | `text[]`          | **SQL Array** — e.g., `{'Sliding Window','Array'}`|
| `created_at`    | `timestamptz`     | Default `now()`                                   |

> [!TIP]
> Using native PostgreSQL `text[]` arrays for `patterns` lets you query with `@>` (contains) and `&&` (overlaps) operators — no junction table needed.

---

### Step 1.2 · `user_progress` Table

Tracks each user's SM-2 state per problem.

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

**Unique constraint:** `(user_id, problem_id)` — one row per user per problem.

---

### Step 1.3 · `activity_log` Table

Powers the Activity Heatmap.

| Column        | Type           | Notes                          |
| ------------- | -------------- | ------------------------------ |
| `id`          | `uuid` PK      |                                |
| `user_id`     | `uuid` FK       | → `auth.users.id`             |
| `problem_id`  | `uuid` FK       | → `problems.id`               |
| `solved_at`   | `date`          | Day the problem was solved     |
| `quality`     | `int`           | SM-2 quality rating (0–5)     |

---

## Phase 2 — App Layout & Navigation Shell

### Step 2.1 · Global Layout (`src/app/layout.tsx`)

- Apply the dark-mode Zinc-950 background globally
- Set up `<html className="dark">` for Shadcn dark mode
- Import Google Fonts: Domine (headings), Poppins (text) (Do not change)
- Add a `<Toaster />` from Shadcn for notifications

---

### Step 2.2 · Sidebar Navigation Component

> File: `src/components/layout/Sidebar.tsx`

| Nav Item         | Route              | Icon (Lucide)   |
| ---------------- | ------------------ | --------------- |
| Dashboard        | `/dashboard`       | `LayoutDashboard`|
| Today's Workout  | `/workout`         | `Dumbbell`      |
| Problem Bank     | `/problems`        | `Library`       |
| Analytics        | `/analytics`       | `BarChart3`     |
| Settings         | `/settings`        | `Settings`      |

- Collapsible sidebar (icon-only mode on small screens)
- Active route highlighting

---

### Step 2.3 · Dashboard Layout (`src/app/(dashboard)/layout.tsx`)

- Route group `(dashboard)` wraps all authenticated pages
- Renders `<Sidebar />` + main content area
- Supabase auth check (redirect to `/login` if unauthenticated)

---

## Phase 3 — Authentication

### Step 3.1 · Login / Sign-Up Page

> File: `src/app/(auth)/login/page.tsx`

- Email + Password auth via Supabase
- Shadcn `<Card>`, `<Input>`, `<Button>` components
- Server Action for `signUp` and `signIn`
- Redirect to `/dashboard` on success

---

### Step 3.2 · Auth Middleware

> File: `src/middleware.ts`

- Protect all `/(dashboard)` routes
- Refresh Supabase session cookies on every request

---

## Phase 4 — The Core Engine: SM-2 Algorithm

### Step 4.1 · SM-2 Pure Function

> File: `src/lib/sm2.ts`

This is a **pure TypeScript function** — no database, no side effects. Input/Output:

```
Input:  { quality: 0–5, repetitions, easinessFactor, interval }
Output: { repetitions, easinessFactor, interval, nextReviewDate }
```

**Algorithm Summary (SuperMemo-2):**

1. If `quality >= 3` (correct recall):
   - `repetitions += 1`
   - If rep 1 → `interval = 1`
   - If rep 2 → `interval = 6`
   - Else → `interval = round(interval * easinessFactor)`
2. If `quality < 3` (forgot):
   - `repetitions = 0`, `interval = 1`
3. Update EF: `EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))`
4. Clamp EF to minimum `1.3`

> [!NOTE]
> Build this as a standalone, **testable** utility first. We'll wire it into Server Actions later.

---

## Phase 5 — The "Daily 3" Workout (USP Feature)

### Step 5.1 · Workout Generation Server Action

> File: `src/actions/workout.ts`

**`"use server"` function: `generateWorkout(userId)`**

Logic:
1. Query `user_progress` for the problem with the **earliest `next_review_date`** that is ≤ today → **Revision Problem**
2. Read that problem's `patterns` array
3. Query `problems` for 2 unsolved problems (`NOT IN user_progress`) that share at least one pattern (`patterns && revisionProblem.patterns`) → **Discovery Problems**
4. Return an array of 3 problems

---

### Step 5.2 · Workout Page UI

> File: `src/app/(dashboard)/workout/page.tsx`

| Section                | Component                | Details                               |
| ---------------------- | ------------------------ | ------------------------------------- |
| Header                 | —                        | "Today's Workout" + date             |
| Generate Button        | `<Button>`               | Calls `generateWorkout` Server Action |
| Revision Card          | `<WorkoutCard />`        | Gold/amber accent, "REVISION" badge  |
| Discovery Card ×2      | `<WorkoutCard />`        | Blue accent, "DISCOVERY" badge       |

---

### Step 5.3 · `<WorkoutCard />` Component

> File: `src/components/workout/WorkoutCard.tsx`

- Displays: title, difficulty badge, pattern tags, LeetCode link
- "Mark as Done" button → opens a quality-rating modal (0–5 scale)
- "Stuck Note" reveal button (only for revision cards with existing notes)
- On submit → Server Action runs SM-2, updates `user_progress`, logs to `activity_log`

---

## Phase 6 — Problem Bank

### Step 6.1 · Problem List Page

> File: `src/app/(dashboard)/problems/page.tsx`

- Server-side fetch of all problems
- Filterable by: **pattern** (multi-select), **difficulty**, **status** (new/learning/mastered)
- Sortable by: LeetCode number, difficulty, next review date
- Uses Shadcn `<Table>`, `<Badge>`, `<Select>`

---

### Step 6.2 · Add Problem Form

> File: `src/components/problems/AddProblemForm.tsx`

- Form to manually add a problem to the bank
- Multi-select for `patterns` (predefined list of ~15 common patterns)
- Server Action: `addProblem(formData)`

---

## Phase 7 — Stuck Notes

### Step 7.1 · Stuck Note Editor

> File: `src/components/problems/StuckNoteEditor.tsx`

- Inline text editor on the problem detail / workout card
- "Save Hint" → Server Action updates `user_progress.stuck_note`
- "Reveal Hint" button with a blur/spoiler animation

---

## Phase 8 — Activity Heatmap

### Step 8.1 · Heatmap Data Server Action

> File: `src/actions/activity.ts`

- `getActivityData(userId)` → Returns last 90 days of `{ date, count }` from `activity_log`

---

### Step 8.2 · `<ActivityHeatmap />` Component

> File: `src/components/dashboard/ActivityHeatmap.tsx`

- GitHub-style 90-day contribution grid
- Color intensity based on problems solved that day (0 = empty, 1 = light, 2 = medium, 3+ = bright)
- Tooltip on hover: "3 problems on Jun 15, 2026"
- Built with plain CSS Grid + dynamic class names (no heavy library)

---

## Phase 9 — Pattern Analytics Dashboard

### Step 9.1 · Analytics Data Server Action

> File: `src/actions/analytics.ts`

- `getPatternAnalytics(userId)` → Returns per-pattern stats:
  - `{ pattern, total, solved, mastered, avgEF }`

---

### Step 9.2 · Analytics Page

> File: `src/app/(dashboard)/analytics/page.tsx`

| Visual                 | Library    | What it shows                         |
| ---------------------- | ---------- | ------------------------------------- |
| Radar Chart            | Recharts   | Mastery level per pattern             |
| Stacked Bar Chart      | Recharts   | New / Learning / Mastered per pattern |
| Summary Cards          | Shadcn     | Total solved, current streak, avg EF  |

---

## Phase 10 — Polish & Ship

### Step 10.1 · Loading & Error States

- Add Shadcn `<Skeleton>` loaders to every async page
- Add `error.tsx` and `not-found.tsx` to route groups

### Step 10.2 · Seed Data Script

- Create a seed script (`src/lib/seed.ts`) with ~50 curated LeetCode problems across all major patterns
- Run via a one-time Server Action or CLI script

### Step 10.3 · Responsive Design Pass

- Ensure sidebar collapses on mobile
- Workout cards stack vertically
- Heatmap scrolls horizontally on small screens

### Step 10.4 · Deployment

- Deploy to **Vercel** (zero-config for Next.js)
- Set environment variables in Vercel dashboard
- Connect to Supabase production project

---

## Build Order Summary

> [!IMPORTANT]
> Each row below is **one step**. We build them one at a time, on your command.

| #  | Step                              | Type        | Key Files                                |
|----|-----------------------------------|-------------|------------------------------------------|
| 1  | Initialize Next.js + Tailwind     | Setup       | `package.json`, `tailwind.config.ts`     |
| 2  | Install & configure Shadcn UI     | Setup       | `components.json`, `globals.css`         |
| 3  | Install dependencies              | Setup       | `package.json`                           |
| 4  | Supabase client utilities         | Config      | `src/lib/supabase/client.ts`, `server.ts`|
| 5  | Database schema (SQL)             | Database    | Supabase SQL Editor                      |
| 6  | Global layout + dark theme        | Component   | `src/app/layout.tsx`                     |
| 7  | Sidebar navigation                | Component   | `src/components/layout/Sidebar.tsx`      |
| 8  | Dashboard layout (route group)    | Component   | `src/app/(dashboard)/layout.tsx`         |
| 9  | Auth pages (login/signup)         | Feature     | `src/app/(auth)/login/page.tsx`          |
| 10 | Auth middleware                   | Config      | `src/middleware.ts`                       |
| 11 | SM-2 algorithm                    | Logic       | `src/lib/sm2.ts`                         |
| 12 | Workout generation action         | Logic       | `src/actions/workout.ts`                 |
| 13 | Workout page UI                   | Component   | `src/app/(dashboard)/workout/page.tsx`   |
| 14 | WorkoutCard component             | Component   | `src/components/workout/WorkoutCard.tsx` |
| 15 | Problem bank page                 | Component   | `src/app/(dashboard)/problems/page.tsx`  |
| 16 | Add problem form                  | Component   | `src/components/problems/AddProblemForm.tsx`|
| 17 | Stuck note editor                 | Component   | `src/components/problems/StuckNoteEditor.tsx`|
| 18 | Activity heatmap data action      | Logic       | `src/actions/activity.ts`                |
| 19 | Activity heatmap component        | Component   | `src/components/dashboard/ActivityHeatmap.tsx`|
| 20 | Analytics data action             | Logic       | `src/actions/analytics.ts`              |
| 21 | Analytics page + charts           | Component   | `src/app/(dashboard)/analytics/page.tsx` |
| 22 | Loading/error states              | Polish      | `loading.tsx`, `error.tsx`              |
| 23 | Seed data script                  | Data        | `src/lib/seed.ts`                       |
| 24 | Responsive design pass            | Polish      | Various files                           |
| 25 | Deploy to Vercel                  | DevOps      | Vercel dashboard                        |

---

## Phase 11 — Enhancements: Expanded Solved Sync & Mastered Filters

To ensure the spaced repetition algorithm functions effectively over long timelines:

1. **LeetCode Sync Expansion:** Querying `recentAcSubmissionList` with a limit of `100` returns only accepted submissions, capturing a much larger history of solved problems without needing session cookies.
2. **Mastered Problems Presentation:** Hide placeholder dates like `"9999-12-31"` on the Problem Bank, displaying `"—"` instead, and pushing them to the end of the sort order.
3. **Rebalancing Exclusion:** Mastered problems (status `"mastered"` or next review date `"9999-12-31"`) are completely omitted from the "Rebalance Reviews" load balancer.

---

## Folder Structure (Final)

```
D:\coding\react\Pattern++\
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── workout/
│   │   │   │   └── page.tsx
│   │   │   ├── problems/
│   │   │   │   └── page.tsx
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx          ← Landing / redirect
│   ├── actions/
│   │   ├── auth.ts
│   │   ├── workout.ts
│   │   ├── problems.ts
│   │   ├── activity.ts
│   │   └── analytics.ts
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx
│   │   ├── workout/
│   │   │   └── WorkoutCard.tsx
│   │   ├── problems/
│   │   │   ├── AddProblemForm.tsx
│   │   │   └── StuckNoteEditor.tsx
│   │   ├── dashboard/
│   │   │   └── ActivityHeatmap.tsx
│   │   └── ui/               ← Shadcn components auto-installed here
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── sm2.ts
│   │   ├── seed.ts
│   │   └── utils.ts          ← Shadcn utility (cn function)
│   └── types/
│       └── index.ts          ← Shared TypeScript interfaces
├── public/
├── .env.local
├── tailwind.config.ts
├── next.config.mjs
├── components.json           ← Shadcn config
├── tsconfig.json
└── package.json
```

---

## Phase 12 — Enhancements: revision capacity limits & topic matching

To address revision backlog and prevent Easy problems from entering the scheduling pool:

1. **Daily Revision Cap:** Changed `MAX_REVIEWS_PER_DAY` to `1` and extended `MAX_SPREAD_DAYS` to `60` in `review-spread.ts` to guarantee that at most 1 revision problem is scheduled per day.
2. **Easy Problem Exclusions:** All "Easy" difficulty problems are immediately marked as `"mastered"` with next review date `"9999-12-31"` during sync and when rated, excluding them from revision scheduling entirely.
3. **Discovery Topic Restriction:** Discovery problems in the daily workout are strictly restricted to match the revision problem's patterns/topics. If a revision problem is present, general fallbacks of unrelated topics are blocked.

---

> **Ready?** Just say **"Step 1"** (or whichever step number) and I'll build exactly that one piece — nothing more, nothing less.
