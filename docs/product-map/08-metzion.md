# 8 · המציאון — carpenter-to-carpenter board (suppliers too)
Verified: 2026-11-03

## Purpose
"Don't throw it away, another carpenter may need it": carpenters list leftover materials,
hardware, products and equipment, for sale or for free. Since 03.11 an approved supplier can post
too (end-of-line stock, a damaged carton, a returned machine), marked "ספק" on the board. The deal
happens directly between the two sides; the platform only connects them.

## Entry points
| Route | What |
|---|---|
| `/app/metzion` | Board (`MetzionBoard`, `ListingSheet`), filter by category and region |
| `/app/metzion/new`, `/app/metzion/[id]/edit`, `/app/metzion/mine` | Create, edit, my listings (`ListingForm`) |
| `/supplier/metzion`, `/supplier/metzion/new`, `/supplier/metzion/[id]/edit` | A supplier's listings, from the console header (same `ListingForm` / `MyListings`, `side="supplier"`) |
| `/api/metzion` | CRUD; the form sends `side` (`carpenter`/`supplier`) and the owner comes from that side's session |
| `/api/metzion/contact` | Reveal phone / WhatsApp with a prepared message (no chat) |
| `/api/metzion/report` | Report a listing |
| `/admin/metzion` (`/api/admin/metzion`) | Moderation |

## Code
`lib/metzion.ts` (one vocabulary for categories and conditions), `lib/regions.ts`,
`lib/image-downscale.ts` (photos shrunk in the browser before upload).

## Data
`metzion_listings` (owner is `carpenter_id` **or** `supplier_id`, check `metzion_one_owner`, migration
`20261103191000_metzion_suppliers`), `metzion_reports`, Supabase Storage for photos (a supplier's under
`supplier-<id>/`).

## Rules & invariants
Spec in `TODO.md`, "מציאון". Six fields typed by the carpenter, the rest prefilled. Sold items
are marked, not deleted. Contact is WhatsApp or phone, shown on click. No payments, no in-app chat.
A listing is live only while its owner is (carpenter `is_active`, supplier `status = 'approved'`):
`ownerOf()` in `lib/metzion.ts` decides it for the board and the phone reveal alike. The board itself
is still for carpenters; a supplier manages their own listings from the console.

## Status
Live (built from 16.09).

## Open tasks
(none specific)
