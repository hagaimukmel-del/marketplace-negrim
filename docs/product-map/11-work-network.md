# 11 · נגרים עובדים ביחד — job board between carpentries
Verified: 2026-10-15

## Purpose
A carpentry with a job it needs help on posts it; a carpentry that fits (type of work, region)
answers and they coordinate. A standalone service, separate from המציאון. Phase 1 (board,
posting, profile, reports, admin) is built; conversations (phase 2), email notifications
(phase 3) and billing (phase 4) are not.

## Entry points
| Route | What |
|---|---|
| `/app/work` | Closed (`WORK_BOARD_OPEN` unset): the "בקרוב" page with a profile CTA. Open, or for the operator: the board, filtered by region and job type through the query string |
| `/app/work/[id]` | One job. "אני מעוניין" is a disabled placeholder until phase 2. Report button |
| `/app/work/new` | Post a job (members, board open) |
| `/app/work/mine` | The poster's jobs: close with an outcome, or remove |
| `/app/work/profile` | Capabilities profile. Open before the board; the first save is joining (founding) |
| `/admin/work` | Launch condition (profiles, open jobs), close outcomes, open reports, all jobs. Nav item "עבודות" with the open-report count |
| `/app` home card, sidebar "עבודות", welcome popup | Say "בקרוב" until the board opens |

## Code
`src/lib/work.ts` (closed lists, validation, expiry, `subscriptionGrants`, `toBoardJob`),
`src/lib/work-server.ts` (`workBoardOpen`, `getWorkViewer`, `loadBoard`, `loadJob`),
`src/app/api/work/{jobs,profile,report}`, `src/app/api/admin/work`, `src/app/app/work/*`,
`src/app/admin/(guarded)/work/*`. Tests: `src/lib/work*.test.ts`, `src/app/api/work/*/route.test.ts`.

## Data
Migration `20261015130000_work_network` (on staging and production since 2026-10-15): `work_profiles`, `work_jobs`,
`work_job_reports`, `work_subscriptions`, bucket `work-images` (public, one photo per job). RLS on,
no policy: server only. `work_jobs` has two FKs to `carpenters`, so embeds name
`carpenters!work_jobs_carpenter_id_fkey`.

## Rules & invariants
- Membership is one function, `subscriptionGrants`: founding yes, active until `ends_at`, else no.
  Saving the profile inserts a founding row on conflict do nothing.
- Without membership a carpentry sees jobs but not who posted. `toBoardJob` strips the poster on
  the server; it must never be hidden only in markup.
- A job leaves the board at the end of its due day, 30 days at most, as a read-time filter.
- Spam limits: 5 posts a day, 20 open jobs. 3 open reports from different carpentries pause a job
  until the operator restores or removes it.
- No title, price or client details on a job; the closed type list is the title.
- The service's colour is dark teal (#0E5E5E).

## Status
Phase 1 built, behind `WORK_BOARD_OPEN`; migration applied, flow check on staging and launch open (T-030). Spec and mockups:
project files `work-network/spec-v2.md` and the owner's consultation doc.

## Open tasks
- T-030 Check on staging, merge, then open the board.
