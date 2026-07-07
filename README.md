# Pattern++

A LeetCode study tracker that generates a personalized daily "Daily 3" workout using spaced repetition. Syncs your accepted submissions, tracks progress per problem, and schedules future reviews with the SM-2 algorithm.

## Features

- Google OAuth via Supabase Auth
- Sync accepted LeetCode submissions by username (LeetCode GraphQL API)
- Daily 3 workout: one revision problem + two discovery problems from the same pattern
- Problems tagged as REVISION, DISCOVERY, or NEW based on solve history
- Rate each solve (Again / Hard / Good / Easy) to update SM-2 state and next review date
- Load-balanced review scheduling: no more than one review per day, spreads overflow up to 60 days ahead
- Easy problems and mastered problems (5+ reps) are permanently archived
- Activity heatmap and streak tracking
- Problem bank: view, filter, and manually add problems
- Analytics page with solve charts
- Dark mode via next-themes

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| Charts | Recharts |
| Database and Auth | Supabase (PostgreSQL + Auth) |
| State Management | Zustand |
| Notifications | Sonner |
| Icons | Lucide React |

## Project Structure

```
src/
  actions/
    leetcode.ts          # LeetCode sync and SM-2 progress update
    problems.ts          # Problem bank CRUD
    activity.ts          # Activity log queries
    workout/             # Daily 3 generation, rating, toggle-solved
  lib/
    sm2.ts               # SuperMemo-2 algorithm
    review-spread.ts     # Load-balancing for review dates
    leetcode.ts          # LeetCode GraphQL client
    supabase/            # Server and client Supabase instances
  components/            # Dashboard, workout, problems, layout, shadcn ui
  app/(dashboard)/       # Dashboard, workout, problems, analytics, settings pages
  providers/             # AuthProvider, ModalProvider
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

3. Run the dev server:

```bash
npm run dev
```

4. Set your LeetCode username in Settings, then click Sync to import your submission history.

## Learnings

- **SM-2 from scratch** - Implementing SuperMemo-2 directly clarified how EF decay works and why the minimum EF of 1.3 prevents runaway short intervals.
- **LeetCode GraphQL** - LeetCode has no public API. All calls go through their internal GraphQL endpoint and must run server-side to avoid CORS.
- **Load balancing review dates** - Raw SM-2 output can pile all reviews onto the same day. A separate pass queries the current schedule and pushes overloaded dates forward.
- **Dynamic problem insertion** - If a synced submission is not in the local bank, the app fetches its metadata from LeetCode and inserts it automatically.
- **Supabase SSR split** - `@supabase/ssr` requires two separate clients: one for Server Components/Actions, one for Client Components. Mixing them causes session desync.
- **shadcn/ui ownership** - Components are copied into the source tree, not installed as a dependency. Easy to modify, but updates are manual.
