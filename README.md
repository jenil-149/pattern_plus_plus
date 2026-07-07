# Pattern++

A LeetCode study tracker that generates a personalized daily "Daily 3" workout using spaced repetition. The app syncs your accepted submissions from LeetCode, tracks your progress per problem, and schedules future reviews using the SM-2 algorithm.

## Features

- Google OAuth authentication via Supabase Auth
- Sync accepted LeetCode submissions by username (queries the LeetCode GraphQL API)
- Auto-inserts problems not in the local database by fetching details from LeetCode
- Daily 3 workout: one revision problem, up to two discovery problems from the same pattern
- Problems tagged as REVISION, DISCOVERY, or NEW based on your history
- Rate each problem after solving (Again / Hard / Good / Easy) to update SM-2 state
- Load-balanced review scheduling: no more than one review per day, spreads overflow up to 60 days ahead
- Easy problems and mastered problems (5+ repetitions) are permanently archived and never re-queued
- Activity heatmap showing solve history across days
- Streak tracking
- Problem bank page: view, filter, and manually add problems by title slug
- Analytics page with solve and streak charts using Recharts
- Settings page to set LeetCode username
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
| Font | System default via next-themes |

## Project Structure

```
src/
  actions/
    leetcode.ts            # LeetCode GraphQL sync and SM-2 progress update
    problems.ts            # Problem bank CRUD
    activity.ts            # Activity log queries
    profile.ts             # Profile read/update
    workout/
      get-daily-workout.ts # Daily 3 generation logic
      rate-problem.ts      # Post-solve rating and SM-2 recalculation
      toggle-solved.ts     # Mark solved without rating
  lib/
    sm2.ts                 # SuperMemo-2 algorithm
    review-spread.ts       # Load-balancing for review dates
    leetcode.ts            # LeetCode GraphQL client
    supabase/              # Supabase server and client instances
  components/
    dashboard/             # Heatmap, StreakCard, SyncButton
    workout/               # WorkoutCard, WorkoutSection
    problems/              # ProblemTable, ProblemFilters, AddProblemDialog
    layout/                # Sidebar, AuthModal
    ui/                    # shadcn/ui primitives
  app/
    (dashboard)/
      dashboard/           # Main dashboard
      workout/             # Daily workout page
      problems/            # Problem bank
      analytics/           # Analytics charts
      settings/            # LeetCode username config
  providers/               # AuthProvider, ModalProvider
  hooks/                   # useAuthModal
```

## Getting Started

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

3. Run the dev server:

```bash
npm run dev
```

4. Set your LeetCode username in the Settings page, then click Sync to import your submission history.

## How the Spaced Repetition Works

Each time you solve a problem, you rate your recall from 0-5. The SM-2 algorithm uses this rating to calculate:

- Updated easiness factor (minimum 1.3)
- Next interval in days
- Number of repetitions

After 5 successful repetitions, a problem is marked as mastered and removed from the review queue permanently. Easy difficulty problems are also immediately archived.

Review dates are load-balanced: if the SM-2 target date already has a review scheduled, the new review is pushed forward day by day until an open slot is found (up to 60 days ahead).

When you sync from LeetCode, a default quality of 4 is used for imported solves since recall effort cannot be inferred from submission data.

## Learnings

- **SM-2 from scratch** - Implementing the SuperMemo-2 algorithm directly in TypeScript clarified how easiness factor decay works and why the minimum EF of 1.3 matters for preventing runaway short intervals.
- **LeetCode GraphQL scraping** - LeetCode does not have a public API. Queries go through their internal GraphQL endpoint. The endpoint is rate-limited and occasionally returns CORS errors in the browser, so all LeetCode calls are done server-side as Next.js Server Actions.
- **Load balancing review dates** - Raw SM-2 output can pile all reviews onto the same day. A separate `getBalancedReviewDate` pass queries the current schedule and pushes overloaded days forward, keeping one review per day.
- **Dynamic problem insertion** - If a synced submission is not in the local problem bank, the app fetches its metadata from LeetCode and inserts it automatically. This means the bank grows passively as you solve new problems.
- **Supabase SSR with Next.js App Router** - Using `@supabase/ssr` requires two separate client instances: one for Server Components and Server Actions, one for Client Components. Mixing them causes session desync.
- **shadcn/ui component ownership** - shadcn copies components into your source tree instead of installing them as a black-box dependency. This made it easy to modify primitives but also means keeping them updated is a manual task.
- **next-themes dark mode** - Wrapping the layout in a `ThemeProvider` and using CSS variables for color tokens is the cleanest way to support dark mode without flash, as long as the root `html` tag does not hardcode a color scheme.
