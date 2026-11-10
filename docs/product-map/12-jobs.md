# 12. דרושים (`/app/jobs`, `/supplier/jobs`)

## Purpose
A board of job ads ("דרושים"): carpentries and suppliers post the people they are looking for
(a production carpenter, a CNC operator, a driver, a sales rep), and both read the board. The site
only shows the ad; the interested side calls or sends a WhatsApp. Built 2026-11-10 at the owner's
request. Separate from the work network (area 11), which reports "דרוש עובד" as off-topic.

## Entry points
- Carpenter: `/app/jobs` (board), `/app/jobs/new`, `/app/jobs/mine`. Last item in the desktop
  sidebar; a card on the home screen on a phone.
- Supplier: `/supplier/jobs`, `/supplier/jobs/new`, `/supplier/jobs/mine`. Link in `SupplierNav`.
- API: `POST /api/jobs` (create), `PATCH /api/jobs` (close / extend 30 days),
  `GET /api/jobs/contact?id=` (the phone, on a tap).

## Code
- `src/lib/jobs.ts`: vocabulary (six regions, weekdays, scopes) and `readJobInput` validation. Tests in `jobs.test.ts`.
- `src/lib/jobs-server.ts`: board and "my ads" reads, the live-owner rule.
- `src/components/jobs/`: `JobForm` (with a multi-date calendar), `JobsBoard`, `JobPostCard`, `MyJobs`.

## Data
`job_posts` (migration `20261110130000_job_posts`). RLS on, no policy: service role only.
One owner per row, a carpenter or a supplier (`job_posts_one_owner`).

## Rules & invariants
- Every field is typed freely (owner, 2026-11-10), except the region: six regions, the owner's
  list (צפון, השרון, מרכז, שפלה, י-ם והסביבה, דרום). Haifa falls under צפון here.
- Work days are one of: weekdays (+ optional hours), up to 31 dates within 90 days, or free text.
- The phone is never in the board's payload; it is fetched on a tap by a signed-in carpentry or supplier.
- An ad stays 30 days. Limits: 5 new ads a day, 20 open at once, per owner.
- Ads of a blocked carpenter or an unapproved supplier disappear from the board.

## Status
Built, migration not yet applied (staging first, then production on the owner's yes).

## Open tasks
None yet. Ideas not built: reporting an ad, admin moderation, contact through site messages.
