# 3 · Agent chat (search assistant)
Verified: 2026-10-04

## Purpose
A Hebrew chat inside the carpenter app: the carpenter writes what they need, the assistant finds
products, shows the supplier price excl. VAT, adds to the cart, and can open a "contact supplier"
request. Marketed publicly as "הסוכן של נגרים B2B" (see CLAUDE.md §0 for what may be claimed).

## Entry points
| Where | What |
|---|---|
| Chat panel in `AppShell` (desktop) | `components/chat/ChatContainer.tsx`, `ChatMessage.tsx` |
| `POST /api/carpenter/search` | Runs the procurement agent on a message |
| `GET /api/carpenter/previous-products` | "What did I order last time" |
| `POST /api/carpenter/contact-supplier` | Stores a `supplier_contact_requests` row |
| `/api/carpenter/documents/retrieve` | Product documents; requires a signed-in carpenter |

## Code
`lib/procurement-agent.ts` (intent → search → response type: selection / clarification /
comparison / order_confirmation / supplier_contact), `components/chat/*`. The agent adds to the cart and sends the carpenter to `/app/order`; it never creates orders itself.
Product matching is `searchProducts()` in `lib/catalog-search.ts`, the same function the
catalogue search bar uses (Hebrew normalization, prefixes, plurals, a seed synonym list), over
live products only. The catalogue results page has "שאל את הסוכן" (`AskAgentButton`, which opens
the chat already asking the query), and every agent answer with results has "כל התוצאות בקטלוג". A single match also gets "לדף המוצר".
A signed-out visitor who asks the chat gets an invitation to /join instead of the 401.

## Data
`products`, `supplier_offers`, `product_specifications`, `product_documents`,
`supplier_contact_requests`.

## Rules & invariants
- **No LLM.** Intent parsing is keyword matching. Don't call it AI in UI or copy until that changes.
- Prices shown by the agent must match the catalogue, per base unit (a bug once showed ₪24/kg as ₪0.96).
- Answers come only from the catalogue, never from the internet (TODO.md "יועץ").
- The chat and the search bar search through one function (`lib/catalog-search.ts`). Don't add a
  second matcher; extend that one, synonyms included.

## Status
Partial. Add-to-cart, option selection and navigation were fixed on 03.10 but **not yet tested
end to end** on staging. Missing: voice, supplier preference and quantity in one sentence, an
agent-level comparison answer (the `comparison` type is declared but not built), and emailing
the supplier on "פנה לספק".

## Open tasks
T-001, T-003, T-004, T-007, T-008, T-010, T-011, T-017
