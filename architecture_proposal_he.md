# Architecture Proposal: Cue × Nagarim B2B

## סיכום ניהולי

הצעה לחיבור **Cue** (WhatsApp conversation bot) עם **Nagarim** (B2B marketplace לנגרים) כדי שנגרים יוכלו לחפש מוצרים וליצור הזמנות דרך WhatsApp בשפה טבעית.

**החזון:**
```
היום:  נגר → web site → חיפוש → הזמנה
עתיד: נגר → WhatsApp → Cue → חיפוש בNagarim → הזמנה
```

**סטטוס:** זו הצעה בלבד. אין בנייה עדיין.

---

## 1. Existing Architecture

### Nagarim (System of Record)

**מה זה:**
- B2B Marketplace לנגרים
- קטלוג מוצרים מספקים
- מנהל הזמנות
- תשלומים בין נגר לספק (לא דרך Nagarim)

**Auth Model:**
- נגר = token-based (`/o/[token]`)
- 180 ימים cookie
- HMAC-SHA256 signed

**Database:**
- PostgreSQL (Supabase)
- Tables: products, supplier_offers, orders, carpenters, suppliers
- RLS on sensitive tables

**API:**
- POST /api/orders - יצירת הזמנה
- GET /api/orders/[id] - סטטוס
- GET /api/app/catalog - קטלוג public

### Cue (Conversation Layer)

**מה זה:**
- WhatsApp scheduling bot
- משתמשים מתזמנים הודעות בשפה טבעית
- Claude Haiku מפענח intent
- Stripe billing per tier

**Auth Model:**
- User = phone number (from WhatsApp)
- Multi-tenant database isolation (user_id scoping)
- Meta webhook signature validation (HMAC-SHA256)

**Database:**
- PostgreSQL
- Tables: users, messages, contacts, groups, scheduling_queue
- 7-day retention (GDPR)

**API:**
- POST /api/meta - webhook מMeta
- GET/POST /api/messages - user messages
- GET/POST /api/contacts - user contacts

---

## 2. Proposed Integration

### Vision: Cue as Nagarim's WhatsApp Channel

```
┌─────────────────────────────────────────────┐
│           WhatsApp / Cue                     │
│  (Conversation Layer + Intent Parser)       │
└──────────────────┬──────────────────────────┘
                   │
                   ↓
         ┌─────────────────┐
         │  B2B Agent      │
         │  (Orchestration)│
         │  (Tools)        │
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    ↓             ↓             ↓
Nagarim API  │ Nagarim API  │ Nagarim API
/products    │ /orders      │ /carpenter
```

### Key Changes

#### Nagarim צריך:
1. **API endpoints חדשים** (בנוסף לקיימים)
   - GET `/api/app/products/search` - חיפוש עם query
   - GET `/api/app/products/{id}/offers` - suppliers
   - GET `/api/app/carpenter/price` - מחיר לנגר ספציפי
   - POST `/api/app/orders` - יצור הזמנה (עם carpenter_id)
   - GET `/api/app/orders/{id}/status` - סטטוס

2. **Carpenter Identification**
   - Cue שולח `carpenter_phone` + `carpenter_token`
   - Nagarim מוודא את הtoken
   - משתמש את זהותו לחיפוש/הזמנה

#### Cue צריך:
1. **Integration with Nagarim**
   - Query carpenter table (by phone)
   - Verify carpenter_token
   - Store carpenter_id בsession

2. **New Agent Layer**
   - Tools: search_products, get_offers, create_order, check_status
   - Claude decides which tool to use based on intent

3. **Confirmation Flow**
   - Cue מציע: "מצאתי 3 מחיצים, הזול ביותר: דבק 7047 ב-₪45"
   - נגר: "בסדר, תזמין 5"
   - Cue מוודא: "תשלוח לX וולט, מחיר סה״כ ₪225, בסדר?"
   - נגר: "כן"
   - Cue קורא POST /api/app/orders → Nagarim יוצר הזמנה

---

## 3. Data Flow

### זרימה: "תזמין לי 10 דבקים"

```
1. נגר ב-WhatsApp: "אני צריך 10 דבקים, מי נותן הכי זול?"
                     ↓
2. Meta Webhook → Cue
   - Signature validation ✓
   - Extract phone: +972501234567
   - Lookup carpenter in DB
   - carpenter_id = abc123, carpenter_token = xyz789
                     ↓
3. Claude Intent Parser
   - Intent: search_and_order
   - Product: דבק
   - Quantity: 10
   - Language: he
                     ↓
4. Cue calls: POST /api/app/products/search
   Query: "דבק"
   carpenter_id: abc123
   carpenter_token: xyz789
                     ↓
5. Nagarim returns: [
     { id: 1, name: "דבק 7047", offers: [
       { supplier: "ספק1", price: 45, stock: 100 },
       { supplier: "ספק2", price: 52, stock: 50 }
     ]}
   ]
                     ↓
6. Cue to نگر: "מצאתי דבקים:
               - דבק 7047: ₪45 (ספק1) - במלאי
               - דבק 7047: ₪52 (ספק2) - במלאי
               איזה בחר?"
                     ↓
7. נגר: "הראשון"
                     ↓
8. Cue calls: POST /api/app/orders
   {
     carpenter_id: abc123,
     carpenter_token: xyz789,
     items: [
       { product_id: 1, supplier_id: 1, quantity: 10 }
     ]
   }
                     ↓
9. Nagarim creates order
   order_id: ORD-123
   status: sent
   email: supplier@...
                     ↓
10. Cue to نگר: "בסדר! הזמנה ORD-123 נשלחה לספק1.
                 תקבלו אישור בדקה"
```

---

## 4. Agent Tools

### Tool 1: search_products
```
Input: query (string), quantity (number), language (string)
Output: { products: [{id, name, offers: [{supplier, price, stock}]}] }

Permissions:
- Public (anyone)

Constraints:
- Max 10 results
- Only active suppliers (status='approved')
- Price in ILS excl. VAT

Example:
search_products("דבק", 10, "he")
→ [{id: 1, name: "דבק 7047", ...}]
```

### Tool 2: get_product_details
```
Input: product_id (string)
Output: { id, name_he, description, brand, mpn, image, offers: [...] }

Permissions:
- Public (anyone)

Example:
get_product_details("prod-7047")
→ {id: "prod-7047", name_he: "דבק 7047", ...}
```

### Tool 3: get_carpenter_price
```
Input: carpenter_id (string), product_id (string), quantity (number)
Output: { 
  best_offer: {supplier_id, supplier_name, price, lead_time},
  tiers: [{min_qty, max_qty, unit_price}]
}

Permissions:
- Authenticated only (carpenter_id + carpenter_token)

Logic:
- Apply volume pricing (if tiers exist)
- Pick best offer (in-stock first, then cheapest)

Example:
get_carpenter_price("carp-123", "prod-7047", 10)
→ {best_offer: {..., price: 45}, tiers: [...]}
```

### Tool 4: create_order
```
Input: {
  carpenter_id (string),
  carpenter_token (string),
  items: [{product_id, quantity}]
}
Output: {
  order_id (string),
  status (sent|pending),
  total_excl_vat (number),
  supplier_id (string),
  confirmed_at (timestamp)
}

Permissions:
- Authenticated only (carpenter_id + carpenter_token)

Constraints:
- Verify carpenter owns this token
- Lock prices at order time (snapshot)
- Enforce quota if carpenter has tier limit

Example:
create_order({
  carpenter_id: "carp-123",
  carpenter_token: "xyz789",
  items: [{product_id: "prod-7047", quantity: 10}]
})
→ {order_id: "ORD-123", status: "sent", ...}
```

### Tool 5: get_order_status
```
Input: carpenter_id (string), order_id (string)
Output: {
  order_id,
  status (sent|pending|confirmed|rejected),
  items: [{product_name, quantity, unit_price}],
  supplier: {name, contact},
  created_at,
  confirmed_at (if applicable)
}

Permissions:
- Authenticated (carpenter_id only)

Security:
- Return only orders owned by this carpenter

Example:
get_order_status("carp-123", "ORD-123")
→ {order_id: "ORD-123", status: "sent", ...}
```

---

## 5. Security & Permissions

### Authentication

```
Layer 1: WhatsApp → Cue
  - Meta webhook signature validation
  - Extract phone number
  - Look up carpenter in Cue's database
  ✓ Cue now knows: carpenter_id, carpenter_token

Layer 2: Cue → Nagarim API
  - Cue sends: carpenter_id + carpenter_token
  - Nagarim verifies token (Server Component)
  - Nagarim scopes all queries to carpenter_id
  ✓ Nagarim trusts Cue authenticated this carpenter
```

### Authorization

| Tool | Who | Requirements |
|------|-----|--------------|
| search_products | Anyone | None |
| get_product_details | Anyone | None |
| get_carpenter_price | Authenticated | carpenter_id + valid token |
| create_order | Authenticated | carpenter_id + valid token |
| get_order_status | Authenticated | carpenter_id + valid token |

### Data Isolation

```
Carpenter A phone: 0501111111
Carpenter B phone: 0502222222

Cue's session:
- req.carpenterId = "carp-A"
- req.carpenterToken = "token-A"

Nagarim API:
- SELECT * FROM orders WHERE carpenter_id = req.carpenterId
- ✓ Carpenter A can only see their orders
- ✗ Carpenter A cannot see Carpenter B's orders
```

### Prompt Injection Prevention

**Problem:** LLM could be tricked to call wrong tool with wrong params

**Solution:** Structured Outputs + Explicit Constraints
```
System prompt:
"You have these tools:
  - search_products(query, quantity)
  - create_order(carpenter_id, carpenter_token, items)

DO NOT:
  - Make up carpenter_id or tokens
  - Search for competitors
  - Create multiple orders without confirmation
  - Exceed quantity limits

IF uncertain, ask the user for clarification."

Claude output: {"tool": "search_products", "params": {...}}
```

---

## 6. Confirmation Model

### Confirmation is NOT Optional

**Flow:**

```
1. User: "תזמין לי 5"
2. Claude: Identifies intent (create_order), gathers params
3. Cue: Build confirmation message
   "🛒 ההזמנה שלך:
    - דבק 7047 × 5 = ₪225
    - ספק: ספק1
    - סה״כ: ₪225
    
   בוודאות?"

4. User: "כן"
5. Cue: Call create_order() → POST /api/app/orders
6. Nagarim: Create order, email supplier
7. Cue: "✅ הזמנה ORD-123 נוצרה וכבר בדרך לספק"
```

### Edge Cases

| Case | Handler |
|------|---------|
| Quantity too high | "Max 100 per order" |
| Product out of stock | "Sorry, ספק1 out of stock. Try ספק2?" |
| Ambiguous time | (not MVP - scheduling is Cue's old feature) |
| Multiple suppliers | "3 suppliers available. Rank by price?" |

---

## 7. MVP Scope

### Phase 1: Core Purchasing (Weeks 1-4)

**In Scope:**
- ✅ Search products by text ("דבק", "מוזר", etc.)
- ✅ Show best price + alternatives
- ✅ Create order with confirmation
- ✅ Check order status
- ✅ Multi-tenant isolation (carpenter_id scoping)

**NOT in Scope:**
- ❌ Scheduling (that's Cue's original feature - keep separate)
- ❌ RFQ / supplier negotiation
- ❌ Bulk import (CSV)
- ❌ Inventory alerts
- ❌ Voice ordering
- ❌ Image search

### Phase 2: Future (After MVP Validation)

- Reorder history ("תזמין שוב מה שקנו")
- Bulk orders
- Supplier chat
- Price negotiations
- Delivery tracking

---

## 8. Risks & Recommendations

### Risk 1: Data Isolation Breach

**Scenario:** Cue bug sends wrong carpenter_id → carpenter A sees carpenter B's orders

**Mitigation:**
- ✓ Server-side RLS on Nagarim (database enforces isolation, not API)
- ✓ Log all carpenter_id lookups
- ✓ Test: carpenter_token validation fails for wrong ID
- ✓ Quarterly audit of cross-tenant queries

**Recommendation:** Implement RLS on carpenters/orders tables **before** Nagarim integration

---

### Risk 2: LLM Hallucination

**Scenario:** Claude invents a product ("יש מחיץ מיוחד של כביש"?) or makes up pricing

**Mitigation:**
- ✓ Claude only works with data from Nagarim API
- ✓ Structured outputs (JSON only, no markdown)
- ✓ Explicit constraints: "Never invent products. Only search and report results."
- ✓ Never show prices Claude calculates - always from API

**Recommendation:** Prompt injection tests before launch

---

### Risk 3: Meta Service Window

**Scenario:** Carpenter gets order confirmation but message never sends (24-hour window closed)

**Mitigation:**
- ✓ Cue already enforces 24-hour window
- ✓ Fallback: "Message couldn't send. Log in to Nagarim.com to check orders"
- ✓ Nagarim email still goes to supplier even if WhatsApp fails

**Recommendation:** Test failure path (simulate closed window)

---

### Risk 4: Carpenter Phone = Identity

**Scenario:** Carpenter switches phones or shares number

**Mitigation:**
- ✓ Carpenter token is separate from phone
- ✓ Each login generates new token (short-lived recommended)
- ✓ Nagarim validates token, not phone
- ✓ Log phone changes

**Recommendation:** Rate-limit carpenter registration per phone (prevent duplicates)

---

### Risk 5: Concurrent Orders

**Scenario:** Carpenter opens 2 Cue sessions, creates conflicting orders

**Mitigation:**
- ✓ Each order is atomic (Nagarim handles concurrency)
- ✓ No distributed lock needed
- ✓ Idempotency: if Cue retries, Nagarim dedupes by message_id

**Recommendation:** Implement idempotency token on POST /api/app/orders

---

## 9. External Dependencies

| Service | Purpose | Status |
|---------|---------|--------|
| Meta WhatsApp API | Messaging | Required (existing) |
| Anthropic Claude | Intent parsing | Required (new integration) |
| PostgreSQL | Database | Existing (both systems) |
| Nagarim API | Product/order data | Required (new endpoints) |
| Stripe | Billing (optional) | Optional (keep Cue's tier system) |

### No Breaking Changes Required

- Meta API: No new permissions needed (existing webhook)
- Nagarim: Only NEW endpoints (no changes to existing flow)
- Cue: New tools + new integration (no changes to scheduling)

---

## 10. Implementation Plan

### Phase 0: Preparation (Week 0)

1. **Nagarim**: Add RLS on carpenters/orders tables
2. **Nagarim**: Create new API endpoints (`/api/app/products/search`, etc.)
3. **Cue**: Add carpenter token validation logic
4. **Both**: Create test carpenter account on staging
5. **Both**: Document authentication flow

### Phase 1: Integration (Weeks 1-2)

1. **Cue**: Build B2B agent (search_products, create_order, etc.)
2. **Cue**: Add confirmation flow
3. **Cue**: Hook Claude to tools (via structured outputs)
4. **Nagarim**: Verify RLS (no data leaks)
5. **Integration Tests**: E2E order creation

### Phase 2: Polish (Week 3)

1. **Cue**: Error handling (product not found, out of stock, etc.)
2. **Cue**: Localization (Hebrew + English)
3. **Cue**: Rate limiting (prevent abuse)
4. **Both**: Security testing (prompt injection, token hijacking)

### Phase 3: Launch (Week 4)

1. **Both**: Deploy to production
2. **Cue**: Announce WhatsApp channel to testers
3. **Monitor**: Watch for integration issues
4. **Feedback**: Iterate based on carpenter feedback

---

## 11. Questions Answered

| Q | A |
|---|---|
| **Cue משתנה או נוסף?** | שניהם - הוא מרחיב את עצמו (tools), לא משנה את ליבו (scheduling) |
| **במקום Nagarim web או בנוסף?** | בנוסף - web site נשאר, זו רק channel חדשה |
| **צריך שינויים בMeta?** | לא שינויים, רק אישור של טמפלט חדש אם צריך |
| **צריך שינויים בNagarim?** | API endpoints חדשים בלבד (לא כל משהו קיים) |
| **איך Cue מזהה נגרים?** | Phone from WhatsApp → lookup in DB → verify token |
| **מה אם נגר משנה טלפון?** | Token הוא הזהות (לא הטלפון), אז אין בעיה |
| **איך מונעים גישה בין-נגרית?** | RLS בNagarim + carpenter_id scoping בכל query |

---

## 12. Recommendation

### ✅ Go Ahead - Architecture is Sound

**Why:**
1. Minimal breaking changes (only new endpoints)
2. Strong security model (server-side RLS, token validation)
3. Leverages existing Cue + Nagarim architectures
4. MVP is achievable in 4 weeks
5. Risk mitigation paths are clear

**Prerequisites:**
1. Implement RLS on Nagarim (non-negotiable)
2. Architect Cue's B2B agent layer
3. Test authentication flow thoroughly
4. Document API contracts

**Red Flags to Watch:**
- Data isolation breaches (test aggressively)
- LLM hallucination (structured outputs help, but test)
- Meta service window edge cases
- Concurrent order handling

---

## Next Steps

1. **Review** this proposal with stakeholders
2. **Approve** or request changes
3. **Only then** → Implementation task (separate session)

**This is Consultation. No code changes yet. ✋**

---

**Document Date:** 2026-09-23  
**Status:** Proposal (Review Phase)  
**Architecture:** Cue + Nagarim Integration  
**Confidence Level:** High (both systems already exist, integration is additive)
