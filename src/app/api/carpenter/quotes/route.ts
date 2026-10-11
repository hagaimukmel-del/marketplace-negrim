import { NextRequest, NextResponse } from 'next/server'
import { getSessionCarpenter } from '@/lib/carpenter-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { isTestName, sendEmail } from '@/lib/email'
import { unitLabel } from '@/lib/catalog'
import { quantityText } from '@/lib/quotes'
import { quoteRequestHtml, quoteRequestSubject } from '@/lib/emails/quote'

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
 */
export async function POST(request: NextRequest) {
  const carpenter = await getSessionCarpenter()
  if (!carpenter) return NextResponse.json({ error: 'צריך להיות מחובר' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const productId = typeof body.product_id === 'string' && UUID.test(body.product_id) ? body.product_id : null
  const supplierId = typeof body.supplier_id === 'string' && UUID.test(body.supplier_id) ? body.supplier_id : null
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
    .select('pack_label, pack_qty, products!inner(name_he, base_unit, is_active), suppliers!inner(company_name, email, status)')
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

  const { data: created, error } = await supabase
    .from('quote_requests')
    .insert({ carpenter_id: carpenter.id, supplier_id: supplierId, product_id: productId, quantity, note })
    .select('id')
    .single()
  if (error) {
    console.error('Quote request not saved:', error.message)
    return NextResponse.json({ error: 'הבקשה לא נשמרה. נסו שוב בעוד רגע.' }, { status: 500 })
  }

  // Saved and shown in the console; a lost email must not lose the request.
  let emailed = false
  if (supplier.email) {
    const details = {
      carpenterName: carpenter.business_name,
      contactName: carpenter.contact_name,
      city: carpenter.city,
      productName: product.name_he,
      quantityText: quantityText(quantity, unitLabel(product.base_unit), offer.pack_label, offer.pack_qty == null ? null : Number(offer.pack_qty)),
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

  return NextResponse.json({ ok: true, id: created.id, emailed }, { status: 201 })
}
