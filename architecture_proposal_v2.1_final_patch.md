# v2.1 Final Patch: 4 Critical Clarifications

**Before v2.1 approval → Must fix these 4 points**

---

## PATCH 1: link_token Is NOT a Credential

### The Problem (in current v2.1)
v2.1 says: "Nagarim returns link_token to Cue, Cue stores it"  
This makes link_token a credential flowing between systems.  
This is wrong.

### The Solution: NAGARIM HOLDS ALL CREDENTIALS

**Corrected flow:**

```
1. Cue user says: "Link me to nir@carpentry.com"
   ↓
2. Cue sends to Nagarim:
   {
     action: "create_link",
     cue_user_id: "cue_xyz",
     carpenter_email: "nir@carpentry.com"
   }
   ↓
3. Nagarim:
   - Finds carpenter
   - Sends verification email
   - Stores: cue_nagarim_links (verified=false)
   ↓
4. Carpenter clicks email, verifies
   - Nagarim: verified=true, verified_at=now
   ↓
5. Nagarim returns to Cue:
   {
     status: "verified",
     reference_id: "link_ref_abc123"  ← NOT a credential
   }
   ↓
6. Cue stores reference_id in session (not secret)
   ↓
7. Future requests from Cue:
   Authorization: Bearer svc_token
   X-Cue-User-Id: cue_xyz
   
   Nagarim:
   - Validates svc_token
   - Looks up cue_xyz in cue_nagarim_links
   - If verified=true: attach carpenter_id to context
   - Process request
```

**KEY CHANGE:**
- ❌ No link_token returned from Nagarim
- ❌ No secret stored in Cue
- ✅ Only reference_id (not secret) stored in Cue
- ✅ Nagarim holds all verification state
- ✅ Cue proves identity via svc_token (service secret, not user secret)

**Why this is better:**
- Nagarim is exclusive authority on carpenter identity
- Cue never holds user credentials
- Breach of Cue doesn't leak carpenter access
- Carpenter can revoke link from Nagarim (Cue never needs to know)

---

## PATCH 2: Confirmation Does NOT Require Cue Callback

### The Problem (in current v2.1)
v2.1 says: "Nagarim checks pending_action by calling Cue API"  
This creates a dependency: create_order cannot complete until Cue responds.

### The Solution: CONFIRMATION DATA SENT TO NAGARIM

**Corrected flow:**

```
Step 1: Agent requests confirmation
  ↓
  Cue: "5 דבקים × ₪45 = ₪225, agree?"
  ↓
Step 2: User confirms
  ↓
  User: "כן"
  ↓
Step 3: Cue sends confirmation TO NAGARIM
  ↓
  POST /api/app/orders
  {
    confirmation_id: "confirm_abc123",
    message_id: "msg_456",
    
    // SNAPSHOT of what user confirmed
    snapshot: {
      items: [{
        product_id: "prod_1",
        offer_id: "offer_7047_a",
        quantity: 5,
        offer_price: 45,
        offer_total: 225
      }],
      total_incl_vat: 265.50,
      
      // When this was presented to user
      presented_at: "2026-09-23T14:30:00Z",
      confirmed_at: "2026-09-23T14:31:45Z"
    }
  }
  ↓
Step 4: Nagarim validates, ALONE
  ↓
  ✅ Check confirmation_id is new
  ✅ Check offer still valid
  ✅ Check price matches
  ✅ Check stock available
  ✅ Check carpenter permissions
  ✅ Lock offer
  ✅ Create order
  ↓
Step 5: Nagarim returns order ID
```

**KEY CHANGE:**
- ❌ Nagarim does NOT call Cue to check confirmation
- ✅ Cue sends snapshot WITH the order request
- ✅ Nagarim validates everything independently
- ✅ No cross-service calls during order creation
- ✅ Idempotency key (confirmation_id) prevents duplicates

**Why this is better:**
- No dependency between services during transaction
- Faster (no extra round-trip)
- Simpler error handling (Nagarim fails atomically)
- Clearer audit trail (full snapshot in one request)

---

## PATCH 3: WhatsApp Deeplink — No Sensitive Data in URL

### The Problem (in current v2.1)
v2.1 includes product_id and order_id in WhatsApp link text.  
Even if just text, this couples the web and WhatsApp flows.

### The Solution: SIMPLE PREFILLED MESSAGES, NO IDs

**Corrected buttons (MVP 1):**

```
1. Header/Footer:
   Button: "💬 דבר עם Cue בWhatsApp"
   Link: https://wa.me/[CUE_PHONE]
   Message: "היי, אני צריך עזרה"

2. Product Page:
   Button: "💬 שאל את Cue"
   Link: https://wa.me/[CUE_PHONE]
   Message: "יש לי שאלה על מוצר"
   (NO product_id in message)

3. Order Page:
   Button: "💬 צור קשר בנוגע להזמנה"
   Link: https://wa.me/[CUE_PHONE]
   Message: "יש לי שאלה על הזמנה שלי"
   (NO order_id in message)

4. Cart:
   Button: "💬 הזמן דרך Cue"
   Link: https://wa.me/[CUE_PHONE]
   Message: "אני רוצה להזמין כמה דברים"
   (NO cart contents in message)
```

**Flow:**

```
User clicks "שאל את Cue"
   ↓
WhatsApp opens with: "יש לי שאלה על מוצר"
   ↓
User sends
   ↓
Cue receives message
   ↓
Cue: "איזה מוצר? (שם או קטגוריה)"
   ↓
User: "דבק 7047"
   ↓
Cue: "מצאתי דבק 7047, המחיר ₪45"
   (Cue searched from Nagarim, found product)
```

**Why this approach:**
- ✅ No product IDs in URL (not sensitive, but clean separation)
- ✅ No order IDs in URL (better security posture)
- ✅ No cart contents passed (avoids stale data issues)
- ✅ Agent discovers context naturally through conversation
- ✅ Reduces coupling between web and WhatsApp
- ✅ Easier to change product naming without breaking links

**Future (Post-MVP 1):**
Could add:
```
Agent-to-Agent linking:
  https://wa.me/[CUE_PHONE]?context_id=ctx_xyz
  
Where context_id is opaque token (no sensitive data visible)
But MVP 1 doesn't need this.
```

---

## PATCH 4: Branding & Positioning of Cue

### The Decision: Cue is Independent + Nagarim-Integrated

**Model: C (from advisor's proposal)**

```
Cue is a distinct product (scheduling bot)
with optional Nagarim integration.

Existing users:
  - Keep using Cue for scheduling
  - No Nagarim features needed

Nagarim users:
  - Optionally link WhatsApp to Nagarim
  - Cue detects link, unlocks B2B features

Same Cue, same phone number, dynamic capabilities.
```

**In-conversation branding:**

```
First message (not linked):
  "👋 Hi, I'm Cue!
   I can help you schedule messages.
   
   If you have a Nagarim account, 
   you can also search products and create orders.
   Link your account?"

After linking to Nagarim:
  "✅ Linked to Nagarim!
   
   You can now:
   • Search products
   • Check prices
   • View your orders
   • Create new orders
   
   What would you like to do?"

In scheduled message:
  "Your scheduled message from Cue 📅"

In order confirmation:
  "✅ Order confirmed via Cue
   (Connected to your Nagarim account)"
```

**Implementation checklist:**

```
- [ ] Cue detects if user is linked to Nagarim
- [ ] System prompt changes based on capabilities
- [ ] Messages clarify: "via Cue (connected to Nagarim)"
- [ ] Branding consistent: always "Cue" (not "Nagarim Cue")
- [ ] Help text lists both scheduling + B2B features
- [ ] Unlinked users never see Nagarim options
- [ ] Linked users see both feature sets
- [ ] Marketing: "Cue, now with B2B"
```

**Why this model:**

✅ Single product, not two bots  
✅ Backward compatible (existing Cue users unaffected)  
✅ Flexible (can add other integrations later)  
✅ Clear positioning (Cue + partner integrations)  
✅ User controls linking (not forced)  

---

## Final Checklist: v2.1 Ready?

After these 4 patches, v2.1 is ready for approval if:

- [ ] **PATCH 1:** No link_token as credential. Nagarim holds all state. Cue holds only reference_id.
- [ ] **PATCH 2:** Confirmation snapshot sent WITH order request, not callback to Cue.
- [ ] **PATCH 3:** WhatsApp links from web are simple, no sensitive data in URL.
- [ ] **PATCH 4:** Cue is independent product + optional Nagarim integration. Dynamic branding.

---

## Next Phase: Audit (No Implementation Yet)

Once v2.1 is approved with these patches:

🔍 **Audit Phase (8-12 hours, separate from implementation)**

Claude will examine:
1. **Meta WhatsApp configuration** — current templates, permissions, limits
2. **Cue codebase** — user identification, intent parsing, message routing
3. **Nagarim existing order flow** — notifyNewOrders, supplier emails, RLS
4. **Authentication mechanisms** — token handling, session management
5. **Database schemas** — carpenters, suppliers, products, orders
6. **RLS policies** — what's actually enforced at the database

📋 **Audit produces:**
- Detailed findings (VERIFIED vs PROPOSED vs REQUIRES CHANGES)
- List of code modifications needed
- Timeline estimate
- Risk assessment
- Blocking issues (if any)

✅ **Only AFTER audit is complete and approved:**
→ Begin implementation in separate session

---

**Approval pathway:**

```
v2.1 + 4 patches approved
        ↓
Audit phase (Claude reads code, not builds)
        ↓
Audit findings reviewed
        ↓
Advisor approves or requests changes
        ↓
Implementation phase (new session, new contract)
```

This is the correct order.

---

**Document:** v2.1 Final Patch  
**Date:** 2026-09-23  
**Status:** Awaiting approval on 4 patches
