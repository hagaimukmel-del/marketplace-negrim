#!/usr/bin/env python3
"""
Regenerate the task index in docs/tasks/README.md from the task files' frontmatter.

    python .claude/skills/product-map/scripts/task_index.py          # rewrite the index
    python .claude/skills/product-map/scripts/task_index.py --check  # exit 1 if it is stale

The index lives between the INDEX:START / INDEX:END markers, so the rest of the README is
hand-written and left alone. Run from the repo root.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path("docs/tasks")
README = ROOT / "README.md"
START, END = "<!-- INDEX:START -->", "<!-- INDEX:END -->"
ORDER = {"in-progress": 0, "open": 1, "blocked": 2, "done": 3}


def frontmatter(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---", text, re.S)
    if not m:
        sys.exit(f"{path}: missing frontmatter")
    fields = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            fields[key.strip()] = value.strip()
    for key in ("id", "title", "area", "type", "status", "priority"):
        if not fields.get(key):
            sys.exit(f"{path}: frontmatter needs '{key}'")
    if fields["id"] != path.stem:
        sys.exit(f"{path}: id {fields['id']} does not match the file name")
    return fields


def build():
    tasks = [frontmatter(p) for p in sorted(ROOT.glob("T-*.md"))]
    tasks.sort(key=lambda t: (ORDER.get(t["status"], 9), t["priority"], t["id"]))
    rows = ["| ID | Pri | Status | Type | Area | Title | Blocked by |", "|---|---|---|---|---|---|---|"]
    for t in tasks:
        rows.append(
            f"| [{t['id']}]({t['id']}.md) | {t['priority']} | {t['status']} | {t['type']} | "
            f"{t['area']} | {t['title']} | {t.get('blocked_by', '')} |"
        )
    open_count = sum(t["status"] != "done" for t in tasks)
    return f"{open_count} open of {len(tasks)}.\n\n" + "\n".join(rows)


def main():
    readme = README.read_text(encoding="utf-8")
    if START not in readme or END not in readme:
        sys.exit(f"{README}: index markers not found")
    head, rest = readme.split(START, 1)
    _, tail = rest.split(END, 1)
    updated = f"{head}{START}\n{build()}\n{END}{tail}"
    if "--check" in sys.argv:
        if updated != readme:
            sys.exit("docs/tasks/README.md index is stale: run task_index.py")
        print("index up to date")
        return
    README.write_text(updated, encoding="utf-8", newline="\n")
    print("index rewritten")


if __name__ == "__main__":
    main()
