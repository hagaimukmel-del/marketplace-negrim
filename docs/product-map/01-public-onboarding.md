# 1 · Public site & onboarding
Verified: 2026-10-05

## Purpose
The front door: explains the marketplace, registers carpenters (free) and takes supplier
applications. A visitor can browse products without prices; prices appear after registration.

## Entry points
| Route | What |
|---|---|
| `/` | Landing page (`app/Landing.tsx`, static, no DB read) for visitors; a signed-in carpenter is redirected to `/app`. A visitor who opens `/app`, signs out, or leaves the terms gate lands back here. Copy must stay within CLAUDE.md §0's "safe to advertise" list |
| `/join` → `POST /api/join` | Carpenter registration. The only public endpoint that writes. Dedupes on the last 9 phone digits and emails a login link to the address on file. Rate-limited in memory: 3 per phone and 10 per IP per hour. A new registration goes through `/carpenter/link/[token]` to `/app`, never to the offer page or the catalogue |
| `/o/[token]` | A carpenter's personal link. The token **is** the identity; resolved on the server every time. With no active campaign it goes through `/carpenter/link/[token]` (sets the session cookie) to the carpentry's home `/app`; with a campaign it shows the offer page, which has a "למסך הבית" button |
| `/carpenter/enter/[token]` + `/api/carpenter/session` | Link → carpenter cookie session, the carpenter counterpart of `/supplier/enter` |
| `/join` login box → `POST /api/carpenter/login-link`, then `POST /api/carpenter/login-code` | Sign in on a new device: email or phone → a six-digit code mailed to the address on file (with the link) → typed on the same page. `lib/login-code.ts`, table `login_codes` |
| _Landing rule_ | Every way in for a carpentry (`/`, the personal link, the emailed link, the email code, Google, registration, the home-screen icon) lands on `/app`, the home screen. iOS saves the page open at "Add to Home Screen" and ignores `start_url`, so `components/app/HomeScreenLaunch.tsx` swaps the first page of each standalone launch for `/app`. Only an explicit `?next=` from a page the carpenter was on sends them back there |
| `/carpenter/google` → `/carpenter/google/callback` | "כניסה עם גוגל": a verified Google email that is a carpentry's email on file signs in. Hidden until `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set (`lib/google-auth.ts`). Never creates a carpentry |
| `/supplier/join` → `POST /api/supplier-join` | Supplier application; the operator approves it in `/admin/suppliers` |
| `/terms` → `POST /api/terms/accept` | Terms; acceptance is mandatory at registration (`TermsGate`, `lib/terms.ts` version) |
| Every page except `/admin`, `/supplier`, `/doc` | Launch-period welcome popup (`components/WelcomePopup.tsx`, mounted in the root layout). Once per visit (sessionStorage), new and returning visitors alike; sits under `TermsGate`. Says the site is free for everyone (and so is the work network, which opens soon) and gives the feedback address |
| `/auth/login`, `/auth/signup` | **Legacy** pages from an abandoned account model. Nothing links to them |

## Code
`src/app/page.tsx`, `src/app/Landing.tsx`, `src/app/join/`, `src/app/o/[token]/`, `src/app/supplier/join/`,
`src/components/TermsGate.tsx`, `src/components/WelcomePopup.tsx`, `lib/carpenter-auth.ts`, `lib/carpenter-session.ts`,
`lib/login-code.ts`, `lib/google-auth.ts`, `lib/terms.ts`, `lib/regions.ts` (region picked at registration), emails in `lib/emails/carpenter.ts`
and `lib/emails/supplier-application.ts`.

## Data
`carpenters` (incl. `token`, address, region, source), `suppliers` (applications, `status`), terms
acceptance columns, `login_codes` (one-time login codes, service role only).

## Rules & invariants
- No passwords for carpenters: personal link plus a cookie session. A new device gets a one-time code by email (10 minutes, one use, 5 tries, only the latest counts; stored as an HMAC) plus the login link (`/api/carpenter/login-link`). Typing the code or signing in with Google confirms the email, like the link's `?v=`.
- Every server use re-resolves the token. Never trust a client-supplied carpenter id (CLAUDE.md §6, security model).
- One phone and one email per carpentry: `/api/join` treats either as "already registered" and mails a login link to the address on file; the profile refuses an email another carpentry holds.
- Signup mails a welcome email. Every emailed entry link carries `?v=` (an HMAC of token + email, `emailProof()` in `lib/carpenter-auth.ts`); opening it sets `carpenters.email_verified_at`. Changing the email clears it.
- Opening an emailed entry link in a browser not signed in to that account mails the owner a "new device" notice (`lib/emails/new-device.ts`), for carpenters and suppliers.
- Bumping `TERMS_VERSION` makes everyone re-accept. Change it only when the terms change in substance.

## Status
Live. Accessibility statement and terms review before a wide launch are open in `TODO.md`.

## Open tasks
T-015, T-032, T-033
