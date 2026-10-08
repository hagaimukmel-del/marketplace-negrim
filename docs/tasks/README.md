# Tasks — gaps, unfinished work and what's next

One file per task (`T-###.md`). This is where work lives that **isn't done or doesn't match**
what the product claims: promise gaps, half-built features, debt, ops chores, open decisions.

**Read on demand only.** Nothing auto-loads this folder: not CLAUDE.md, not memory. Open it when
a task touches an area. Each area file in [`docs/product-map/`](../product-map/README.md) lists
its open task IDs. Never `@`-import a task into CLAUDE.md, and don't copy task details into
memory. Point to the ID instead.

`TODO.md` stays the owner's Hebrew backlog and decision log. When an item from it is picked up
or found to be misaligned, it gets a task here.

## Task file format

```markdown
---
id: T-022                 # next free number, same as the file name
title: Short imperative title
area: 03-agent-chat       # product-map file name without .md
type: promise-gap | incomplete | future | debt | ops | decision
status: open | in-progress | blocked | done
priority: P0 | P1 | P2 | P3   # P0 = now/risk, P3 = whenever
blocked_by: T-008 or a short reason, empty if none
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

## Context
What's wrong or missing, with file paths. Facts, not plans.

## Done when
A checkable outcome, ideally one the smoke-test skill can verify.

## Notes
Optional: decisions, pointers, dependencies.
```

**Types:** `promise-gap` = marketing or CLAUDE.md claims more than the code does ·
`incomplete` = built partway · `future` = planned new capability · `debt` = cleanup ·
`ops` = an action on infra/data, often the owner's · `decision` = needs the owner to choose.

**Lifecycle:** when work finishes, set `status: done` and `updated`, add a line under Notes
(commit hash, how it was verified), remove the ID from the area file's Open tasks, and
regenerate the index. Done tasks stay as history.

Regenerate the index after any change:
```bash
python .claude/skills/product-map/scripts/task_index.py
```

## Index

<!-- INDEX:START -->
23 open of 27.

| ID | Pri | Status | Type | Area | Title | Blocked by |
|---|---|---|---|---|---|---|
| [T-022](T-022.md) | P2 | in-progress | future | 04-orders-fulfilment | Purchase order and price quote as a file, per supplier | T-007 (agent tool only) |
| [T-002](T-002.md) | P0 | open | promise-gap | 05-catalogue-pricing | Onboard a second live supplier |  |
| [T-009](T-009.md) | P0 | open | ops | 10-platform | Rotate the staging service_role key |  |
| [T-001](T-001.md) | P1 | open | promise-gap | 03-agent-chat | Voice ordering in under a minute |  |
| [T-003](T-003.md) | P1 | open | promise-gap | 03-agent-chat | Agent: understand quantity and supplier preference in one sentence |  |
| [T-006](T-006.md) | P1 | open | promise-gap | 05-catalogue-pricing | Catalogue breadth: boards, timber, hardware, tools | T-002 |
| [T-012](T-012.md) | P1 | open | debt | 10-platform | Test data seeded into production by migrations |  |
| [T-004](T-004.md) | P2 | open | incomplete | 03-agent-chat | Agent: comparison answer | T-002 |
| [T-005](T-005.md) | P2 | open | promise-gap | 05-catalogue-pricing | Real stock availability |  |
| [T-007](T-007.md) | P2 | open | decision | 03-agent-chat | Decide: keyword agent vs LLM |  |
| [T-014](T-014.md) | P2 | open | debt | 05-catalogue-pricing | Supplier SKU, brand and mpn data |  |
| [T-021](T-021.md) | P2 | open | debt | 07-admin-console | Admin supplier-document upload always fails |  |
| [T-023](T-023.md) | P2 | open | future | 05-catalogue-pricing | Per-supplier price visibility and quote requests (RFQ) | a supplier who wants quote-only, or the supplier console stage A |
| [T-025](T-025.md) | P2 | open | future | 02-carpenter-app | Internal messages between carpenter and supplier |  |
| [T-026](T-026.md) | P2 | open | future | 05-catalogue-pricing | Supplier delivery regions; carpenters see suppliers that deliver to them | T-002 |
| [T-013](T-013.md) | P3 | open | debt | 05-catalogue-pricing | Product images: rehost from Google Drive |  |
| [T-015](T-015.md) | P3 | open | debt | 01-public-onboarding | Delete legacy /auth/login and /auth/signup |  |
| [T-016](T-016.md) | P3 | open | debt | 10-platform | Lint errors |  |
| [T-017](T-017.md) | P3 | open | incomplete | 03-agent-chat | Product documents visible to all carpenters |  |
| [T-019](T-019.md) | P3 | open | decision | 10-platform | CLAUDE.md rules vs reality: Zod, @supabase/ssr, Server Components |  |
| [T-024](T-024.md) | P3 | open | future | 09-campaigns-offers | "מוצר השבוע": a paid weekly promotion slot | T-002 |
| [T-027](T-027.md) | P3 | open | incomplete | 04-orders-fulfilment | Supplier logo on the purchase order and in the carpenter app |  |
| [T-011](T-011.md) | P1 | blocked | ops | 03-agent-chat | End-to-end test of the agent chat on staging | env files (work PC) |
| [T-008](T-008.md) | P0 | done | ops | 03-agent-chat | Apply migration supplier_contact_requests |  |
| [T-010](T-010.md) | P2 | done | incomplete | 03-agent-chat | "פנה לספק" should notify the supplier | T-008 |
| [T-020](T-020.md) | P2 | done | future | 01-public-onboarding | Email the account owner when a new device signs in |  |
| [T-018](T-018.md) | P3 | done | debt | 02-carpenter-app | Legacy /order search page | T-001 |
<!-- INDEX:END -->
