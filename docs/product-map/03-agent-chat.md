# 3 · Agent chat (search assistant)
Verified: 2026-10-18

## Purpose
A Hebrew chat inside the carpenter app: the carpenter writes what they need, the assistant finds
products, shows the supplier price excl. VAT, adds to the cart, and passes a question to the
supplier ("שאלה לספק"). Marketed publicly as "הסוכן של נגרים B2B" (see CLAUDE.md §0 for what may be claimed).

## Entry points
| Where | What |
|---|---|
| Chat panel in `AppShell` | `components/chat/ChatContainer.tsx`, `ChatMessage.tsx`, titled "הסוכן של נגרים B2B". Opened from a floating bubble (phone: round; desktop: "שאל את הסוכן" pill; both hidden on the cart), a button beside the desktop search bar, and the sidebar |
| `POST /api/carpenter/search` | Runs the procurement agent on a message |
| `GET /api/carpenter/previous-products` | "What did I order last time" |
| `POST /api/carpenter/contact-supplier` | "שאלה לספק": stores a `supplier_contact_requests` row and emails the supplier (approved suppliers only, 10 per carpenter per hour, in memory) |
| `/api/carpenter/documents/retrieve` | Product documents; requires a signed-in carpenter |

## Code
`lib/procurement-agent.ts` (written quantity → search → one answer with buttons), `components/chat/*`.
The offers are the catalogue's own (`loadProducts` with the carpentry's city): the suggested
offer leads, so the agent names the same supplier and price as the catalogue, prefers suppliers
that deliver to the carpentry (T-026), and marks one that doesn't ("לא מגיע לאזור שלך"). A
supplier in "הצעה בלבד" mode (T-023) shows no price; its button is "בקש הצעת מחיר", which opens
the product page. "מוצר השבוע" (T-024) leads, labelled, when the search lands in its category.
A quantity written with a unit ("20 ק״ג", "3 דליים", `lib/agent-quantity.ts`) goes into the cart
rounded up to whole packs and the supplier's minimum; a quantity in another unit than the
product's is ignored and the answer says so. A bare number is never a quantity (it is usually a
model number). The API returns only the answer text and its buttons. The agent adds to the cart and sends the carpenter to `/app/order`; it never creates orders itself.
Product matching is `searchProducts()` in `lib/catalog-search.ts`, the same function the
catalogue search bar uses (Hebrew normalization, prefixes, plurals, a seed synonym list), over
live products only. The catalogue results page has "שאל את הסוכן" (`AskAgentButton`, which opens
the chat already asking the query), and every agent answer with results has "כל התוצאות בקטלוג". A single match also gets "לדף המוצר".
A signed-out visitor who asks the chat gets an invitation to /join instead of the 401.
A single match (or a chosen option) also gets "שאלה לספק": the chat asks for the question, the next
message goes to that supplier instead of search ("ביטול" cancels), and the supplier gets it by email
with the carpenter's phone, WhatsApp and, once verified, their email as reply-to. It also lists in the
supplier console's orders tab. A search with no match says so and offers the catalogue; a partial
match says it is the closest, not a match.
Before searching, the chat answers three narrow shortcuts itself (`lib/agent-shortcuts.ts`): "בפעם שעברה"
lists past products with links, "ההזמנות שלי" lists orders with Hebrew statuses, and
"קח אותי ל..." / the page name alone opens that page ("קטלוג דבקים" and "גלגלי עגלה" are searches).
A mic button (browser speech recognition) fills the input where the browser supports it; untested on phones (T-001).
Tests: `lib/agent-chat.test.ts`. Anything else, "הזמנה של דבק" included, is a
search. Every search logs one `agent.search` line (carpenter id, message, state, match count) for
the Vercel logs; messages are cut at 300 characters.

## Data
`products`, `supplier_offers`, `product_specifications`, `product_documents`,
`supplier_contact_requests`.

## Rules & invariants
- **No LLM.** Intent parsing is keyword matching. Don't call it AI in UI or copy until that changes.
- Prices shown by the agent must match the catalogue, per base unit (a bug once showed ₪24/kg as ₪0.96).
- Answers come only from the catalogue, never from the internet (TODO.md "יועץ").
- Never show stock: `stock_qty` is a placeholder on synced rows, so the agent has no "במלאי"/"אזל".
- The chat and the search bar search through one function (`lib/catalog-search.ts`). Don't add a
  second matcher; extend that one, synonyms included.

## Status
Partial. Search, option selection, add-to-cart and the product-page link were tested by the owner
on the staging preview on 05.10 ("צריך אקרילי לבן" → found, added to cart). On 07.10 the agent was
run on 50 phrases over the staging catalogue (fixes: "KS351" without a space, Hebrew brand names,
the empty "לא מצאתי" answer, the result count). "שאלה לספק" was tested by the owner on staging on 07.10; its
table is on both databases. 18.10: stage 0 fixes (delivery region, quantity, navigation
shortcuts, one documents query instead of up to ten) passed tests and build; not yet run on staging. Missing: voice
ordering, several products and a supplier preference in one sentence, and an agent-level comparison answer.

## Open tasks
T-001, T-003, T-004, T-007, T-011
