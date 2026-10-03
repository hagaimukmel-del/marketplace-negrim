#!/usr/bin/env python3
"""
Turn a supplier's raw price list (CSV or XLSX) into the Marketplace Negrim import
template, plus a report of everything a human has to decide.

    python normalize_pricelist.py INPUT [--out OUT.csv] [--price-basis pack|unit]
                                        [--vat-included] [--vat 0.18]

The output's headers are the Hebrew labels that src/lib/price-import.ts
detectColumns() recognises, so the file can be uploaded as-is through the
supplier page or /admin/products. Nothing here touches a database.

Price basis: the marketplace stores price per BASE unit (unit/kg/liter/meter/sqm).
Suppliers usually quote per pack ("12,900 for a 1,100kg drum"). With
--price-basis pack (the default) the price is divided by the pack quantity when
the pack can be parsed; rows where it can't are flagged, never guessed.
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

# Aliases mirror IMPORT_FIELDS in price-import.ts, plus the headers the Google
# sheet ("דבקים") and itamir-products.csv use.
ALIASES = {
    "name": ["שם", "שם מוצר", "שם המוצר", "שם (he)", "תיאור", "תאור", "מוצר", "פריט", "name", "name (en)", "product", "description"],
    "price": ["מחיר", "מחיר בשקל", "מחיר ללא מעמ", "מחיר לפני מעמ", "מחיר נטו", "price", "cost"],
    "sku": ["מקט", "קוד", "קוד פריט", "sku", "code", "item code"],
    "unit": ["יחידה", "יחידת מידה", "יח", "unit", "uom"],
    "packLabel": ["אריזה", "סוג אריזה", "package", "pack"],
    "packQty": ["כמות באריזה", "יחידות באריזה", "pack qty", "pack size"],
    "brand": ["מותג", "יצרן", "brand", "manufacturer"],
    "mpn": ["מקט יצרן", "mpn", "part number"],
    "category": ["קטגוריה", "קבוצה", "משפחה", "category", "group"],
}

OUT_HEADERS = {
    "name": "שם המוצר", "price": "מחיר ללא מע״מ", "sku": "מק״ט", "unit": "יחידת מידה",
    "packLabel": "אריזה", "packQty": "כמות באריזה", "brand": "מותג / יצרן",
    "mpn": "מק״ט יצרן", "category": "קטגוריה",
}

UNIT_WORDS = {
    "kg": "kg", "קג": "kg", "קילו": "kg", "ק\"ג": "kg", "ק״ג": "kg",
    "g": "g", "gr": "g", "גרם": "g",
    "l": "liter", "lt": "liter", "ltr": "liter", "liter": "liter", "ליטר": "liter", "ל": "liter",
    "ml": "ml", "מל": "ml", "מ\"ל": "ml",
    "m": "meter", "מטר": "meter", "מ": "meter",
    "sqm": "sqm", "m2": "sqm", "מר": "sqm", "מ\"ר": "sqm", "מ״ר": "sqm",
    "pcs": "unit", "pc": "unit", "נרות": "unit", "נר": "unit", "סטיקים": "unit", "unit": "unit", "יח": "unit", "יחידות": "unit", "יחידה": "unit",
}
# grams and ml are folded into the closed base-unit vocabulary.
FOLD = {"g": ("kg", 0.001), "ml": ("liter", 0.001)}


def norm_header(text):
    return re.sub(r"\s+", " ", re.sub(r"[()₪:]", " ", re.sub(r"[\"'׳״]", "", str(text or "").lower()))).strip()


def read_rows(path):
    if path.suffix.lower() in (".xlsx", ".xlsm"):
        try:
            import openpyxl
        except ImportError:
            sys.exit("openpyxl is needed for xlsx: pip install openpyxl (or save the sheet as CSV)")
        ws = openpyxl.load_workbook(path, data_only=True).active
        return [[c if c is not None else "" for c in row] for row in ws.iter_rows(values_only=True)]
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.reader(f))


def detect(rows):
    """First of the top ten rows naming at least two fields is the header (same rule as the app)."""
    for r, row in enumerate(rows[:10]):
        headers = [norm_header(c) for c in row]
        mapping = {}
        for key, aliases in ALIASES.items():
            al = [norm_header(a) for a in aliases]
            idx = next((i for i, h in enumerate(headers) if h in al), None)
            if idx is None:
                idx = next((i for i, h in enumerate(headers) if h and any(h.startswith(a) for a in al)), None)
            if idx is not None and idx not in mapping.values():
                mapping[key] = idx
        if len(mapping) >= 2:
            return r, mapping
    return None, {}


def number(value):
    if isinstance(value, (int, float)):
        return float(value)
    text = re.sub(r"ש[\"״]?ח", "", str(value or "")).replace("₪", "").replace(",", "").strip()
    try:
        return float(text) if text else None
    except ValueError:
        return None


def parse_pack(text):
    """'1,100KG' -> (1100.0, 'kg'); '5 ליטר' -> (5.0, 'liter'); '500 גרם' -> (0.5, 'kg')."""
    t = str(text or "").replace(",", "").strip().lower()
    m = re.match(r"^(\d+(?:\.\d+)?)\s*([^\d\s].*)?$", t)
    if not m:
        return None, None
    qty = float(m.group(1))
    word = re.sub(r"[\"'׳״.]", "", (m.group(2) or "").strip())
    unit = UNIT_WORDS.get(word) or UNIT_WORDS.get((m.group(2) or "").strip())
    if unit in FOLD:
        unit, factor = FOLD[unit]
        qty *= factor
    return qty, unit


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # Hebrew on a Windows console
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--out")
    ap.add_argument("--price-basis", choices=["pack", "unit"], default="pack")
    ap.add_argument("--vat-included", action="store_true", help="source prices include VAT; divide it out")
    ap.add_argument("--vat", type=float, default=0.18)
    args = ap.parse_args()

    src = Path(args.input)
    rows = read_rows(src)
    header_row, mapping = detect(rows)
    if header_row is None or "name" not in mapping or "price" not in mapping:
        sys.exit(f"Could not find name + price columns in the first 10 rows. Headers seen: {rows[:1]}")

    out_rows, issues, seen = [], [], {}
    for r in range(header_row + 1, len(rows)):
        row = rows[r]
        get = lambda k: (row[mapping[k]] if k in mapping and mapping[k] < len(row) else "")
        name = str(get("name")).strip()
        price = number(get("price"))
        if not name and price is None:
            continue
        line = r + 1
        rec = {k: str(get(k)).strip() for k in OUT_HEADERS}
        rec["name"] = name

        if price is None or price <= 0:
            issues.append({"row": line, "name": name, "issue": "מחיר חסר או לא תקין"})
            continue
        if args.vat_included:
            price = price / (1 + args.vat)

        pack_text = rec["packQty"] or rec["packLabel"]
        qty, unit = parse_pack(pack_text) if pack_text else (None, None)
        if not unit and rec["unit"]:
            unit = UNIT_WORDS.get(re.sub(r"[\"'׳״.]", "", rec["unit"].lower()))
        if unit in FOLD:
            unit = FOLD[unit][0]

        if args.price_basis == "pack":
            if qty and qty > 0 and unit:
                rec["packLabel"] = rec["packLabel"] or str(pack_text)
                rec["packQty"] = f"{qty:g}"
                price = price / qty
            else:
                issues.append({"row": line, "name": name, "issue": f"אריזה לא מפוענחת ('{pack_text}') — המחיר נשאר לאריזה, צריך החלטה"})
        rec["unit"] = unit or ""
        if not unit:
            issues.append({"row": line, "name": name, "issue": "יחידת בסיס לא ידועה (unit/kg/liter/meter/sqm)"})
        rec["price"] = f"{price:.2f}"

        key = (name.lower(), rec["sku"].lower())
        if key in seen:
            issues.append({"row": line, "name": name, "issue": f"כפילות של שורה {seen[key]}"})
        seen[key] = line
        out_rows.append(rec)

    out = Path(args.out) if args.out else src.with_name(src.stem + ".import.csv")
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(OUT_HEADERS.values())
        for rec in out_rows:
            w.writerow(rec[k] for k in OUT_HEADERS)

    report = {
        "input": str(src), "output": str(out), "header_row": header_row + 1,
        "columns": {k: rows[header_row][i] for k, i in mapping.items()},
        "price_basis": args.price_basis, "vat_removed": args.vat_included,
        "rows_out": len(out_rows), "issues": issues,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
