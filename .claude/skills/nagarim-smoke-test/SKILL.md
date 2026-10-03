---
name: nagarim-smoke-test
description: Interactive end-to-end smoke test of Marketplace Negrim (nagarimb2b.com) in the built-in browser against the STAGING database — carpenter catalogue → cart → purchase order, supplier console, admin console, mobile RTL. Use before pushing/deploying marketplace changes, after a migration lands on staging, after a catalogue import, or whenever the user says "תבדוק שהאתר עובד", "smoke test", "בדיקה לפני פוש", "תריץ את האתר ותראה", "does the order flow still work", or asks to verify a marketplace change in the real app rather than just the build.
---

# Nagarim smoke test — click through what carpenters and suppliers actually do

`npm run build` proves the code compiles. It doesn't prove a carpenter can still send an order. This skill drives the real app in the built-in browser, against **staging data only**, and reports pass/fail per flow.

Load the `built-in-browser` skill first if you haven't used the browser pane this session.

## 0. Start safely — staging or nothing

1. In `Desktop/AI HAGAI/marketplace-negrim`: `git pull --ff-only`. The repo has `.claude/launch.json` with a `dev-server` config (`npm run dev`, port 3000). Start it with `preview_start` (name `dev-server`).
2. **Confirm staging before touching anything.** Every page must show the yellow strip `… — נתונים לבדיקה בלבד, לא האתר החי` (from `NEXT_PUBLIC_ENV_LABEL`). If the strip is missing, `.env.local` may point at production: **stop**, don't submit anything, and tell the user. Orders submitted here email real suppliers in production.
3. If `.env.local` doesn't exist, stop and tell the user. Some machines have no env files.

Use only test identities. The test carpenter token is `test-carpenter-agent` ("נגרייה בדיקה"). Names containing "ניסיון" also route mail to the test inbox. Never create orders as a real business.

## 1. Flows to check

Run the flows relevant to the change; run all of them before a deploy. For each one: navigate, act, and read the result with `get_page_text`/`find` (cheaper and more exact than screenshots). After each flow, check `read_console_messages` (errors only) and `read_network_requests` for 4xx/5xx on `/api/*`.

| # | Flow | Steps | Pass when |
|---|---|---|---|
| 1 | **Public pages** | `/`, `/join`, `/terms`, `/supplier/join` | Each renders Hebrew, `dir=rtl`, no console errors |
| 2 | **Carpenter entry** | `/o/test-carpenter-agent` | Lands on the carpenter's page with the business name shown; the token is remembered for the visit |
| 3 | **Catalogue + search** | `/app/catalog`, search `דבק`, open a product (`/app/product/[id]`) | Results appear; price shown **excl. VAT** with the unit label (ק״ג/ליטר/יח׳); no product without a price |
| 4 | **Cart → purchase order** | Add 2 products (ideally from two suppliers) → `/app/order` → send | Cart splits per supplier with its minimum order shown; submit returns "order sent"; nothing on the page says חשבונית, payment or checkout (business rule: the supplier is the seller of record) |
| 5 | **Order tracking** | `/app/orders`, then the new order | The order is listed with a fulfilment status (not a payment status) and the snapshotted prices |
| 6 | **Admin console** | `/admin/login` → `/admin/orders`, `/admin/products`, `/admin/suppliers` | The order from flow 4 appears; tables load |
| 7 | **Supplier console** | From admin use `/admin/view/supplier` (or a test supplier's link) → `/supplier` | The supplier sees their orders/price list; the confirm link `/supplier/confirm/[token]` from the order works |
| 8 | **Mobile** | `resize_window` preset `mobile`, repeat 3–4 quickly | No horizontal scroll, buttons reachable, RTL intact. Reset with preset `desktop` afterwards |

**Admin password**: read `ADMIN_PASSWORD` from the repo's `.env.local` and type it into `/admin/login` on localhost. This is the user's own app on a local dev host with staging config. Never repeat the value in chat or in the report. If it's absent, skip flows 6–7 and say so.

**Submitting the test order (flow 4)** is fine on localhost + staging. That's what the test carpenter exists for. Do it only after step 0 confirmed the yellow strip on that same page.

When a change targets one area (e.g. a migration on `supplier_contact_requests`), add a flow that exercises that exact feature, following the same pattern.

## 2. When something fails

- Capture the evidence: the URL, the visible error text, the console error, the failing request and its response body (`read_network_requests` with `requestId`), and one screenshot.
- Check `preview_logs` (level `error`) for the server-side stack trace. Most route-handler failures only show there.
- Diagnose the cause in the code before proposing a fix. Don't patch the UI around a failing API.
- Don't "fix" the data by hand in the Supabase dashboard. Schema changes go through the **nagarim-migrations** skill.

## 3. Report

Hebrew, compact, one line per flow:

```
בדיקת עשן — סטייג'ינג ✅ (פס צהוב אומת) · commit d0ecacb
1 דפים ציבוריים ✅
2 כניסת נגר ✅
3 קטלוג וחיפוש ✅
4 עגלה → הזמנת רכש ❌ שליחה החזירה 500 · /api/orders · "column supplier_id does not exist" — המיגרציה לא הוחלה בסטייג'ינג
5 מעקב הזמנות ⏭ דולג (תלוי ב-4)
6 אדמין ✅
7 ספק ✅
8 מובייל ✅
```

Then stop the dev server (`preview_stop`) unless the user wants to keep clicking around.
