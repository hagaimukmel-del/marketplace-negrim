# 6 · Supplier console (`/supplier`)
Verified: 2026-10-04

## Purpose
Self-service for an approved supplier: their orders, price list, products, business details,
terms and documents. No password needed.

## Entry points
| Route | What |
|---|---|
| `/supplier` | Console with tabs: Orders, Products, Documents (דפים טכניים), Business, Terms (`src/app/supplier/tabs/*`, `UploadDocuments.tsx`) |
| `POST /api/supplier/documents/upload` | Documents tab: attach a spec sheet/guide to a product the supplier has an offer on (`product_documents`, bucket `product_documents`) |
| `/supplier/enter` + `/api/supplier/session` | Link → cookie session (six months); approval is re-checked on every request |
| `/api/supplier/login-link` | Re-sends the link to the address on file only |
| `/supplier/confirm/[token]` | One-order confirmation link (see area 4) |
| `/api/supplier/{orders,offers,products,profile,import,import/undo}` | Console actions |
| `/admin/view/supplier` | The operator opens a supplier's real console |

## Code
`src/app/supplier/**`, `lib/supplier-auth.ts`, `lib/supplier-link.ts`, `lib/price-import*.ts`,
`src/app/supplier/UploadDocuments.tsx`, emails `supplier-approved.ts`, `supplier-login-link.ts`.

## Data
`suppliers` (status, token, terms such as MOQ, payment terms, logo), `supplier_offers`,
`import_batches`, `supplier_documents`, `orders`.

## Rules & invariants
- Only an **approved** supplier can mint a session. Rejecting a supplier cuts access immediately.
- A supplier's link edits what the whole marketplace pays, so treat it as a strong credential.
- In imports, any supplier id in the request is ignored for a signed-in supplier.

## Status
Live; the owner's own business is the only active supplier. The supplier logo is uploaded but
not yet shown to carpenters (TODO.md).

## Open tasks
T-002
