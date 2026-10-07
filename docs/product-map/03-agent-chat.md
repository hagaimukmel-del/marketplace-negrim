# 3 · Agent chat (search assistant)
Verified: 2026-10-07

## Purpose
A Hebrew chat inside the carpenter app: the carpenter writes what they need, the assistant finds
products, shows the supplier price excl. VAT, adds to the cart, and passes a question to the
supplier ("שאלה לספק"). Marketed publicly as "הסוכן של נגרים B2B" (see CLAUDE.md §0 for what may be claimed).

## Entry points
| Where | What |
|---|---|
| Chat panel in `AppShell` | `components/chat/ChatContainer.tsx`, `ChatMessage.tsx`. Opened from a floating bubble (phone: round; desktop: "שאל את הסוכן" pill; both hidden on the cart), a button beside the desktop search bar, and the sidebar |
| `POST /api/carpenter/agent` | The conversational agent (Claude). Answers `{fallback:true}` without `ANTHROPIC_API_KEY` or on a model error, and the chat then uses search |
| `POST /api/carpenter/search` | Runs the keyword procurement agent on a message |
| `GET /api/carpenter/previous-products` | "What did I order last time" |
| `POST /api/carpenter/contact-supplier` | "שאלה לספק": stores a `supplier_contact_requests` row and emails the supplier (approved suppliers only, 10 per carpenter per hour, in memory) |
| `/api/carpenter/documents/retrieve` | Product documents; requires a signed-in carpenter |

## Code
`lib/procurement-agent.ts` (intent → search → response type: selection / clarification /
comparison / order_confirmation / supplier_contact), `components/chat/*`. The agent adds to the cart and sends the carpenter to `/app/order`; it never creates orders itself.
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
Before searching, the chat answers three narrow shortcuts itself (`ChatContainer.tsx`): "בפעם שעברה"
lists past products with links, "ההזמנות שלי" lists orders with Hebrew statuses, and a short
"קח אותי ל..." / one-word page name opens that page. Anything else, "הזמנה של דבק" included, is a
search. Every search logs one `agent.search` line (carpenter id, message, state, match count) for
the Vercel logs; messages are cut at 300 characters.

## Data
`products`, `supplier_offers`, `product_specifications`, `product_documents`,
`supplier_contact_requests`.

## Rules & invariants
- **Two engines.** With `ANTHROPIC_API_KEY`, `lib/agent/llm-agent.ts`: Claude (`AGENT_MODEL`, default
  `claude-sonnet-5-5`, the owner's choice on 07.10) with read-only tools over the catalogue, categories and the
  carpentry's own orders, plus `show_buttons`. Buttons are built on the server from the database, so a price on a
  button is the catalogue's. It never sends orders, never sees the web, 80 messages per carpentry per day (in
  memory). One `agent.llm` log line per answer with tokens and tools. Without the key: keyword matching as below.
- Don't call it AI in UI or copy until the owner decides to.
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
table is on both databases. Missing: voice, supplier preference and quantity
in one sentence, and an agent-level comparison answer (the `comparison` type is declared but not built).

With the key set, the chat's shortcuts (past products, orders, page names) are answered by the model too.

## Open tasks
T-001, T-003, T-004, T-007, T-011, T-017
