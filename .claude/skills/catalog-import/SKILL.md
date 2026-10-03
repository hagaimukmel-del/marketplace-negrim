---
name: catalog-import
description: Import and normalise supplier product catalogues and price lists into Marketplace Negrim (nagarimb2b.com). Use whenever the user has a supplier's price list, product CSV/Excel, "מחירון", "קטלוג", "רשימת מוצרים", "עדכון מחירים", new products to add, or asks to load, sync, clean, compare or update products/prices in the marketplace — even if they just drop a file and say "תעלה את זה". Also use when touching /api/sync-products, src/lib/price-import*.ts, products or supplier_offers.
---

# Catalog import — supplier price lists into the marketplace

| | Where | Key facts |
|---|---|---|
| **Per-supplier uploads** | `/admin/products → ייבוא` or the supplier's `/supplier` page, backed by `src/lib/price-import.ts` + `price-import-server.ts` | Imports are planned, then applied, and every batch can be undone (`import_batches`) |
| **Sheet sync** | admin `/api/sync-products` reads the Google Sheet tab `דבקים` (Itamir as supplier) | Fixed column positions; matches on the Hebrew **and** English name pair |
| **Data model** | `products` = canonical item (no price) · `supplier_offers` = one supplier's price | Price is **excl. VAT, per base unit** (`unit/kg/liter/meter/sqm`, a closed vocabulary) |

Read `CLAUDE.md` "catalogue's shape" before touching prices.

## Step 1 — Understand the file, then ask the questions only a human can answer

Run the bundled normaliser first, from the repo root. It reads CSV/XLSX, finds the columns, parses packs like `1,100KG`, `5 ליטר`, `45 נרות`, converts pack prices to per-base-unit prices, and lists every row it couldn't decide:

```bash
python .claude/skills/catalog-import/scripts/normalize_pricelist.py INPUT.xlsx --out <scratchpad>/NAME.import.csv
#   --price-basis unit    when the source already quotes per kg/liter/unit
#   --vat-included        when the source prices include VAT (18% by default)
```

Write the output to the scratchpad, not into the repo. Supplier price lists are business data and don't belong in a public git repo.

Then confirm with the user, in one short Hebrew message, anything the file can't tell you:
- **Is the price per pack or per unit, and does it include VAT?** This is the most expensive mistake. Show 2–3 example rows: "KL 072/6: ‏12,900 ₪ לתוף 1,100 ק״ג → ‏11.73 ₪ לק״ג, לפני מע״מ — נכון?"
- Which supplier this price list belongs to.

Don't guess on rows listed in `issues`. Show them and ask.

## Step 2 — Reuse the app's import, don't write rows yourself

The app already does matching, preview, apply and undo correctly. Inserting into `products`/`supplier_offers` directly skips the undo record and the matching rules (brand + mpn, otherwise the Hebrew+English name pair), so don't.

1. Run on **staging** first: `npm run dev` (`.env.local` = staging; the yellow strip confirms it).
2. Upload the `.import.csv` through **/admin/products → ייבוא** (admin, any supplier) or the supplier's own **/supplier** page. Its headers already match `detectColumns()`.
3. Read the preview the app shows (update / unchanged / attach / create / error) and report it to the user, e.g. *"47 מחירים ישתנו · 3 חדשים · 2 לא זוהו"*. Investigate any "create" that looks like a product already in the catalogue. A supplier declaring a duplicate product is exactly the case the TODO's duplicate report exists for.
4. Apply on staging, spot-check a product page, then ask the user before repeating the import on production. If something was wrong, use undo; it restores each price that was there before.

The built-in browser and the nagarim-smoke-test skill drive this UI. Use them rather than calling the API by hand.

**The `דבקים` sheet** is read by `/api/sync-products` at fixed column positions, so don't reorder its columns. Other systems read the sheet too, so don't sort, insert or delete rows in it without asking the user first. A SKU column may be added anywhere: the sync finds it by its heading.

## Step 3 — Report

End with a compact Hebrew summary:

```
מקור: מחירון-ספק.xlsx · 120 שורות · ספק: <שם>
נרמול: מחיר לק״ג/ליחידה, לפני מע״מ · 2 שורות לבירור
סטייג'ינג: 47 עדכוני מחיר · 3 חדשים · 2 לא זוהו → ממתין לאישור לפרודקשן
```
