# 11 · נגרים עובדים ביחד — job board between carpentries
Verified: 2026-10-15

## Purpose
A carpentry with a job it needs help on posts it; a carpentry that fits (type of work, region)
answers and they coordinate in a private in-site conversation. A standalone service, separate
from המציאון. Today only a "coming soon" page exists.

## Entry points
| Route | What |
|---|---|
| `/app/work` | "בקרוב" page: how it will work, a sample job card (marked דוגמה), the job types, the launch region (Ashdod southward). Static, no data. Becomes the board when it ships |
| `/app` home card, sidebar "עבודות · בקרוב", welcome popup | Links to `/app/work` |

## Code
`src/app/app/work/page.tsx`, `WorkNetwork` in `src/app/app/HomeView.tsx`, the sidebar entry in
`src/components/app/AppShell.tsx`, the link in `src/components/WelcomePopup.tsx`.

## Data
None yet. The planned tables (`work_profiles`, `work_jobs`, `work_job_reports`,
`work_subscriptions`, then conversations and attachments) are in the spec, not in a migration.

## Rules & invariants
The page must not claim the board is live: everything on it is phrased as coming. The service's
own colour is dark teal (#0E5E5E), apart from the purchasing amber and Metzion's wood.

## Status
Coming soon. Spec and mockups live in the project files (`work-network/spec-v2.md`) and the
owner's consultation doc; phase 1 waits on the owner's go-ahead.

## Open tasks
None filed yet.
