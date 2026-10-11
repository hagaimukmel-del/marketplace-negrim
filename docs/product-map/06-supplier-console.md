# 6 · Supplier console (`/supplier`)
Verified: 2026-10-11

## Purpose
Self-service for an approved supplier: their orders, price list, products, business details,
terms and documents. No password needed.

## Entry points
| Route | What |
|---|---|
| `/supplier` | Console with tabs: Orders, Products, Sales (מכירות), Subscription & promotion (מנוי ופרסום), Documents (מסמכים), Business, Terms (`src/app/supplier/tabs/*`, `UploadDocuments.tsx`). The Orders tab opens with carpenters' questions from the agent chat (last 20, `supplier_contact_requests`) |
| `POST /api/supplier/documents/upload` | Documents tab: attach a spec sheet/guide to a product the supplier has an offer on (`product_documents`, bucket `product_documents`); `replaces` swaps out an older sheet |
| `DELETE /api/supplier/documents/[id]?kind=sheet\|catalog` | Delete one of the supplier's own files (row + storage object) |
| `POST /api/supplier/documents/catalog` | A PDF catalogue for the whole business: `supplier_documents` row, file under `catalogs/<supplier id>/` in the public `product_documents` bucket. Shown on the product page of every product the supplier sells |
| `GET /api/supplier/pricelist` | "הורד מחירון": active offers as CSV with the import's own headers, so it goes back in through "ייבוא מאקסל" |
| `POST/DELETE /api/supplier/promo` | Book a week of "מוצר השבוע" for an active product (from next week, 12 ahead), or cancel a booking still waiting for approval (T-024) |
| `POST /api/supplier/offers` | Quick edit (עריכה מהירה): up to 500 price / stock / shown changes in one save |
| `/supplier/enter` + `/api/supplier/session` | Link → cookie session (six months); approval is re-checked on every request |
| `/api/supplier/login-link` | Re-sends the link to the address on file only |
| `/supplier/confirm/[token]` | One-order confirmation link (see area 4) |
| `/api/supplier/{orders,offers,products,profile,import,import/undo}` | Console actions |
| `/admin/view/supplier` | The operator opens a supplier's real console |

## Code
`src/app/supplier/**`, `lib/supplier-auth.ts`, `lib/supplier-link.ts`, `lib/price-import*.ts`,
`src/app/supplier/UploadDocuments.tsx`, emails `supplier-approved.ts`, `supplier-login-link.ts`, `supplier-question.ts`.

## Data
`suppliers` (status, token, terms such as MOQ, payment terms, logo), `supplier_offers`,
`import_batches`, `supplier_documents`, `orders`, `supplier_contact_requests`.

## Rules & invariants
- Only an **approved** supplier can mint a session. Rejecting a supplier cuts access immediately.
- When the operator opens a self-run supplier's console (admin cookie + supplier cookie), the
  banner says view-only and every write route answers 403. See area 7.
- A supplier's link edits what the whole marketplace pays, so treat it as a strong credential.
- Delivery regions are required at `/supplier/join` and in the Terms tab (T-026). The join page
  and the application/approval emails state the subscription tiers (`lib/supplier-plans.ts`).
- Messages (`/supplier/messages`, bell in `SupplierNav`): reply, mark "טופל", write to a carpentry
  about an order. The operator sees counts only for a self-run supplier, never content.
- Orders: confirm all, confirm with missing lines / amount / delivery date / note, or reject
  with a reason. The documents tab counts products without a technical sheet.
- In imports, any supplier id in the request is ignored for a signed-in supplier.
- Sales tab (`src/app/supplier/sales.ts`, computed on the server from the supplier's own order
  lines): turnover by month at the confirmed amount, top products, confirmed vs rejected, and a
  customers list of carpentries that ordered from this supplier only.
- Extra order recipients (`suppliers.order_cc_emails`, up to 5, migration 20261011120000) get a
  copy of each new-order email without the confirm button; confirming and messages stay with
  `suppliers.email`. Hidden on a database without the column (`lib/order-recipients.ts`).
- The subscription tier shown in "מנוי ופרסום" is computed from the supplier's active offers
  (`planFor`, `lib/supplier-plans.ts`); nothing is billed on the site. Taken weeks are shown
  without the other supplier's name.
- Business catalogues are told apart from the operator's knowledge-base files by the
  `catalogs/` path prefix (`lib/supplier-documents.ts`); the console never lists or deletes the
  operator's `supplier-documents` bucket files.

## Status
Live; the owner's own business is the only active supplier. The supplier logo is uploaded but
not yet shown to carpenters (TODO.md).

## Open tasks
T-002, T-023, T-024, T-025, T-026, T-027
