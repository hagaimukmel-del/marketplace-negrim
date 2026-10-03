---
name: product-map
description: Read and maintain the Marketplace Negrim product map (docs/product-map/) and task files (docs/tasks/). Use when you need context on a site area before changing it (catalogue, cart/orders, agent chat, supplier or admin console, Metzion, campaigns, platform); when the user asks "what exists", "what's missing", "what's not aligned", "מה פתוח", "מה חסר", "מפת מוצר", "משימות"; when a change adds/removes a route, table or feature; when you find something unfinished or a claim the code doesn't back; and when finishing work that closes a task.
---

# Product map & tasks

Two on-demand folders give agents product context without loading it into every session:

- `docs/product-map/`: what exists, by area (10 files plus README). Each file has the headings Purpose / Entry points / Code / Data / Rules / Status / Open tasks.
- `docs/tasks/`: what's missing, misaligned, unfinished or planned. One `T-###.md` per task, frontmatter format in `docs/tasks/README.md`.

These are **not** imported into CLAUDE.md or memory. Keep it that way: no `@docs/...` imports, no task IDs or task details in CLAUDE.md or memory files. Read them when a task needs them; that's the point.

## Reading
1. Open `docs/product-map/README.md`, pick the area, and read only that file.
2. Need the gaps? Follow the area's "Open tasks" IDs to `docs/tasks/T-###.md`. For the full picture, use the index at the bottom of `docs/tasks/README.md`.
3. The map can drift. Before relying on a route or table, confirm it in the code (a quick `ls`/`grep`).

## Writing: in the same commit as the code change
- **Feature added, moved or removed**: update the area file (entry points, code, data, status) and its `Verified:` date.
- **Gap found** (unfinished code, a TODO, marketing or CLAUDE.md claiming more than the code does): create the next `T-###.md`, add its ID to the area's Open tasks, and regenerate the index.
- **Task finished**: set `status: done` and `updated:`, add a Notes line (commit, how verified), remove the ID from the area's Open tasks, update the area's Status, and regenerate the index.
- **A "promised" capability becomes real**: also update CLAUDE.md §0 "safe to advertise", but only after it passes the `nagarim-smoke-test` skill on staging.

Regenerate and check the index (from the repo root):
```bash
python .claude/skills/product-map/scripts/task_index.py
python .claude/skills/product-map/scripts/task_index.py --check
```

## Style
English, short, factual, with file paths. Hebrew only for UI strings and quotes. State what the code does, not intentions; plans go in a task's "Done when". Don't duplicate CLAUDE.md rules; link to the section.

## Reporting to the owner
In Hebrew, as a compact table: ID · עדיפות · סטטוס · מה חסר. The owner's own backlog stays `TODO.md`; tasks are for agent-actionable work.
