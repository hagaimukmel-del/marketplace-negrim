# 8 · המציאון — carpenter-to-carpenter board
Verified: 2026-10-03

## Purpose
"Don't throw it away, another carpenter may need it": carpenters list leftover materials,
hardware, products and equipment, for sale or for free. The deal happens directly between
carpenters; the platform only connects them.

## Entry points
| Route | What |
|---|---|
| `/app/metzion` | Board (`MetzionBoard`, `ListingSheet`), filter by category and region |
| `/app/metzion/new`, `/app/metzion/[id]/edit`, `/app/metzion/mine` | Create, edit, my listings (`ListingForm`) |
| `/api/metzion` | CRUD |
| `/api/metzion/contact` | Reveal phone / WhatsApp with a prepared message (no chat) |
| `/api/metzion/report` | Report a listing |
| `/admin/metzion` (`/api/admin/metzion`) | Moderation |

## Code
`lib/metzion.ts` (one vocabulary for categories and conditions), `lib/regions.ts`,
`lib/image-downscale.ts` (photos shrunk in the browser before upload).

## Data
`metzion_listings`, `metzion_reports`, Supabase Storage for photos.

## Rules & invariants
Spec in `TODO.md`, "מציאון". Six fields typed by the carpenter, the rest prefilled. Sold items
are marked, not deleted. Contact is WhatsApp or phone, shown on click. No payments, no in-app chat.

## Status
Live (built from 16.09).

## Open tasks
(none specific)
