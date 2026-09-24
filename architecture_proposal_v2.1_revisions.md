# Architecture Proposal v2.1: Critical Revisions

**Purpose:** Address 6 architectural refinements before Implementation  
**Status:** Targeted fixes only — no other changes to v2  
**Based on:** Advisor review of v2

---

## REVISION 1: Source of Truth for cue_nagarim_links

### The Problem
v2 says: "Cue maintains cue_nagarim_links"  
But then: "Nagarim API validates link via X-Cue-User-Id"  
This creates ambiguity: who is the authoritative source?

### The Solution: NAGARIM OWNS THE LINK

**Redesign:**

```
cue_nagarim_links table location: NAGARIM DATABASE
├── cue_user_id (string, from Cue)
├── carpenter_id (FK to carpenters)
├── verified: boolean
├── verified_at: timestamp | null
├── link_token: string (used by Cue to prove it knows the link)
├── created_at: timestamp
└── deleted_at: timestamp | null (soft delete)
```

**Flow:**

```
1. First time: Cue user says "link me to nir@carpentry.com"
   ↓
2. Cue sends to Nagarim:
   {
     action: "create_link",
     cue_user_id: "cue_xyz",
     carpenter_email: "nir@carpentry.com"
   }
   ↓
3. Nagarim:
   - Finds carpenter by email
   - Sends verification link to carpenter's email
   - Stores pending link: verified=false
   - Returns link_token to Cue: "link_abc123xyz"
   ↓
4. Carpenter clicks email link
   - Nagarim: verified=true, verified_at=now
   ↓
5. Cue stores link_token in its session
   ↓
6. All future requests from Cue:
   Authorization: Bearer svc_token
   X-Cue-Link-Token: link_abc123xyz
   
   Nagarim validates:
   - svc_token is valid
   - link_token exists and verified=true
   - resolve to carpenter_id
```

**Why this is better:**
- Nagarim is authoritative (only source of truth)
- Carpenter controls verification (not automated)
- Link token is short-lived (session-only in Cue)
- No cross-database trust required
- Carpenter can revoke link from Nagarim

---

## REVISION 2: Service-to-Service Authentication Model

### The Problem
v2 says "rotate quarterly" but no actual Security Model.

### The Solution: COMPLETE SERVICE AUTH SPECIFICATION

**Authentication mechanism:**
```
Cue ← → Nagarim (service-to-service)

Request format:
{
  Authorization: Bearer svc_xyz...
  X-Cue-Link-Token: link_abc123xyz  (if user-scoped)
  X-Request-Timestamp: 2026-09-23T14:30:00Z
  X-Request-Signature: HMAC-SHA256(...)
  
  Body: {...}
}

Signature calculation:
HMAC-SHA256(
  key: SERVICE_SECRET,
  message: METHOD + \n + PATH + \n + TIMESTAMP + \n + BODY_JSON
)

Prevents:
✅ Impersonation (bearer token is secret)
✅ Tampering (HMAC-SHA256 detects changes)
✅ Replay (timestamp window: ±60 seconds)
✅ Stale requests (timestamp expires)
```

**Token lifecycle:**
```
Token type: SERVICE_TOKEN (opaque, not JWT)
Format: svc_{env}_{random256bits}_{checksum}
  e.g., svc_prod_7f8a9c2d... (48 chars)

Rotation policy:
  - Quarterly automatic rotation
  - Can rotate on-demand
  - Old token stays valid for 24 hours after new one issued
  - Audit trail of all rotations

Revocation:
  - Manual revocation (immediate)
  - Automatic if credential suspected compromised
  - Logged with timestamp + reason

Environment separation:
  - svc_staging_... cannot reach production
  - svc_prod_... cannot reach staging
  - Enforced at Nagarim API layer

Expiry:
  - Tokens do not expire (rotation instead)
  - But can be manually marked expired
  - New token always takes precedence

Audit trail:
  - Every service call logged: timestamp, svc_token_id, action
  - Token rotations logged: old_id, new_id, reason, timestamp
  - Failed auth attempts logged: svc_token_id, reason, timestamp
```

**Implementation checklist:**
- [ ] Service tokens stored in Nagarim.settings or .env
- [ ] Signature verification on every request
- [ ] Timestamp validation (±60 sec window)
- [ ] Rate limiting per service token (e.g., 100 req/min)
- [ ] Audit logging of auth attempts
- [ ] Token rotation mechanism documented
- [ ] Secrets never logged in full (log only svc_staging_xxx)

---

## REVISION 3: MVP Phasing (0 / 0.5 / 1)

### The Problem
v2 says MVP 0 = read-only, but then includes identity linking.  
Identity linking is not read-only, so there's a conflict.

### The Solution: THREE-PHASE MVP

**MVP 0: Read-Only Discovery (Weeks 1-2)**
- ✅ Scheduler continues unchanged
- ✅ search_products (public catalog)
- ✅ get_product_details (public)
- ✅ Cue messages via Agent Router
- ❌ No authentication needed
- ❌ No identity linking
- ❌ No offers/pricing
- ❌ No order status

**Purpose:** Test Agent Router + tool calling without auth complexity

**Deploy:** Staging only, verify tool calling works

---

**MVP 0.5: Authenticated Read-Only (Weeks 2.5-3)**
- ✅ All of MVP 0, plus:
- ✅ Identity linking (email verification)
- ✅ Service token validation
- ✅ get_offers (authenticated)
- ✅ get_carpenter_price (authenticated)
- ✅ get_order_status (authenticated)
- ❌ No create_order
- ❌ No mutations

**Purpose:** Test identity model + auth layer before transactions

**Deploy:** Staging, verify:
- Email verification works
- Service token validates
- Carpenter can link WhatsApp to Nagarim
- Carpenter can see offers for their account

---

**MVP 1: Transactions (Weeks 3.5-4)**
- ✅ All of MVP 0.5, plus:
- ✅ create_order
- ✅ Confirmation flow
- ✅ Idempotency enforcement
- ✅ Failure handling

**Purpose:** Full integration test before production

**Deploy:** Staging, verify:
- Orders created successfully
- Idempotency prevents duplicates
- Email to supplier still works
- Carpenter receives confirmation

**Timeline:**
```
Week 1-2: MVP 0 (tool routing)
Week 2.5-3: MVP 0.5 (identity + auth)
Week 3.5-4: MVP 1 (transactions)
Week 4+: Production rollout
```

---

## REVISION 4: Product Search & Details — Catalog Policy

### The Problem
v2 marks search_products and get_product_details as PUBLIC.  
But we haven't confirmed this is Nagarim's catalog policy.

### The Solution: CONDITIONAL BASED ON NAGARIM POLICY

**Change v2 status from PUBLIC to:**

```
search_products
Status: PROPOSED — subject to Nagarim catalog policy
Policy decision required:
  [ ] Is catalog entirely public? (anyone can search)
  [ ] Is catalog login-required? (carpenters only)
  [ ] Is it time-gated? (search available only during work hours)
  [ ] Is it geo-restricted? (Israel only, or broader)
  [ ] Can Cue users see products without linking to Nagarim?
  
UNTIL DECIDED: do not implement
```

```
get_product_details
Status: PROPOSED — subject to Nagarim catalog policy
Same policy decision applies
If public: endpoint needs no auth
If authenticated: requires carpenter link verification
```

**Gate item to add:**
- [ ] **AUDIT REQUIRED:** Confirm Nagarim catalog access policy before MVP 0

---

## REVISION 5: Order Creation — Use Offer IDs, Not Supplier IDs

### The Problem
v2 has Agent pass `supplier_id` in create_order request.  
This gives Agent authority it shouldn't have.

### The Solution: LOCK OFFER AT SELECTION TIME

**get_offers returns:**
```typescript
{
  product_id: string,
  offers: [{
    offer_id: string,    // NEW: Nagarim-generated ID
    supplier_id: string,
    supplier_name: string,
    price_excl_vat: number,
    // ... other fields
  }]
}
```

**Agent flow:**
```
1. Agent: "Found 3 offers"
2. User: "Pick #1"
3. Agent: "That's offer_id=offer_abc123 at ₪45?"
4. User: "Yes"
5. Agent calls create_order:
   {
     confirmation_id: "confirm_xyz",
     message_id: "msg_456",
     items: [{
       product_id: "prod_1",
       quantity: 5,
       offer_id: "offer_abc123"  // NOT supplier_id
     }]
   }
```

**Nagarim validates:**
```typescript
// In create_order endpoint
const offer = await db.supplier_offers.findOne({
  id: offer_id,
  is_active: true
});

if (!offer) {
  return error("Offer no longer available");
}

// Offer locked in time: price, supplier, terms
const orderLine = {
  product_id: offer.product_id,
  supplier_id: offer.supplier_id,  // derived from offer
  unit_price_excl_vat: offer.price_excl_vat,  // snapshot
  quantity: items[i].quantity,
  // ...
};

// Order terms taken from supplier, not from request
const supplier = await db.suppliers.findOne(offer.supplier_id);
const terms = {
  payment_terms: supplier.payment_terms,
  min_order_value: supplier.min_order_value_excl_vat,
  lead_time_days: offer.lead_time_days
};

// Validate against supplier terms
if (calculateTotal(lines) < terms.min_order_value) {
  return error("Below minimum order");
}
```

**Why offer_id instead of supplier_id:**
- ✅ Agent cannot invent a supplier
- ✅ Offer carries timestamp (know when it was valid)
- ✅ Price locked in offer, not recalculated
- ✅ Nagarim can revoke offers without Agent knowing
- ✅ Audit trail: "User confirmed offer_abc123 at ₪45"

---

## REVISION 6: Confirmation as Snapshot, Not Just ID

### The Problem
v2 mentions confirmation_id for idempotency, but confirmation should be tied to the actual transaction state.

### The Solution: CONFIRMATION SNAPSHOT IN PENDING_ACTIONS

**Cue-side (before confirmation):**
```typescript
// After Agent says "5 × ₪45 = ₪225, agree?"
const pending = {
  cue_user_id: cue_user_id,
  confirmation_id: crypto.randomUUID(),
  message_id: message.id,
  action: "create_order",
  
  // SNAPSHOT at time of offer presentation
  items: [{
    product_id: "prod_1",
    quantity: 5,
    offer_id: "offer_abc123",
    offer_price: 45,
    offer_total: 225
  }],
  
  // User must confirm THIS snapshot
  presentation: {
    shown_at: now(),
    expires_at: now() + 10min,
    shown_as_text: "5 דבקים × ₪45 = ₪225"
  },
  
  // When user says "כן"
  confirmed_at: null,
  user_message: null  // "כן" / "בסדר" / etc
};

db.pending_actions.insert(pending);
```

**User confirms:**
```
User: "כן"
  ↓
Agent sees confirmation
  ↓
Agent calls create_order({
  confirmation_id: "...",
  message_id: "...",
  items: [{...}]  // same items as snapshot
})
```

**Nagarim validates:**
```typescript
async function createOrder(req) {
  const { confirmation_id, items } = req.body;
  
  // Find pending action (from Cue database via API call)
  const pending = await cueApi.getPendingAction(confirmation_id);
  
  if (!pending) {
    return error("Confirmation expired or not found");
  }
  
  // Verify confirmation is still valid
  if (pending.expires_at < now()) {
    return error("Offer expired (shown 10+ minutes ago)");
  }
  
  if (pending.confirmed_at !== null) {
    // Already executed
    return { success: true, orders: pending.executed_orders };
  }
  
  // Verify items match snapshot
  if (JSON.stringify(items) !== JSON.stringify(pending.items)) {
    return error("Items changed since confirmation");
  }
  
  // Validate each offer is still valid
  for (const item of items) {
    const offer = await db.supplier_offers.findOne(item.offer_id);
    if (!offer || !offer.is_active) {
      return error(`Offer ${item.offer_id} no longer available`);
    }
    // Check price hasn't changed more than threshold (e.g., 5%)
    if (Math.abs(offer.price_excl_vat - item.offer_price) / item.offer_price > 0.05) {
      return error(`Price changed for offer ${item.offer_id}`);
    }
  }
  
  // All validated, create order
  const orders = await createOrderLines(...);
  
  // Mark confirmation as executed
  await cueApi.markConfirmationExecuted(confirmation_id, {
    executed_orders: orders,
    executed_at: now()
  });
  
  return { success: true, orders };
}
```

**Why snapshot:**
- ✅ User confirms THIS state, not some other state
- ✅ Offer expiry checked (within 10 minutes)
- ✅ Price change detected (threshold alert)
- ✅ Idempotency key (confirmation_id) tied to specific transaction
- ✅ Audit trail: what user actually saw vs. what was created

---

## REVISION 7: Order Statuses — Use Nagarim's Existing Workflow

### The Problem
v2 invents new statuses:
```
pending | confirmed | shipped | delivered | cancelled
```

But Nagarim already has:
```
pending → approved → preparing → sent → delivered (or cancelled)
```

### The Solution: USE NAGARIM'S STATUSES, MAP FOR DISPLAY

**Nagarim's existing order.status values (VERIFIED from code):**
- `pending` — order created, awaiting supplier confirmation
- `approved` — supplier approved
- `preparing` — supplier preparing shipment
- `sent` — order shipped
- `delivered` — received by carpenter
- `cancelled` — cancelled (by carpenter or supplier)

**Cue displays to WhatsApp user:**
```
Nagarim status → WhatsApp message

pending        → "⏳ חוכה לאישור הספק"
approved       → "✅ אושר על־ידי הספק"
preparing      → "📦 מוכן בהדרך"
sent           → "🚚 בדרך אליך"
delivered      → "🎉 הגיע!"
cancelled      → "❌ בוטל"
```

**Implementation:**
```typescript
// In get_order_status response
return {
  order_id: "...",
  order_number: "...",
  status: "pending",  // Nagarim's actual status
  status_display_he: "⏳ חוכה לאישור הספק",  // For WhatsApp
  status_display_en: "⏳ Awaiting supplier approval",
  
  // Timestamps based on Nagarim's actual values
  created_at: "...",
  approved_at: "..." | null,
  sent_at: "..." | null,
  delivered_at: "..." | null
};
```

**Why this approach:**
- ✅ Nagarim remains source of truth
- ✅ No custom status enum in Cue
- ✅ Cue just displays/translates, doesn't own workflow
- ✅ If Nagarim changes statuses later, Cue automatically works
- ✅ Audit trail uses Nagarim's official statuses

---

## ARCHITECTURAL PRINCIPLE (Elevated to Rule #1)

**Add to document as binding principle:**

```
The Agent may interpret, retrieve, and request.
Nagarim authorizes, validates, and executes.

LLM ❌ does NOT:
  - Create orders
  - Approve transactions
  - Set prices
  - Select suppliers
  - Determine permissions
  - Lock agreements

Nagarim ✅ MUST:
  - Validate every request
  - Apply business rules
  - Lock prices at order time
  - Verify supplier eligibility
  - Check stock/availability
  - Enforce minimum orders
  - Scope to customer
  - Log all actions
  - Authorize state changes
```

---

## REVISION 8: Nagarim Web Integration with Cue

### The Problem
How does a carpenter currently on Nagarim website transition to WhatsApp + Cue?  
What buttons exist? What data flows?

### The Solution: NO CREDENTIAL SHARING

**Nagarim website buttons:**

```
1. Global: "דבר עם Cue ב־WhatsApp" (header/footer)
   → Opens WhatsApp with: "היי, תוכלו לעזור לי בחיפוש מוצרים?"

2. Product page (e.g., דבק 7047):
   💬 שאל את Cue בWhatsApp
   → Opens WhatsApp with: "מה המחיר של דבק 7047?"

3. Order page (e.g., ORD-123):
   💬 שאל את Cue על ההזמנה
   → Opens WhatsApp with: "מה הסטטוס של הזמנה ORD-123?"

4. Cart page:
   💬 הזמן דרך Cue ב־WhatsApp
   → Opens WhatsApp with: "רוצה להזמין: [items list]"
```

**Data flow (CRITICAL: No credentials):**

```
Nagarim web page
    ↓
User clicks "דבר עם Cue"
    ↓
Generate WhatsApp link:
  https://wa.me/[CUE_PHONE_NUMBER]
  ?text=[message]
  (URL encoded)
    ↓
User redirects to WhatsApp
    ↓
WhatsApp pre-fills message
    ↓
User opens Cue conversation
    ↓
Cue receives message from carpenter's WhatsApp number
    ↓
Cue: "Hi! I don't have you verified yet.
      Click here to link your Nagarim account"
    ↓
Carpenter follows linking flow
    ↓
Cue now knows: cue_user_id ↔ carpenter_id
    ↓
Cue can now answer contextual questions:
    - "What's the price of דבק 7047?" (for this carpenter)
    - "What's the status of ORD-123?" (verifies ownership)
```

**Implementation checklist:**

```
Nagarim side:
  [ ] Meta WhatsApp business phone number configured
  [ ] Buttons added to:
      - Header/footer (global)
      - Product pages (product ID in message)
      - Order pages (order ID in message)
      - Cart page (cart contents in message)
  [ ] Message templates approved by Meta
  [ ] Mobile: ensure link works on smartphone
  [ ] Analytics: track "Open WhatsApp" button clicks

Cue side:
  [ ] Recognize prefilled messages from Nagarim
  [ ] Extract product_id or order_id from message
  [ ] If carpenter not linked: suggest linking first
  [ ] If linked: answer contextually (e.g., show price for THIS carpenter)
  [ ] No credentials received from Nagarim web
```

**Example WhatsApp link (product page):**

```
https://wa.me/972XXX5551234?text=מה%20המחיר%20של%20דבק%207047
```

Decoded:
```
https://wa.me/972XXX5551234?text=מה המחיר של דבק 7047
```

**Example WhatsApp link (order page):**

```
https://wa.me/972XXX5551234?text=מה%20סטטוס%20הזמנה%20ORD-123
```

**Security properties:**

✅ **NO credentials passed:** only message text  
✅ **User controls:** WhatsApp number already trusted (authenticated with Nagarim)  
✅ **Cue verifies:** Link verification email required before access  
✅ **Carpenter owns:** Can revoke link from Nagarim anytime  
✅ **Audit trail:** All "Open WhatsApp" clicks logged in Nagarim  

**Why this works:**

```
Carpenter is logged into Nagarim website
  → User's browser trust (cookie/session)
  → NOT passed to WhatsApp or Cue

Carpenter opens WhatsApp
  → Phone's trust (authentication with Meta)
  → Carpenter's phone number IS the identifier

Cue receives message
  → Phone number is public (sender)
  → Cue looks up: is this phone linked to Nagarim?
  → If not: suggest linking
  → If yes: answer contextually
```

**Not supported yet (future):**

```
❌ Single sign-on (SSO) from Nagarim → Cue
❌ Pre-authenticated WhatsApp session
❌ Deep linking to specific offer

These are valuable but require:
  - JWT or session token passed carefully
  - Meta Business Account webhook setup
  - More complex architecture
  
MVP 1 uses simple "message + link" model.
Future: could add authenticated deeplinks.
```

---



| Issue | v2 | v2.1 |
|-------|----|----|
| **Link ownership** | Cue owns | Nagarim owns |
| **Service auth** | "rotate quarterly" | Complete spec (rotation, revocation, audit) |
| **MVP phase** | 0 → 1 | 0 → 0.5 → 1 (identity testing gap filled) |
| **Catalog policy** | PUBLIC assumed | PROPOSED (policy TBD) |
| **Order items** | supplier_id | offer_id (locked in time) |
| **Confirmation** | ID only | ID + snapshot (full state) |
| **Order statuses** | Custom enums | Nagarim's actual statuses |
| **Principle** | Implied | Explicit Rule #1 |

---

## Gate Status After v2.1

**Ready to move forward if:**
- [ ] Identity linking model approved
- [ ] Service auth specification approved
- [ ] MVP 0/0.5/1 timeline approved
- [ ] Catalog access policy decided
- [ ] Offer ID locking model approved
- [ ] Confirmation snapshot model approved
- [ ] Nagarim status mapping approved
- [ ] Architect principle acknowledged

**Then proceed to:**
1. **Audit phase** (8-12 hours)
   - Meta workflow audit
   - Cue + Nagarim code review
   - Existing order flow trace
   
2. **Implementation** (separate session)
   - No code changes until all audits complete
   - Gate signed off by advisor

---

**v2.1 Date:** 2026-09-23  
**Changes:** 6 targeted revisions + 1 principle elevation  
**Next:** Approval on gate items, then audit phase
