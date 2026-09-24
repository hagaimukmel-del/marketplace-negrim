# Architecture Proposal v2: Cue × Nagarim Integration (REVISED)

**Status:** Architecture Gate — **NOT YET APPROVED**  
**Date:** 2026-09-23  
**Based on:** Code audit of Nagarim + Cue + advisor feedback

---

## Executive Summary: Critical Changes from v1

**v1 had three major flaws:**
1. ❌ Cue held carpenter credentials (token) — **SECURITY RISK**
2. ❌ Phone-to-carpenter lookup was direct — **NO IDENTITY VERIFICATION**
3. ❌ Agent decided logic (best offer, supplier) — **NOT NAGARIM'S DECISION**

**v2 fixes all three:**
1. ✅ Service-to-service auth only (Cue proves IT IS Cue)
2. ✅ Phone → Cue User → Verified Link → Nagarim Account
3. ✅ Nagarim decides everything; Agent only requests

**Architecture:**
```
WhatsApp
    ↓
Cue (WhatsApp Handler)
    ↓
Agent Router
    ├─ Scheduler Agent (existing, unchanged)
    └─ Nagarim Agent (new, reads-only tools + request tools)
         ↓
      Nagarim Service
      (applies business rules)
         ↓
      Database
```

---

## SECTION 1: Identity & Linking

### Current State (VERIFIED from code audit)

**Nagarim carpenter identification:**
```
Carpenter → token (sent via email) → resolveCarpenter(token) → carpenter ID
```
- Token is the only credential; carpenter_id is derived
- Session cookie also valid if logged in on same device
- Phone + email used only for lookup, never as auth

**Cue user identification:**
```
WhatsApp sender phone → getUserByPhone() → Cue user ID
```
- Cue has its own user database
- Phone is the lookup key
- Users are signed up in Cue separately

### The Problem

**Current state assumes:**
- WhatsApp phone number IS Nagarim carpenter
- This is fundamentally wrong

**Why:**
- Same person might message from multiple numbers
- Same number might be shared
- A person with Cue account ≠ person with Nagarim account
- Nagarim requires verification (email address, business details)

### Proposed Solution: Identity Linking

**New flow (first time WhatsApp user appears):**

```
1. WhatsApp message from +972501234567
   ↓
2. Cue middleware identifies as Cue user (or new user)
   ↓
3. Agent asks: "Is this for Nagarim? If yes, verify your link"
   ↓
4a. User: "Yes, I'm Nir's Carpentry (+972..." (email verification)
    ↓
    Nagarim: "Send verification link to nir@carpentry.com"
    ↓
    User clicks email link
    ↓
    Nagarim creates linkage:
    {
      cue_user_id: "xyz",
      carpenter_id: "abc123",
      phone: "+972501234567",
      verified_at: now,
      expires_at: never (or long-lived)
    }
    ↓
    "✅ Linked! You can now order from WhatsApp"

4b. User: "No, just want scheduling"
    ↓
    Continue as regular Cue user (scheduler only)
```

**Subsequent requests from same WhatsApp number:**
```
WhatsApp +972501234567
  ↓
Cue: Look up verified link
  ↓
If linked: cue_user_id → carpenter_id → Nagarim context
If not: regular Cue user (no Nagarim access)
```

### Design Principles (v2 Fix #1)

🟢 **NAGARIM IS AUTHORITY ON CARPENTER IDENTITY**
- Agent never receives carpenter_id
- Agent never receives token
- Agent receives: "verified Nagarim user context" (opaque to agent)

🟢 **COYOTE ISOLATION**
- Cue maintains its own user table
- Nagarim maintains its own carpenter table
- Only the LINK between them is shared
- No credentials cross the boundary

---

## SECTION 2: Service-to-Service Authentication

### Current State (VERIFIED from code audit)

**Carpenter → Nagarim API:**
- Token in request body: `{ token: "xyz..." }`
- Server-side: `resolveCarpenter(token)` returns carpenter object
- Cookie-based: session signed by Next.js

**Cue → Nagarim API (proposed):**
- ❌ v1 proposed: Cue sends `{ carpenter_id, carpenter_token }`
- ✅ v2 proposes: Cue authenticates itself as a service

### The Problem with v1

If Cue holds carpenter_token:
- Breach of Cue database = breach of all Nagarim accounts linked to Cue
- Token could be logged, cached, exposed
- Agent code could leak it in errors/logs

### Proposed Solution: Server-to-Server Token (Mutual TLS or Shared Secret)

**Model:**
```
Cue obtains a SERVICE TOKEN from Nagarim
(separate from carpenter tokens)

Cue sends:
{
  service_token: "svc_xyz...",
  cue_user_id: "123",
  context: { /* opaque context from verified link */ }
}

Nagarim:
1. Validates service_token (server-only, not given to Agent)
2. Looks up verified link: cue_user_id → carpenter_id
3. Attaches carpenter_id to request context
4. Agent receives ZERO credentials
```

**Implementation:**
```typescript
// On Nagarim side
async function validateCueServiceRequest(req) {
  const serviceToken = req.headers['x-service-token'];
  
  // Verify token (HMAC or DB lookup)
  const service = await verifyServiceToken(serviceToken);
  if (!service || service.name !== 'cue') {
    return null; // Reject
  }
  
  const cueUserId = req.body.cue_user_id;
  const link = await db.cue_nagarim_links.findOne({
    cue_user_id: cueUserId,
    verified: true
  });
  
  if (!link) {
    return null; // No verified link
  }
  
  // Attach to context, but don't give to agent
  req.carpenter_id = link.carpenter_id; // Server-only
  req.canAccessNagarim = true;
}

// What Agent receives (in tools)
async function getOffers() {
  // req.carpenter_id is IMPLICIT in request context
  // not passed by agent
  
  return getNagarimOffers(req.carpenter_id);
}
```

### Design Principles (v2 Fix #2)

🟢 **NEVER GIVE CREDENTIALS TO AGENT**
- Agent cannot receive tokens, passwords, or service secrets
- Agent calls tools; tools use server context to prove who is asking

🟢 **SERVICE TOKEN IS LONG-LIVED, CARPENTER TOKEN IS SHORT-LIVED**
- Service token: rotated quarterly or on breach
- Carpenter token: 180 days, per-session

---

## SECTION 3: Agent Router Architecture

### Current Cue Architecture (VERIFIED from code)

```
WhatsApp webhook
       ↓
Meta signature validation
       ↓
Extract user context
       ↓
Claude Haiku: parseSchedulingIntent()
       ↓
Based on intent, execute action:
  - Schedule message
  - Answer question
  - Manage contact
```

### Problem: Where Does Nagarim Fit?

**v1 proposed:**
```
Intent Parser (Claude call #1)
  ↓
Decide: is this scheduling or B2B?
  ↓
If B2B: Agent (Claude call #2)
  ↓
Tools
```

**Problem:** Two Claude calls for one message = cost + latency.

### Proposed Solution: Unified Agent Router

```
WhatsApp webhook
       ↓
Extract Cue user context
       ↓
Unified Intent Router (Claude Haiku)
  - system prompt includes BOTH tool sets
  - scheduling tools
  - nagarim tools
       ↓
Claude chooses which tool based on user intent
       ↓
Tool execution
       ↓
Response back to WhatsApp
```

**System prompt:**
```
You are a WhatsApp assistant with two distinct capabilities:
1. SCHEDULING: you can schedule messages
2. B2B PURCHASING: you can search products and create orders (if verified)

If the user is asking about scheduling, use scheduling tools.
If the user is asking about B2B purchasing, you need verification first.
If verified, use nagarim tools.

Tools for scheduling:
  - schedule_message
  - cancel_scheduled
  - list_scheduled

Tools for B2B (if verified):
  - search_products
  - get_product_details
  - get_offers
  - get_carpenter_price
  - create_order
  - get_order_status

IMPORTANT:
- You NEVER receive carpenter_id, tokens, or credentials
- You NEVER make decisions about price or supplier
- You ask, Nagarim decides
- Every transaction requires user confirmation
```

### Design Principles (v2 Fix #3)

🟢 **ONE CLAUDE CALL PER MESSAGE**
- Intent parsing + routing = same call
- Reduces latency and cost

🟢 **AGENT IS DUMB, NAGARIM IS SMART**
- Agent: "User wants 10 דבקים. Is that a real product?"
- Nagarim: "Yes, here are 3 suppliers at different prices"
- Agent: "I found 3 options. User picks #1"
- Nagarim: "Creating order for supplier A with these terms"

---

## SECTION 4: Tools & Nagarim Contracts

### Tool 1: search_products (PUBLIC)

```typescript
Tool: search_products
Input: {
  query: string,        // "דבק", "מוזר", etc
  language: "he" | "en"
}
Output: {
  success: boolean,
  products: [{
    id: string,
    name_he: string,
    name_en: string | null,
    image_url: string | null,
    category: string
  }],
  limit: 10
}
Status: PUBLIC (no auth required)
Constraints:
  - No pricing
  - No supplier details
  - Just "does this exist?"
  - Deduped on product, not supplier offers
```

**Nagarim contract:**
```
GET /api/app/products/search?query=דבק&language=he
→ Returns products (no supplier data, no pricing)
```

### Tool 2: get_product_details (PUBLIC)

```typescript
Tool: get_product_details
Input: {
  product_id: string
}
Output: {
  id: string,
  name_he: string,
  description: string | null,
  category: string,
  image_url: string | null,
  base_unit: "unit" | "kg" | "liter" | "meter" | "sqm"
}
Status: PUBLIC (no auth required)
Constraints:
  - Informational only
  - No pricing
  - No stock
```

**Nagarim contract:**
```
GET /api/app/products/:id?language=he
→ Returns product details (no supplier offers)
```

### Tool 3: get_offers (AUTHENTICATED)

```typescript
Tool: get_offers
Input: {
  product_id: string,
  quantity: number (optional, for volume pricing),
  language: "he" | "en"
}
Output: {
  product_id: string,
  offers: [{
    supplier_id: string,
    supplier_name: string,
    price_excl_vat: number,
    pack_label: string | null,
    pack_qty: number | null,
    stock_qty: number,
    min_order_qty: number,
    lead_time_days: number,
    is_best: boolean  // marked by Nagarim's bestOffer logic
  }]
}
Status: AUTHENTICATED (requires carpenter link verification)
Constraints:
  - Calls Nagarim's bestOffer() to rank
  - Returns multiple suppliers
  - Agent does NOT decide which is "best"
  - Agent shows all, user chooses
```

**Nagarim contract:**
```
GET /api/app/products/:id/offers
  ?quantity=10&language=he
  X-Service-Token: svc_...
  X-Cue-User-Id: ...
→ Returns offers ranked by bestOffer()
→ Scoped to carpenter via service context
```

### Tool 4: create_order (AUTHENTICATED + CONFIRMATION)

```typescript
Tool: create_order
Input: {
  items: [{
    product_id: string,
    quantity: number,
    supplier_id: string  // from offers, not from agent choice
  }],
  confirmation_id: string,  // from user confirmation
  message_id: string        // from WhatsApp message_id
}
Output: {
  success: boolean,
  orders: [{
    order_id: string,
    order_number: string,
    supplier_id: string,
    supplier_name: string,
    total_excl_vat: number,
    total_incl_vat: number
  }],
  checkout_id: string
}
Status: AUTHENTICATED + CONFIRMATION REQUIRED
Constraints:
  - ❌ NO silent orders
  - User must confirm explicitly ("כן", "בסדר", etc)
  - confirmation_id + message_id prevent duplicates
  - Idempotent: same confirmation_id = same result
```

**Nagarim contract:**
```
POST /api/app/orders
Body: {
  items: [{product_id, quantity, supplier_id}],
  confirmation_id: string,
  message_id: string,
  X-Service-Token: svc_...
  X-Cue-User-Id: ...
}
→ Nagarim handles all business logic:
  - Volume pricing
  - Minimum order value
  - Stock validation
  - Price snapshot
  - One cart → multiple POs per supplier
  - Existing notification workflow
→ Returns order IDs
```

### Tool 5: get_order_status (AUTHENTICATED)

```typescript
Tool: get_order_status
Input: {
  order_id: string
}
Output: {
  order_id: string,
  order_number: string,
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled",
  supplier_name: string,
  total_incl_vat: number,
  items: [{
    product_name_he: string,
    quantity: number,
    unit_price_excl_vat: number
  }],
  created_at: timestamp,
  confirmed_at: timestamp | null
}
Status: AUTHENTICATED
Constraints:
  - Read-only
  - Scoped to carpenter
```

**Nagarim contract:**
```
GET /api/app/orders/:order_id
  X-Service-Token: svc_...
  X-Cue-User-Id: ...
→ Returns order details (only if owned by carpenter)
```

---

## SECTION 5: Confirmation & Idempotency

### The Problem: Webhooks Are Unreliable

```
User: "כן" (confirm order)
  ↓
WhatsApp webhook → Cue
  ↓
create_order() → POST to Nagarim
  ↓
Timeout (network hiccup)
  ↓
Cue thinks it failed
  ↓
Cue retries
  ↓
Second create_order() call
  ↓
Nagarim creates order TWICE
```

### Solution: Idempotency Key + Confirmation Token

**On Cue side:**
```javascript
// When user confirms
const confirmationId = crypto.randomUUID();
const messageId = message.id; // From WhatsApp

// Store in pending_actions table
db.pending_actions.insert({
  cue_user_id: userId,
  confirmation_id: confirmationId,
  message_id: messageId,
  action: "create_order",
  items: [...],
  created_at: now(),
  expires_at: now() + 15min
});

// Call Nagarim with both IDs
await createOrder({
  items: [...],
  confirmation_id: confirmationId,
  message_id: messageId
});
```

**On Nagarim side:**
```typescript
// Endpoint: POST /api/app/orders
async function createOrder(req) {
  const { confirmation_id, message_id, items } = req.body;
  
  // Check idempotency
  const existing = await db.orders.findOne({
    confirmation_id: confirmation_id
  });
  
  if (existing) {
    // Already processed, return cached result
    return {
      success: true,
      orders: existing.orders,
      confirmation_id: confirmation_id
    };
  }
  
  // New order, process it
  const orders = await processOrderCreation(...);
  
  // Store confirmation_id for future idempotency
  db.order_confirmations.insert({
    confirmation_id: confirmation_id,
    message_id: message_id,
    order_ids: orders.map(o => o.id),
    created_at: now()
  });
  
  return { success: true, orders: ... };
}
```

### Flow: Complete Example

```
User: "תזמין לי 5 דבקים אצל ספק1"
  ↓
Agent (via search_products): "מצאתי דבק 7047"
  ↓
Agent (via get_offers): "ספק1 מחיר ₪45"
  ↓
Agent: "תזמין 5 × 45 = ₪225? (בסדר)"
  ↓
User confirms: "בסדר"
  ↓
Agent (via create_order with confirmation_id=abc123):
  {
    items: [{product_id: p1, quantity: 5, supplier_id: s1}],
    confirmation_id: "abc123",
    message_id: "msg_456"
  }
  ↓
Nagarim:
  - Validates confirmation_id is new
  - Creates order
  - Stores confirmation_id
  - Sends to supplier (existing workflow)
  ↓
Response: "✅ הזמנה ORD-123-A נוצרה"

If webhook times out and retries:
  ↓
Nagarim checks confirmation_id
  ↓
"Already processed, returning cached result"
  ↓
No duplicate order
```

---

## SECTION 6: Scheduler Coexistence

### CRITICAL: Cue Scheduler MUST NOT BREAK

**Current Cue features (REQUIRES AUDIT to understand exact code):**
- Users can schedule messages to contacts
- Messages send within 24-hour window
- Stripe billing per tier
- Contact management

**Integration requirement:**
```
Unified Agent Router
  ├─ Scheduler tools (unchanged)
  │   - schedule_message
  │   - cancel_scheduled
  │   - list_scheduled_messages
  │   - manage_contacts
  │
  └─ Nagarim tools (new)
      - search_products
      - get_offers
      - create_order
      - get_order_status
```

**No breaking changes:**
- Existing scheduler users continue to work
- New B2B users use Nagarim tools
- Same Cue user can do both

**Implementation note:**
- Tools are conditional on user's `can_access_nagarim` flag
- Flag is set after verification link is created
- Non-verified Cue users cannot call Nagarim tools

---

## SECTION 7: MVP Scope

### MVP 0: Read-Only (Weeks 1-2)

**What the agent can do:**
- ✅ Search products ("יש לך דבק?")
- ✅ Get product details ("מה זה דבק 7047?")
- ✅ Get offers ("מה המחיר?")
- ✅ Check order status ("מה סטטוס ההזמנה שלי?")

**What the agent CANNOT do:**
- ❌ Create orders
- ❌ Link WhatsApp to Nagarim
- ❌ Any mutations

**Why MVP 0 first:**
- Test read-only tools safely
- Verify Nagarim API contracts
- No risk of accidental orders

### MVP 1: Transactions (Weeks 3-4)

**Add:**
- ✅ Identity linking (WhatsApp → verified Nagarim)
- ✅ Create order (with confirmation)
- ✅ Idempotency safeguards

**Scope:**
- Single supplier per order (no multi-supplier split yet)
- Simple quantity + product selection
- No bulk orders
- No negotiation

### Future (Post-MVP)

- Reorder history
- Bulk orders
- Supplier negotiation
- Delivery tracking
- Price negotiations

---

## SECTION 8: Meta & WhatsApp Configuration

### Current Meta Setup (REQUIRES AUDIT)

**Verified from Cue code:**
- ✅ Webhook signature validation (HMAC-SHA256)
- ✅ Message template system (delivery vs consent)
- ✅ 24-hour service window enforcement
- ✅ Sends to individual phones

**Unknown (REQUIRES AUDIT):**
- Does Cue use business-initiated messaging?
- What permission scopes does the current token have?
- Are there any business account restrictions?
- Can Cue send status updates to users (post-purchase)?

### Proposed Meta Changes

**For MVP 0:** None. Just read messages.

**For MVP 1:** Potentially one new template
```
Template name: order_created_notification
Role: delivery
Language: he, en
Content (example):
  "✅ הזמנה {{order_number}} אושרה לספק {{supplier_name}}"
```

**But:** This requires an actual audit of:
1. Does existing template system support this?
2. What are the sending limits?
3. Is a new business account needed?
4. Are there rate limits per number?

### Pre-Implementation Gate Item

🔴 **BLOCKED UNTIL AUDITED:**
- [ ] Meta webhook validation works with B2B messages
- [ ] Existing template system can handle order notifications
- [ ] Business account allows sending status updates
- [ ] No additional Meta API changes needed

---

## SECTION 9: Data Segregation & Security

### What Data Each System Owns

**Cue owns:**
- User profile (phone, tier, billing)
- Scheduling queue
- Message history (7-day retention)
- Contacts/groups
- `cue_nagarim_links` table (verification status only)

**Nagarim owns:**
- Carpenter details (business_name, email, address)
- Products & pricing
- Orders & order items
- Suppliers & their terms
- Carpenter → organization mapping

**Shared (linking table):**
```sql
cue_nagarim_links:
  id
  cue_user_id (FK to Cue.users)
  carpenter_id (FK to Nagarim.carpenters)
  verified: boolean
  verified_at: timestamp | null
  created_at: timestamp
```

### RLS & Access Control

**Cue-side RLS:**
```sql
-- Cue users can only see their own data
WHERE user_id = auth.uid()
```

**Nagarim-side RLS:**
```sql
-- Carpenters can only see their own orders
WHERE carpenter_id = auth.carpenter_id()
```

**Service-to-service:**
```sql
-- Only verified links allow cross-system access
SELECT * FROM cue_nagarim_links
WHERE cue_user_id = ? AND verified = true
  AND verified_at IS NOT NULL
```

---

## SECTION 10: Logging & Observability

### What to Log (For Debugging & Compliance)

**Cue logs:**
- Message received from WhatsApp
- Intent parsing result
- Tool called + parameters
- Tool result (NOT full response)
- Error messages

**Nagarim logs:**
- Service token validated ✅ or ❌
- Carpenter identified
- Order created
- Notification sent

**NOT logged:**
- Tokens
- Credentials
- User emails (except in errors)
- Full order details in routine logs

---

## SECTION 11: Failure Modes & Edge Cases

### Edge Case 1: WhatsApp Number Not Verified

```
User: "תזמין לי דבק"
Agent: "I need to verify your identity first.
        Do you have a Nagarim account? If yes, reply with your email"
User: "Yes, nir@carpentry.com"
Agent: "Check your email — click the link to verify"
User clicks → Nagarim creates link
Agent: "✅ Now I can help with orders"
```

### Edge Case 2: Same Person, Multiple Numbers

```
Carpenter uses Cue from two phones:
  +972501111111 → Cue user A
  +972502222222 → Cue user B

Both verify to same carpenter.
→ cue_nagarim_links has two rows, same carpenter_id
→ Each WhatsApp number works independently
→ Orders appear under same Nagarim carpenter
```

### Edge Case 3: Order Confirmation Times Out

```
User confirms order
Cue sends create_order() to Nagarim
Network timeout (no response)
Cue waits 30 seconds
Cue: "Sorry, couldn't confirm. Try again?"

User: "Try again"
Cue sends with same confirmation_id
Nagarim: "Already processed, returning cached result"
Cue: "✅ Confirmed (actually was already confirmed)"
```

### Edge Case 4: Supplier Goes Offline Mid-Order

```
Agent shows: Supplier A, ₪45
User confirms
Agent calls create_order
Nagarim checks: Supplier A offer is no longer active
Nagarim: "Sorry, that supplier is no longer available. Try again?"

Options returned:
  - Supplier B, ₪48
  - Supplier C, ₪52
User picks B
Agent calls create_order again with new supplier_id
```

---

## SECTION 12: 7 Architectural Questions + Answers

### Q1: How do we link WhatsApp User to Nagarim User?

**ANSWER:** Email verification flow + cue_nagarim_links table
- WhatsApp user → Cue sends email link → user verifies → creates link
- Link stores cue_user_id + carpenter_id + verified flag
- No credentials cross the boundary

### Q2: Does Cue need to hold carpenter_token?

**ANSWER:** NO. Service-to-service token instead.
- Cue gets a long-lived SERVICE TOKEN from Nagarim (rotated quarterly)
- Cue never receives or stores carpenter tokens
- Nagarim validates service token server-side

### Q3: How does Nagarim identify the user without carpenter_id in the request?

**ANSWER:** Server-side resolution from verified link
```
Request arrives with X-Cue-User-Id header
Server: Look up verified link → carpenter_id
Attach carpenter_id to SERVER CONTEXT (not visible to agent)
Agent gets: (nothing about identity)
Tools receive: implicitly scoped to carpenter_id
```

### Q4: Which data/pricing are public vs. authenticated?

**ANSWER:**
- 🟢 Public: Product names, descriptions, base_unit, category
- 🔴 Authenticated: Pricing, supplier offers, stock, volume pricing
- 🟡 Mixed: Can have both (e.g., "Product exists (public), but supplier prices are not public")

### Q5: Who decides price/supplier selection?

**ANSWER:** Nagarim exclusively
- Agent: "Which would you like?"
- Nagarim: Ranks suppliers via bestOffer()
- Agent: Shows ranking
- User: Picks one
- Nagarim: Validates choice, creates order

Agent never calls `selectBestOffer()` or any ranking function.

### Q6: What exactly changes in Meta? (Not assumption, REQUIRES AUDIT)

**ANSWER:** TBD — requires code audit
- Current templates: message_reminder (scheduling)
- New templates needed: order_created_notification? (maybe)
- New permissions needed: ? (maybe)
- Rate limits changed: ? (maybe)

**Pre-Implementation gate: MUST AUDIT before coding**

### Q7: How does this integrate with Scheduler without breaking it?

**ANSWER:** Unified Agent Router with conditional tools
```
Agent tools = scheduler tools + nagarim tools
Agent calls appropriate tools based on user intent
Scheduler users continue unchanged
Nagarim users only access nagarim tools if verified
```

---

## PRE-IMPLEMENTATION GATE CHECKLIST

**Do NOT move to implementation until all boxes are checked.**

- [ ] **Identity Model Approved**
  - [ ] Email verification flow defined
  - [ ] cue_nagarim_links table schema approved
  - [ ] Linking flow tested with staging data

- [ ] **Auth Model Approved**
  - [ ] Service token rotation policy defined
  - [ ] Token format approved
  - [ ] Server-side scoping mechanism approved

- [ ] **API Contracts Approved**
  - [ ] 5 tools' input/output fully specified
  - [ ] Error codes defined
  - [ ] Rate limits defined

- [ ] **Business Logic Ownership Approved**
  - [ ] Nagarim responsible for: pricing, supplier selection, minimum order, VAT
  - [ ] Agent responsible for: understanding user intent, requesting actions
  - [ ] Nagarim decides: yes/no to every request

- [ ] **Meta Configuration Audited**
  - [ ] Existing templates tested with B2B messages
  - [ ] New templates identified (if needed)
  - [ ] Permission scopes verified
  - [ ] Rate limits documented

- [ ] **Existing Order Flow Mapped**
  - [ ] notifyNewOrders() tested with Cue → Nagarim orders
  - [ ] Email to supplier still works
  - [ ] Supplier invoice flow unchanged

- [ ] **Scheduler Regression Plan Approved**
  - [ ] Existing scheduler tools unmodified
  - [ ] Tool routing logic doesn't break scheduling
  - [ ] Scheduler users tested (staging)

- [ ] **Security Model Approved**
  - [ ] No credentials in Agent context
  - [ ] RLS scoping verified
  - [ ] Logging doesn't leak secrets
  - [ ] Idempotency implementation prevents duplicates

- [ ] **MVP 0 Scope Approved**
  - [ ] Read-only tools only (no mutations)
  - [ ] MVP 1 timeline clear (Weeks 3-4)
  - [ ] Risks understood

- [ ] **Risk Mitigation Approved**
  - [ ] Idempotency safeguards tested
  - [ ] Timeout scenarios handled
  - [ ] Token breach impact limited
  - [ ] Failure messages clear to user

---

## SECTION 13: Categorization of Statements (VERIFIED/PROPOSED/REQUIRES AUDIT)

### VERIFIED (from code audit)

✅ Nagarim uses token-based carpenter auth (not username/password)
✅ Carpenter token is long-lived (180 days)
✅ Nagarim resolves carpenter from token, not from carpenter_id in request
✅ Orders are scoped to carpenter_id server-side
✅ Nagarim's existing order workflow: notifyNewOrders() → email
✅ Cue identifies users by WhatsApp phone number
✅ Cue already validates Meta webhook signatures
✅ Cue has a user database separate from Nagarim
✅ Claude Haiku is used for intent parsing in Cue
✅ Cue enforces 24-hour service window for messages

### PROPOSED (architectural recommendations)

⚙️ Agent Router pattern (unified Intent + routing)
⚙️ Service-to-service authentication (Cue proves itself, not the user)
⚙️ Identity linking via email verification
⚙️ cue_nagarim_links table for verified associations
⚙️ No credentials given to Agent (server-side context only)
⚙️ Nagarim decides all business logic (pricing, supplier, validation)
⚙️ Idempotency key (confirmation_id) prevents duplicate orders
⚙️ MVP 0 = read-only, MVP 1 = transactions
⚙️ Unified Agent Router (not separate Intent Parser + Agent)

### REQUIRES AUDIT (cannot determine without code inspection)

🔍 Does Cue's existing Meta setup support business-initiated messaging (status updates)?
🔍 What are the current Meta template permissions and limits?
🔍 Can Cue send messages OUTSIDE the 24-hour window (for order updates)?
🔍 What happens to messages that fail the service window check?
🔍 How is Cue's billing tied to message count? (Does B2B orders count against quota?)
🔍 What is the exact flow of notifyNewOrders() in Nagarim? (Can Cue trigger it?)
🔍 Are there rate limits on POST /api/orders in Nagarim?
🔍 Does Nagarim have idempotency enforcement anywhere already?
🔍 Can Cue and Nagarim databases be in the same Supabase project or separate projects?

---

## Conclusion: What's Different from v1

| Issue | v1 | v2 |
|-------|----|----|
| **Carpenter token in Cue** | ❌ Huge risk | ✅ No tokens, service auth only |
| **Phone = Carpenter** | ❌ No verification | ✅ Email-verified link |
| **Agent decides logic** | ❌ Wrong authority | ✅ Nagarim decides |
| **Double Claude calls** | ❌ Expensive | ✅ One call, unified router |
| **Idempotency** | ❌ Mentioned but not detailed | ✅ confirmation_id + message_id |
| **Scheduler impact** | ❌ Unclear | ✅ Coexistence plan |
| **MVP scope** | ❌ Too big (do everything) | ✅ MVP 0 read-only, MVP 1 write |
| **Meta assumptions** | ❌ "Probably works" | ✅ Audit required before coding |

---

## Next Step

**WAIT FOR APPROVAL ON GATE CHECKLIST ABOVE BEFORE ANY CODING.**

Once all checkboxes are ✅, proceed to implementation session.

**This document is the contract between you and Claude for Phase: Implementation.**

---

**Document Date:** 2026-09-23  
**Status:** Awaiting Approval  
**Effort to complete gates:** 8-12 hours (mostly Meta audit + staging tests)  
**Ready to implement:** Once approved
