# 1 · Public site & onboarding
Verified: 2026-10-05

## Purpose
The front door: explains the marketplace, registers carpenters (free) and takes supplier
applications. A visitor can browse products without prices; prices appear after registration.

## Entry points
| Route | What |
|---|---|
| `/` | Landing page (`app/Landing.tsx`, static, no DB read) for visitors; a signed-in carpenter is redirected to `/app`. Copy must stay within CLAUDE.md §0's "safe to advertise" list |
| `/join` → `POST /api/join` | Carpenter registration. The only public endpoint that writes. Dedupes on the last 9 phone digits and returns the same personal link |
| `/o/[token]` | A carpenter's personal link. The token **is** the identity; resolved on the server every time |
| `/supplier/join` → `POST /api/supplier-join` | Supplier application; the operator approves it in `/admin/suppliers` |
| `/terms` → `POST /api/terms/accept` | Terms; acceptance is mandatory at registration (`TermsGate`, `lib/terms.ts` version) |
| `/auth/login`, `/auth/signup` | **Legacy** pages from an abandoned account model. Nothing links to them |

## Code
`src/app/page.tsx`, `src/app/Landing.tsx`, `src/app/join/`, `src/app/o/[token]/`, `src/app/supplier/join/`,
`src/components/TermsGate.tsx`, `lib/carpenter-auth.ts`, `lib/carpenter-session.ts`,
`lib/terms.ts`, `lib/regions.ts` (region picked at registration), emails in `lib/emails/carpenter.ts`
and `lib/emails/supplier-application.ts`.

## Data
`carpenters` (incl. `token`, address, region, source), `suppliers` (applications, `status`), terms
acceptance columns.

## Rules & invariants
- No passwords for carpenters: personal link plus a cookie session; a login link can be re-sent by email (`/api/carpenter/login-link`).
- Every server use re-resolves the token. Never trust a client-supplied carpenter id (CLAUDE.md §6, security model).
- One phone and one email per carpentry: `/api/join` treats either as "already registered" and mails a login link to the address on file; the profile refuses an email another carpentry holds.
- Signup mails a welcome email. Every emailed entry link carries `?v=` (an HMAC of token + email, `emailProof()` in `lib/carpenter-auth.ts`); opening it sets `carpenters.email_verified_at`. Changing the email clears it.
- Bumping `TERMS_VERSION` makes everyone re-accept. Change it only when the terms change in substance.

## Status
Live. Accessibility statement and terms review before a wide launch are open in `TODO.md`.

## Open tasks
T-015, T-020
