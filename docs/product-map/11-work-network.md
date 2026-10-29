# 11 · נגרים עובדים ביחד — job board between carpentries
Verified: 2026-10-29

## Purpose
A carpentry with a job it needs help on posts it; a carpentry that fits (type of work, region)
answers and they coordinate. A standalone service, separate from המציאון. Phase 1 (board,
posting, profile, reports, admin) is built, and so are phase 2 (conversations with a photo or
PDF per message) and phase 3 (email notifications); billing (phase 4) is not.

## Entry points
| Route | What |
|---|---|
| `/app/work` | Closed (`WORK_BOARD_OPEN` unset): the "בקרוב" page with a profile CTA. Open: a visitor who has not signed up sees the same explainer (no "בקרוב") with a sign-up CTA; a carpentry or the operator sees the board, filtered by region and job type through the query string. No launch area is named: the service is open to every region (owner, 2026-10-29) |
| `/app/work/[id]` | One job. "אני מעוניין" opens a conversation with a required first message; a carpentry that already answered goes back to it; the poster sees how many answered. Report button |
| `/app/work/messages` | The carpentry's conversations: jobs it answered and answers to its own jobs, unread first by weight |
| `/app/work/messages/[id]` | One conversation: messages, one photo or PDF per message, "שיתוף הטלפון שלי", block/unblock |
| `/app/work/new` | Post a job (members, board open) |
| `/app/work/mine` | The poster's jobs: close with an outcome, or remove |
| `/app/work/profile` | Capabilities profile. Open before the board; the first save is joining (founding). Email opt-in, with the address's verified state and a button that mails a verifying link. Members get "יציאה מנגרים עובדים ביחד" behind a confirmation (`DELETE /api/work/profile`) |
| `/api/work/unsubscribe?c&t` | One-click stop from the foot of every email, signed per carpentry; no sign-in |
| `/admin/work` | Launch condition (profiles, open jobs), close outcomes, open reports, all jobs. Nav item "עבודות" with the open-report count |
| `/app` home card, teal sidebar item (second, after בית), teal button in the top bar of every app page, welcome popup | Say "בקרוב" until the board opens |

## Code
`src/lib/work.ts` (closed lists, validation, expiry, `subscriptionGrants`, `toBoardJob`),
`src/lib/work-server.ts` (`workBoardOpen`, `getWorkViewer`, `loadBoard`, `loadJob`),
`src/lib/work-chat.ts` (conversation rules, file sniffing), `src/lib/work-chat-server.ts` (every
conversation read and write, scoped to the asking carpentry), `src/lib/work-notify.ts` (who is
emailed and when), `src/lib/work-notify-server.ts` (sending, from route handlers inside `after()`),
`src/lib/emails/work.ts` (the three emails),
`src/app/api/work/{jobs,profile,report,conversations,files}`, `src/app/api/admin/work`, `src/app/app/work/*`,
`src/app/admin/(guarded)/work/*`. Tests: `src/lib/work*.test.ts`, `src/app/api/work/*/route.test.ts`.

## Data
Migration `20261015130000_work_network` (on staging and production since 2026-10-15): `work_profiles`, `work_jobs`,
`work_job_reports`, `work_subscriptions`, bucket `work-images` (public, one photo per job). RLS on,
no policy: server only. `work_jobs` has two FKs to `carpenters`, so embeds name
`carpenters!work_jobs_carpenter_id_fkey`.
Migration `20261022100000_work_conversations` (staging and production since 2026-10-22):
`work_conversations` (one per job and carpentry that answered, poster/applicant read times,
`blocked_by`), `work_messages` (body and at most one file), private bucket `work-files`
(10MB, JPEG/PNG/WEBP/PDF). RLS on, no policy.
Migration `20261022140000_work_notifications` (staging 2026-10-22, production 2026-10-25):
`work_notifications`, one row per email decided on (`sent`, `capped`, `failed`), for the daily cap
and for measuring matches later.

## Rules & invariants
- Membership is one function, `subscriptionGrants`: founding yes, active until `ends_at`, else no.
  Saving the profile inserts a founding row on conflict do nothing.
- Leaving deletes nothing the carpentry wrote: its open and paused jobs become `removed`
  (`removed_reason` "owner: left the service"), `notify_email` goes off, and the founding row is
  deleted, so saving the profile again rejoins. Profile and conversations stay. A paid (`active`)
  term is refused with a 409 and goes through the operator, since it has a refund to settle.
- Without membership a carpentry sees jobs but not who posted. `toBoardJob` strips the poster on
  the server; it must never be hidden only in markup.
- A job leaves the board at the end of its due day, 30 days at most, as a read-time filter.
- Spam limits: 5 posts a day, 20 open jobs. 3 open reports from different carpentries pause a job
  until the operator restores or removes it.
- No title, price or client details on a job; the closed type list is the title.
- The service's colour is dark teal (#0E5E5E).
- Conversations: only a member answers a live job that is not theirs, 30 new conversations a day.
  A carpentry whose term ended reads but cannot write. Either side may block; the conversation is
  then read-only for both until the side that blocked lifts it. A phone is shared only by its own
  carpentry pressing "שיתוף הטלפון שלי".
- Files: the server checks the first bytes match the claimed type, cleans the name, stores the
  file in the private bucket; downloads go through `/api/work/files/[messageId]`, which checks the
  carpentry is a side and redirects to a 60-second signed link (PDF as a download).
- Emails (phase 3): a job that fits (type and region in the profile) to every member but the
  poster; an answer to the poster; a new message to the other side, once per run of unread
  messages. Only to an active carpentry that opted in and verified its address. At most 5 a day per
  carpentry, all kinds together; past it nothing is sent until tomorrow (logged `capped`), and the
  site still has everything. None while the board is closed, none in a blocked conversation.

## Status
Phases 1 to 3 live. The board is open to carpenters since 2026-10-25 (`WORK_BOARD_OPEN=true` on
Vercel production; the owner chose not to wait for 30 profiles and 10 jobs). All three migrations
are on both databases; phases 1 and 2 were checked on staging, phase 3 by its tests only. No daily digest for what the cap
holds back: it needs a scheduled job, and the site shows everything anyway. Spec and mockups:
project files `work-network/spec-v2.md` and the owner's consultation doc.

## Open tasks
- Phase 4 (billing) when a payment provider is chosen.
