# 1 · Public site & onboarding
Verified: 2026-10-04

## Purpose
The front door: explains the marketplace, registers carpenters (free) and takes supplier
applications. A visitor can browse products without prices; prices appear after registration.

## Entry points
| Route | What |
|---|---|
| `/` | Landing page |
| `/join` → `POST /api/join` | Carpenter registration. The only public endpoint that writes. Dedupes on the last 9 phone digits and returns the same personal link |
| `/o/[token]` | A carpenter's personal link. The token **is** the identity; resolved on the server every time |
| `/carpenter/enter/[token]` + `/api/carpenter/session` | Link → carpenter cookie session, the carpenter counterpart of `/supplier/enter` |
| `/supplier/join` → `POST /api/supplier-join` | Supplier application; the operator approves it in `/admin/suppliers` |
| `/terms` → `POST /api/terms/accept` | Terms; acceptance is mandatory at registration (`TermsGate`, `lib/terms.ts` version) |
| `/auth/login`, `/auth/signup` | **Legacy** pages from an abandoned account model. Nothing links to them |

## Code
`src/app/page.tsx`, `src/app/join/`, `src/app/o/[token]/`, `src/app/supplier/join/`,
`src/components/TermsGate.tsx`, `lib/carpenter-auth.ts`, `lib/carpenter-session.ts`,
`lib/terms.ts`, `lib/regions.ts` (region picked at registration), emails in `lib/emails/carpenter.ts`
and `lib/emails/supplier-application.ts`.

## Data
`carpenters` (incl. `token`, address, region, source), `suppliers` (applications, `status`), terms
acceptance columns.

## Rules & invariants
- No passwords for carpenters: personal link plus a cookie session; a login link can be re-sent by email (`/api/carpenter/login-link`).
- Every server use re-resolves the token. Never trust a client-supplied carpenter id (CLAUDE.md §6, security model).
- Bumping `TERMS_VERSION` makes everyone re-accept. Change it only when the terms change in substance.

## Status
Live. Accessibility statement and terms review before a wide launch are open in `TODO.md`.

## Open tasks
T-015
