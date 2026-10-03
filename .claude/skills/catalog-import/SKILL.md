---
name: catalog-import
description: Import and normalise supplier product catalogues and price lists for Marketplace Negrim (nagarimb2b.com) and the GLUE-BOT Telegram product bot. Use whenever the user has a supplier's price list, product CSV/Excel, "מחירון", "קטלוג", "רשימת מוצרים", "עדכון מחירים", new products to add, or asks to load, sync, clean, compare or update products/prices — in either repo — even if they just drop a file and say "תעלה את זה". Also use when touching the Google Sheet "דבקים", /api/sync-products, src/lib/price-import*.ts, or GLUE-BOT's sheets.py product parsing.
---

# Catalog import — one product list, two consumers

Products reach customers through two channels, and they share a source:

| | Source | Reads it | Key facts |
|---|---|---|---|
| **GLUE-BOT** (Telegram) | Google Sheet `1pSde0xY…`, tab **`דבקים`** | `sheets.py → parse_products()` | Product `id` = **row position**. Headers it reads: `שם (HE)`, `Name (EN)`, `الاسم (AR)`, `תיאור (HE)`, `Description (EN)`, `קטגוריה`, `PRICE`/`מחיר`, `Package`/`אריזה`, `כמות 1..3` + `מחיר 1..3` (volume breaks). Datasheet PDFs live in `GLUE-BOT/datasheets/`. |
| **Marketplace** | the same sheet, via admin `/api/sync-products` (Itamir as supplier), **and** per-supplier uploads | `src/lib/price-import.ts` + `price-import-server.ts` | `products` = canonical item (no price). `supplier_offers` = one supplier's price, **excl. VAT, per base unit** (`unit/kg/liter/meter/sqm`, a closed vocabulary). Imports are planned, then applied, and every batch can be undone (`import_batches`). |

Read the marketplace repo's `CLAUDE.md` "catalogue's shape" section before touching prices there.

## Step 1 — Understand the file, then ask the questions only a human can answer

Run the bundled normaliser first (path is relative to the marketplace-negrim repo root; from GLUE-BOT use `../marketplace-negrim/.claude/skills/...`). It reads CSV/XLSX, finds the columns, parses packs like `1,100KG`, `5 ליטר`, `45 נרות`, converts pack prices to per-base-unit prices, and lists every row it couldn't decide:

```bash
python .claude/skills/catalog-import/scripts/normalize_pricelist.py INPUT.xlsx --out <scratchpad>/NAME.import.csv
#   --price-basis unit    when the source already quotes per kg/liter/unit
#   --vat-included        when the source prices include VAT (18% by default)
```

Write the output to the scratchpad, not into either repo. Supplier price lists are business data and don't belong in git.

Then confirm with the user, in one short Hebrew message, anything the file can't tell you:
- **Is the price per pack or per unit, and does it include VAT?** This is the most expensive mistake. Show 2–3 example rows: "KL 072/6: ‏12,900 ₪ לתוף 1,100 ק״ג → ‏11.73 ₪ לק״ג, לפני מע״מ — נכון?"
- Which supplier this is (the marketplace needs the supplier; the bot only sells Itamir's products).
- Where it should go: the bot sheet, the marketplace, or both.

Don't guess on rows listed in `issues`. Show them and ask.

## Step 2a — Marketplace: reuse the app's import, don't write rows yourself

The app already does matching, preview, apply and undo correctly. Inserting into `products`/`supplier_offers` directly skips the undo record and the matching rules (brand + mpn, otherwise the Hebrew+English name pair), so don't.

1. Run on **staging** first: `npm run dev` (`.env.local` = staging; the yellow strip confirms it).
2. Upload the `.import.csv` through **/admin/products → ייבוא** (admin, any supplier) or the supplier's own **/supplier** page. Its headers already match `detectColumns()`.
3. Read the preview the app shows (update / unchanged / attach / create / error) and report it to the user, e.g. *"47 מחירים ישתנו · 3 חדשים · 2 לא זוהו"*. Investigate any "create" that looks like a product already in the catalogue. A supplier declaring a duplicate product is exactly the case the TODO's duplicate report exists for.
4. Apply on staging, spot-check a product page, then ask the user before repeating the import on production. If something was wrong, use undo; it restores each price that was there before.

The built-in browser and the nagarim-smoke-test skill drive this UI. Use them rather than calling the API by hand.

## Step 2b — GLUE-BOT sheet

The sheet is shared with the marketplace sync, so edits affect both.

- **Append new products at the bottom. Never insert rows in the middle, sort, or delete rows.** The bot's product `id` is the row position. Shifting rows changes which product a customer's in-progress selection or quote points to. To retire a product, blank its price or mark it in a column the user agrees on, and tell them that's what you did.
- Keep the Hebrew **and** English names. The marketplace sync tells duplicate Hebrew names apart by the English name (e.g. `קלינר Q1924 ניקוי EVA` appears at two prices).
- The bot shows the sheet `PRICE`; check with the user whether that's per pack (as customers order) before writing per-kg values there. The bot and the marketplace can legitimately differ here.
- Volume breaks go in `כמות 1`/`מחיר 1` … `כמות 3`/`מחיר 3`.
- Datasheets: save PDFs to `GLUE-BOT/datasheets/` with a name that contains the product code, so the AI answer can attach them.
- Writing to the sheet changes the live bot right away, so show the exact rows (a small table) and get a yes before writing. A SKU column is welcome: `/api/sync-products` finds it by heading wherever it sits.

## Step 3 — Report

End with a compact Hebrew summary:

```
מקור: itamir-products.csv · 11 שורות
נרמול: מחיר לק״ג/ליחידה, לפני מע״מ · 0 בעיות
מרקטפלייס (סטייג'ינג): 8 עדכוני מחיר · 3 חדשים · 0 שגיאות → ממתין לאישור לפרודקשן
בוט: 3 שורות נוספו בסוף הגיליון (שורות 42–44)
```
