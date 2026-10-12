import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { isTestName, sendEmail } from '@/lib/email'
import { unitLabel } from '@/lib/catalog'
import { quantityText } from '@/lib/quotes'
import { quoteRequestHtml, quoteRequestSubject } from '@/lib/emails/quote'
import { priceModeOf } from '@/lib/price-mode'
import { checkQuoteRequest } from '@/lib/quote-rules'
import { saveQuoteRequest, type QuoteRequestStore } from '@/lib/quote-idempotency'
import { loadThresholds } from '@/lib/special-price'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/carpenter/quotes — a carpentry asks one supplier for a price
 * (T-023).
 *
 * For a supplier who shows no prices this is the way to buy; for one who does,
 * it is "הצעה לכמות גדולה". The request is stored, shown at the top of the
 * supplier's orders tab, and emailed to the supplier. The supplier answers in
 * the console; nothing is ordered until the carpentry adds the answer to its
 * cart and sends the order itself.
 *
 * The rules (src/lib/quote-rules.ts, stage 1 of the 2026-10-12 RFQ plan):
 * - it goes to the one supplier chosen, never to anyone else;
 * - a supplier who shows no prices is asked from its minimum order up;
 * - a supplier who shows prices is asked only for a special price, and only
 *   from the threshold it set on this offer;
 * - a repeated send with the same client_request_id returns the request
 *   already saved when the details match (no second email) and 409 otherwise.
 */
export async function POST(request: NextRequest) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const productId = typeof body.product_id === 'string' && UUID.test(body.product_id) ? body.product_id : null
  const supplierId = typeof body.supplier_id === 'string' && UUID.test(body.supplier_id) ? body.supplier_id : null
  const clientRequestId = typeof body.client_request_id === 'string' && UUID.test(body.client_request_id) ? body.client_request_id.toLowerCase() : null
  const quantity = Number(body.quantity)
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 600) : null
  if (!productId || !supplierId) return NextResponse.json({ error: 'חסר מוצר או ספק' }, { status: 400 })
  // Whole base units, like a cart line, so the quote can be ordered as it stands.
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 1_000_000) {
    return NextResponse.json({ error: 'כמות לא תקינה' }, { status: 400 })
  }

  if (!checkRateLimit(`quote:${carpenter.id}`, 'quoteRequest').allowed) {
    return NextResponse.json({ error: 'שלחת הרבה בקשות בשעה האחרונה. נסה שוב מאוחר יותר.' }, { status: 429 })
  }

  const supabase = getSupabaseAdmin()
  // Only a supplier who sells it today, to carpenters, can be asked.
  const { data: offer } = await supabase
    .from('supplier_offers')
    .select('id, pack_label, pack_qty, min_order_qty, products!inner(name_he, base_unit, is_active), suppliers!inner(company_name, email, status)')
    .eq('product_id', productId)
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  const product = offer?.products as unknown as { name_he: string; base_unit: string; is_active: boolean } | undefined
  const supplier = offer?.suppliers as unknown as { company_name: string; email: string | null; status: string } | undefined
  if (!offer || !product?.is_active || supplier?.status !== 'approved') {
    return NextResponse.json({ error: 'הספק לא מוכר את המוצר הזה כרגע' }, { status: 404 })
  }

  const packQty = offer.pack_qty == null ? null : Number(offer.pack_qty)
  const unit = unitLabel(product.base_unit)
  const [mode, thresholds] = await Promise.all([priceModeOf(supplierId), loadThresholds({ offerIds: [offer.id] })])
  const check = checkQuoteRequest({
    quoteOnly: mode === 'quote',
    quantity,
    minOrderQty: Number(offer.min_order_qty),
    packQty,
    threshold: thresholds.get(offer.id) ?? null,
    quantityLabel: (q) => quantityText(q, unit, offer.pack_label, packQty),
  })
  if (!check.ok) return NextResponse.json({ error: check.error, code: check.code }, { status: check.status })

  const saved = await saveQuoteRequest(supabaseStore(), {
    carpenterId: carpenter.id,
    clientRequestId,
    kind: check.kind,
    request: { supplierId, productId, quantity, note },
  })
  if (saved.status === 'conflict') {
    return NextResponse.json({ error: 'הבקשה הזו כבר נשלחה עם פרטים אחרים. פתחו את הטופס מחדש.', code: 'request_conflict' }, { status: 409 })
  }
  if (saved.status === 'error') {
    console.error('Quote request not saved:', saved.error)
    return NextResponse.json({ error: 'הבקשה לא נשמרה. נסו שוב בעוד רגע.' }, { status: 500 })
  }
  // Sent before: the supplier already has it and is not emailed twice.
  if (saved.status === 'existing') return NextResponse.json({ ok: true, id: saved.id, existing: true }, { status: 200 })

  // Saved and shown in the console; a lost email must not lose the request.
  let emailed = false
  if (supplier.email) {
    const details = {
      carpenterName: carpenter.business_name,
      contactName: carpenter.contact_name,
      city: carpenter.city,
      productName: product.name_he,
      quantityText: quantityText(quantity, unit, offer.pack_label, packQty),
      note,
    }
    const result = await sendEmail({
      to: supplier.email,
      subject: quoteRequestSubject(details),
      html: quoteRequestHtml(details),
      isTest: isTestName(carpenter.business_name, supplier.company_name),
    })
    emailed = result.sent
  }

  return NextResponse.json({ ok: true, id: saved.id, emailed }, { status: 201 })
}

/** Columns missing on a database that has not reached migration 20261012090000. */
function missingColumn(error: { code?: string } | null): boolean {
  return error?.code === '42703' || error?.code === 'PGRST204'
}

/** quote_requests behind the idempotency rules. */
function supabaseStore(): QuoteRequestStore {
  const supabase = getSupabaseAdmin()
  return {
    async findByClientId(carpenterId, clientRequestId) {
      const { data, error } = await supabase
        .from('quote_requests')
        .select('id, supplier_id, product_id, quantity, note')
        .eq('carpenter_id', carpenterId)
        .eq('client_request_id', clientRequestId)
        .maybeSingle()
      if (error || !data) return null
      return { id: data.id, supplierId: data.supplier_id, productId: data.product_id, quantity: Number(data.quantity), note: data.note }
    },
    async insert({ carpenterId, clientRequestId, kind, request }) {
      const row = {
        carpenter_id: carpenterId,
        supplier_id: request.supplierId,
        product_id: request.productId,
        quantity: request.quantity,
        note: request.note,
      }
      let { data, error } = await supabase
        .from('quote_requests')
        .insert({ ...row, kind, client_request_id: clientRequestId })
        .select('id')
        .single()
      // Before the migration: saved as before, without kind or idempotency.
      if (missingColumn(error)) ({ data, error } = await supabase.from('quote_requests').insert(row).select('id').single())
      if (error?.code === '23505') return { duplicate: true }
      if (error || !data) return { error: error?.message ?? 'no row' }
      return { id: data.id }
    },
  }
}
