---
name: nagarim-migrations
description: Staging-first database migration workflow for the Marketplace Negrim (nagarimb2b.com) Supabase project. Use whenever a change in the marketplace-negrim repo touches the database — a new table, column, index, RLS policy, function, storage bucket or seed — or when the user asks to "push a migration", "apply to staging/production", "db push", "מיגרציה", "להעלות לסטייג'ינג", "לעדכן את הדאטאבייס", or asks which migrations are applied where. Also use before writing any SQL file under supabase/migrations/, even if the user didn't say "migration".
---

# Nagarim migrations — staging first, production on purpose

Marketplace Negrim has two Supabase databases:

| | Project ref | How to push |
|---|---|---|
| **Staging** `marketplace-negrim-staging` | `dyueyfmuhwvpgocbypqz` | `npm run db:push:staging` (reads `.env.staging.local`) |
| **Production** `marketplace-negrim` | `ihburmhtcfhwlairyfyf` (the linked project) | `npm run db:push` |

On 2026-09-10 a migration went straight to production and broke it. Staging exists so that never happens again. Every migration goes to staging first, gets checked there, and reaches production only after the user explicitly says yes.

## 0. Pre-flight

1. `git pull --ff-only` in the repo. The user works on more than one computer, and a migration written against a stale tree can collide with one that was already pushed.
2. Read `CLAUDE.md` §5–6 (business rules, catalogue shape, security model) if you haven't this session.
3. Check that `.env.staging.local` exists. Some machines have no env files at all. If it's missing, **stop**: tell the user, ask them to copy it from the other computer, and finish writing the SQL in the meantime. Never work around a missing staging file by pushing to production.

## 1. Write the migration

- **Filename**: `supabase/migrations/YYYYMMDDHHMMSS_snake_case.sql`. The timestamp must be later than the last file in the folder (`ls supabase/migrations | tail -1`).
- **Header comment** that explains *why*, in the house style (see `20260916120000_import_batches.sql`). Future readers are deciding whether they can drop something, so tell them what depends on it.
- **Idempotent where cheap**: `create table if not exists`, `add column if not exists`, `create index if not exists`, `drop policy if exists` before `create policy`. Then a half-applied push can be re-run.
- **RLS on every new table**: `alter table … enable row level security;`. The default in this project is *no policy*, which means server-only access through the service role. Add a policy only when the browser (anon key) genuinely has to read the table, and state in a comment who can read what. See the security model in CLAUDE.md.
- **Respect the binding rules**:
  - Prices are excl. VAT and stored per `base_unit`. `base_unit` is the closed vocabulary `unit/kg/liter/meter/sqm`; never turn it into free text.
  - Order amounts are snapshots, so never add a computed column that re-derives them from current prices.
  - Order status reflects fulfilment, never payment. There are no payment tables.
- **No test data in migrations.** Migrations run on production too, so a seeded test carpenter or test supplier ends up in the live database. Put test fixtures in a script that targets staging only (like `create-test-carpenter.ts`). If you find an existing migration that seeds test rows, point it out to the user. Don't edit an already-applied migration.
- **Destructive changes in two steps.** Dropping or renaming a column the deployed code still reads breaks production between the push and the Vercel deploy. First ship code that stops using the column, then drop it in a later migration.
- **Never edit an applied migration.** Fix forward with a new file.

## 2. Apply to staging

```bash
npm run db:push:staging -- --dry-run   # shows which files would apply
npm run db:push:staging
```

The script masks the DB password in its output. Don't print `.env.staging.local` or echo connection strings either.

Then verify on staging:
- `npm run type-check` and `npm run build`. Types come from production (see step 4), so a new column may show as a type error until then. That's expected; note it rather than "fixing" it with `any`.
- Run the **nagarim-smoke-test** skill (or at least the flow the migration affects) against `npm run dev`. `.env.local` points at staging, and the yellow strip confirms it.

## 3. Production — only on an explicit yes

Report what was applied to staging and how it was checked. Then ask: *"להחיל גם על פרודקשן?"* Wait for a clear yes in this conversation. An earlier approval for a different migration doesn't count.

```bash
npx supabase migration list            # linked = production: what is applied there
npm run db:push -- --dry-run
npm run db:push
```

## 4. After production

1. `npm run db:types`. This regenerates `src/lib/database.types.ts` from **production**, which is why it runs last. Hand-written aliases live in `src/lib/db.ts` and survive regeneration.
2. `npm run type-check && npm run build`
3. Commit the migration and the regenerated types together, as one scoped commit.

## Status check: "what is applied where?"

```bash
npx supabase migration list                    # production
npm run db:push:staging -- --dry-run           # staging: lists pending files
```

Report this as a table (migration × staging × production) so drift is obvious at a glance.

## Report format

End with a short Hebrew summary:

```
מיגרציה: 20261003090000_supplier_contact_requests
סטייג'ינג: ✅ הוחלה · build עבר · smoke test: הזמנה + פאנל ספק עברו
פרודקשן: ⏸ מחכה לאישור שלך
```
